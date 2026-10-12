// LOKAL va GLOBAL tovarlar aralashmasligini tekshirish.
// Ikkisi bitta `Product` jadvalida yashaydi, shuning uchun har bir oqim alohida sinaladi.
// Web (3000) va admin (3001) dev serverlari turgan bo'lishi kerak.
import { prisma } from '../packages/database/src/index.ts';

const WEB = process.env.E2E_BASE ?? 'http://localhost:3000';
const ADMIN = process.env.ADMIN_BASE ?? 'http://localhost:3001';
const ITEM_ID = '999111222333';

type Jar = { cookie: string };

async function login(base: string, email: string): Promise<Jar> {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password: 'Test1234' }),
  });
  if (!res.ok) throw new Error(`login ${email} @ ${base}: ${res.status}`);
  return { cookie: (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ') };
}

async function api(base: string, path: string, jar: Jar, init: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', cookie: jar.cookie, ...(init.headers ?? {}) },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

/** 1x1 shaffof PNG — karta cheki (global buyurtma oldindan to'lanadi). */
const FAKE_RECEIPT =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const ok = (c: boolean, msg: string) => console.log(`${c ? '  OK  ' : ' XATO '} ${msg}`);
const uzs = (n: number) => new Intl.NumberFormat('ru-RU').format(Math.round(n));

async function cleanup() {
  const sources = await prisma.globalSource.findMany({
    where: { externalItemId: ITEM_ID },
    select: { productId: true },
  });
  const orders = await prisma.order.findMany({
    where: { items: { some: { product: { globalSource: { externalItemId: ITEM_ID } } } } },
    select: { id: true },
  });
  if (orders.length) {
    await prisma.order.deleteMany({ where: { id: { in: orders.map((o) => o.id) } } });
  }
  if (sources.length) {
    await prisma.product.deleteMany({ where: { id: { in: sources.map((s) => s.productId) } } });
  }
  return orders.length + sources.length;
}

async function main() {
  await cleanup();
  const admin = await login(ADMIN, 'admin@test.uz');
  const customer = await login(WEB, 'customer@test.uz');

  // Sotuvga chiqarilgan global tovar yaratamiz
  const imported = await api(ADMIN, '/api/global/catalog', admin, {
    method: 'POST',
    body: JSON.stringify({
      url: `https://item.taobao.com/item.htm?id=${ITEM_ID}`,
      name: { uz: 'Ajratish testi tovari' },
      priceCny: 130,
      weightCategory: 'SHOES',
      publish: true,
    }),
  });
  const globalProductId = imported.body?.data?.productId;
  const globalPrice = imported.body?.data?.priceUzs;
  console.log(`Tayyorgarlik: global tovar ${uzs(globalPrice)} so'm, ACTIVE\n`);

  // Lokal tovar — omborda zaxirasi bor, oddiy mahsulot
  const localProduct = await prisma.product.findFirst({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      globalSource: { is: null },
      variants: { some: { inventory: { some: { quantityOnHand: { gt: 0 } } } } },
    },
    select: { id: true, slug: true, basePrice: true },
  });
  if (!localProduct) throw new Error('Sinov uchun zaxirasi bor lokal tovar topilmadi');

  console.log('1) LOKAL katalogda global tovar KO‘RINMAYDI');
  const localList = await api(WEB, '/api/products?limit=100', customer);
  const localIds = (localList.body?.items ?? localList.body?.data?.items ?? []).map(
    (p: { id: string }) => p.id,
  );
  ok(localIds.length > 0, `lokal katalog ${localIds.length} tovar qaytardi`);
  ok(!localIds.includes(globalProductId), 'global tovar lokal ro‘yxatda yo‘q');

  console.log('\n2) GLOBAL qamrovda esa KO‘RINADI');
  const globalList = await api(WEB, '/api/products?scope=GLOBAL&limit=100', customer);
  const globalIds = (globalList.body?.items ?? globalList.body?.data?.items ?? []).map(
    (p: { id: string }) => p.id,
  );
  ok(globalIds.includes(globalProductId), 'global tovar global ro‘yxatda bor');
  ok(!globalIds.includes(localProduct.id), 'lokal tovar global ro‘yxatga tushmadi');

  console.log('\n3) Qidiruvda ham ajratilgan');
  const searchLocal = await api(WEB, '/api/products?q=Ajratish&limit=50', customer);
  const foundLocal = (searchLocal.body?.items ?? searchLocal.body?.data?.items ?? []).map(
    (p: { id: string }) => p.id,
  );
  ok(!foundLocal.includes(globalProductId), 'lokal qidiruv global tovarni topmadi');

  console.log('\n4) ARALASH savat rad etiladi');
  const mixed = await api(WEB, '/api/orders', customer, {
    method: 'POST',
    body: JSON.stringify({
      items: [
        { productId: globalProductId, quantity: 1 },
        { productId: localProduct.id, quantity: 1 },
      ],
      recipientName: 'Ajratish Test',
      phone: '+998901234567',
      region: 'Toshkent',
      city: 'Toshkent',
      street: 'Test kocha 4',
      deliveryMethod: 'HOME_DELIVERY',
      paymentProvider: 'UZCARD',
      paymentReceipt: FAKE_RECEIPT,
    }),
  });
  ok(mixed.status === 400, `status ${mixed.status} — ${mixed.body?.error?.code}`);
  ok(mixed.body?.error?.code === 'MIXED_CART', 'xato kodi MIXED_CART');

  console.log('\n5) GLOBAL buyurtmada lokal yetkazish narxi YIG‘ILMAYDI');
  const globalOrder = await api(WEB, '/api/orders', customer, {
    method: 'POST',
    body: JSON.stringify({
      items: [{ productId: globalProductId, quantity: 1 }],
      recipientName: 'Ajratish Test',
      phone: '+998901234567',
      region: 'Toshkent',
      city: 'Toshkent',
      street: 'Test kocha 4',
      deliveryMethod: 'HOME_DELIVERY',
      paymentProvider: 'UZCARD',
      paymentReceipt: FAKE_RECEIPT,
    }),
  });
  ok(globalOrder.status === 200, `status ${globalOrder.status}`);
  const orderId = globalOrder.body?.data?.order?.id;
  const row = await prisma.order.findUnique({
    where: { id: orderId },
    select: { shippingTotal: true, grandTotal: true, subtotal: true },
  });
  ok(Number(row?.shippingTotal) === 0, `shippingTotal = ${row?.shippingTotal} (kargo olib boradi)`);
  ok(
    Number(row?.grandTotal) === globalPrice,
    `grandTotal = ${uzs(Number(row?.grandTotal))} = katalog narxi`,
  );

  console.log('\n6) LOKAL buyurtmada yetkazish narxi ODATDAGICHA yig‘iladi');
  const localOrder = await api(WEB, '/api/orders', customer, {
    method: 'POST',
    body: JSON.stringify({
      items: [{ productId: localProduct.id, quantity: 1 }],
      recipientName: 'Lokal Test',
      phone: '+998901234567',
      region: 'Toshkent',
      city: 'Toshkent',
      street: 'Test kocha 5',
      deliveryMethod: 'HOME_DELIVERY',
      paymentProvider: 'CASH_ON_DELIVERY',
    }),
  });
  ok(localOrder.status === 200, `status ${localOrder.status}`);
  const localRow = await prisma.order.findUnique({
    where: { id: localOrder.body?.data?.order?.id },
    select: { shippingTotal: true, globalFulfillment: { select: { id: true } } },
  });
  const price = Number(localProduct.basePrice);
  const expected = price >= 500_000 ? 0 : 20_000;
  ok(
    Number(localRow?.shippingTotal) === expected,
    `shippingTotal = ${localRow?.shippingTotal} (kutilgan ${expected})`,
  );
  ok(localRow?.globalFulfillment === null, 'lokal buyurtmada zayavka ochilmadi');

  console.log('\n7) Operator navbatida faqat global buyurtma');
  const queue = await api(ADMIN, '/api/global/fulfillment', admin);
  const numbers = (queue.body?.data?.items ?? []).map(
    (f: { order: { number: string } }) => f.order.number,
  );
  ok(numbers.includes(globalOrder.body?.data?.order?.number), 'global buyurtma navbatda');
  ok(!numbers.includes(localOrder.body?.data?.order?.number), 'lokal buyurtma navbatga tushmadi');

  console.log('\n8) Mijoz detali: global blok bor, lokal buyurtmada yoq');
  const gDetail = await api(WEB, `/api/orders/${orderId}`, customer);
  ok(
    gDetail.body?.data?.order?.scope === 'GLOBAL',
    `global scope = ${gDetail.body?.data?.order?.scope}`,
  );
  ok(Boolean(gDetail.body?.data?.order?.global), 'global blok bor');
  const lDetail = await api(WEB, `/api/orders/${localOrder.body?.data?.order?.id}`, customer);
  ok(
    lDetail.body?.data?.order?.scope === 'LOCAL',
    `lokal scope = ${lDetail.body?.data?.order?.scope}`,
  );
  ok(lDetail.body?.data?.order?.global === null, 'lokal buyurtmada global blok yoq');

  console.log('\n9) Tozalash');
  await prisma.order.deleteMany({ where: { id: localOrder.body?.data?.order?.id } });
  ok((await cleanup()) > 0, 'test ma’lumoti o‘chirildi');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
