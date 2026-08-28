// PUL XAVFSIZLIGI: global buyurtma faqat oldindan to'lanadi va operator pul
// kelmaguncha Xitoydan sotib ololmaydi.
//
// Nega muhim: global tovar mijoz puli bilan sotib olinadi va 15-17 kun yo'lda bo'ladi.
// Naqd to'lovda mijoz eshik oldida rad etsa — pul sarflangan, tovar Xitoyda.
// Web (3000) va admin (3001) dev serverlari turgan bo'lishi kerak.
import { prisma } from '../packages/database/src/index.ts';

const WEB = process.env.E2E_BASE ?? 'http://localhost:3000';
const ADMIN = process.env.ADMIN_BASE ?? 'http://localhost:3001';
const ITEM_ID = '444555666777';

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

const ok = (c: boolean, msg: string) => console.log(`${c ? '  OK  ' : ' XATO '} ${msg}`);

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

/** 1×1 shaffof PNG — karta cheki o'rniga (validatsiya data-URL kutadi). */
const FAKE_RECEIPT =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const orderBody = (productId: string, provider: string, extra: object = {}) => ({
  items: [{ productId, quantity: 1 }],
  recipientName: 'Tolov Test',
  phone: '+998901234567',
  region: 'Toshkent',
  city: 'Toshkent',
  street: 'Test kocha 6',
  deliveryMethod: 'HOME_DELIVERY',
  paymentProvider: provider,
  ...extra,
});

async function main() {
  await cleanup();
  const admin = await login(ADMIN, 'admin@test.uz');
  const customer = await login(WEB, 'customer@test.uz');

  const imported = await api(ADMIN, '/api/global/catalog', admin, {
    method: 'POST',
    body: JSON.stringify({
      url: `https://item.taobao.com/item.htm?id=${ITEM_ID}`,
      name: { uz: 'Tolov himoyasi testi' },
      priceCny: 130,
      weightCategory: 'SHOES',
      publish: true,
    }),
  });
  const globalProductId = imported.body?.data?.productId;

  console.log('1) GLOBAL buyurtmada NAQD to‘lov rad etiladi');
  const cod = await api(WEB, '/api/orders', customer, {
    method: 'POST',
    body: JSON.stringify(orderBody(globalProductId, 'CASH_ON_DELIVERY')),
  });
  ok(cod.status === 400, `status ${cod.status}`);
  ok(cod.body?.error?.code === 'GLOBAL_PREPAID_ONLY', `kod = ${cod.body?.error?.code}`);

  console.log('\n2) LOKAL buyurtmada naqd oldingidek ishlaydi');
  const localProduct = await prisma.product.findFirst({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      globalSource: { is: null },
      variants: { some: { inventory: { some: { quantityOnHand: { gt: 0 } } } } },
    },
    select: { id: true },
  });
  if (!localProduct) throw new Error('Zaxirasi bor lokal tovar topilmadi');
  const localCod = await api(WEB, '/api/orders', customer, {
    method: 'POST',
    body: JSON.stringify(orderBody(localProduct.id, 'CASH_ON_DELIVERY')),
  });
  ok(localCod.status === 200, `status ${localCod.status} — naqd lokalda ochiq qoldi`);
  const localOrderId = localCod.body?.data?.order?.id;

  console.log('\n3) GLOBAL buyurtma karta cheki bilan qabul qilinadi');
  const paid = await api(WEB, '/api/orders', customer, {
    method: 'POST',
    body: JSON.stringify(
      orderBody(globalProductId, 'UZCARD', { paymentReceipt: FAKE_RECEIPT, paymentNote: 'e2e' }),
    ),
  });
  ok(paid.status === 200, `status ${paid.status} ${paid.body?.error?.message ?? ''}`);
  const orderId = paid.body?.data?.order?.id;
  const orderNumber = paid.body?.data?.order?.number;

  const zayavka = (await api(ADMIN, '/api/global/fulfillment', admin)).body?.data?.items?.find(
    (f: { order: { number: string } }) => f.order.number === orderNumber,
  );
  ok(Boolean(zayavka), 'zayavka ochildi');
  ok(zayavka?.order?.paid === false, `to‘lov holati: ${zayavka?.order?.paid} (hali kelmagan)`);

  console.log('\n4) To‘lov tasdiqlanmasdan XITOYDAN SOTIB OLIB BO‘LMAYDI');
  await api(ADMIN, `/api/global/fulfillment/${zayavka.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'VERIFY' }),
  });
  const early = await api(ADMIN, `/api/global/fulfillment/${zayavka.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'PURCHASE', purchaseRef: 'ERTA-SOTIB-OLISH' }),
  });
  ok(early.status === 409, `status ${early.status}`);
  ok(early.body?.error?.code === 'NOT_PAID', `kod = ${early.body?.error?.code}`);

  console.log('\n5) Pul kelgach sotib olish ochiladi');
  // Admin chekni tasdiqlaganda aynan shu ikki maydon qo'yiladi
  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'PAID', paidAt: new Date() },
  });
  const afterPaid = (await api(ADMIN, '/api/global/fulfillment', admin)).body?.data?.items?.find(
    (f: { id: string }) => f.id === zayavka.id,
  );
  ok(afterPaid?.order?.paid === true, `to‘lov holati: ${afterPaid?.order?.paid}`);

  const purchased = await api(ADMIN, `/api/global/fulfillment/${zayavka.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'PURCHASE', purchaseRef: 'TB-OK-1' }),
  });
  ok(purchased.status === 200, `status ${purchased.status}`);
  ok(purchased.body?.data?.status === 'PURCHASED', `status = ${purchased.body?.data?.status}`);

  console.log('\n6) Tozalash');
  await prisma.order.deleteMany({ where: { id: localOrderId } });
  ok((await cleanup()) > 0, 'test ma’lumoti o‘chirildi');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
