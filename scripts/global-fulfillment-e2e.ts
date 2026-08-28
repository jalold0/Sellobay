// To'liq global zanjir: import -> mijoz buyurtmasi -> zayavka -> narx tekshiruvi ->
// sotib olish -> trek raqam -> yetkazildi.
// Web (3000) va admin (3001) dev serverlari turgan bo'lishi kerak.
import { prisma } from '../packages/database/src/index.ts';

const WEB = process.env.E2E_BASE ?? 'http://localhost:3000';
const ADMIN = process.env.ADMIN_BASE ?? 'http://localhost:3001';
const ITEM_ID = '777666555444';

type Jar = { cookie: string };

async function login(base: string, email: string): Promise<Jar> {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password: 'Test1234' }),
  });
  if (!res.ok) throw new Error(`login ${email} @ ${base}: ${res.status} ${await res.text()}`);
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
  return { orders: orders.length, products: sources.length };
}

async function main() {
  await cleanup();

  const admin = await login(ADMIN, 'admin@test.uz');
  const customer = await login(WEB, 'customer@test.uz');
  console.log('Login: admin (3001) + customer (3000) OK\n');

  console.log('1) Operator tovarni katalogga import qiladi');
  const imported = await api(ADMIN, '/api/global/catalog', admin, {
    method: 'POST',
    body: JSON.stringify({
      url: `https://item.taobao.com/item.htm?id=${ITEM_ID}`,
      name: { uz: 'Zanjir testi krossovka' },
      priceCny: 130,
      weightCategory: 'SHOES',
      freightMode: 'AUTO',
      publish: true,
    }),
  });
  ok(imported.status === 200, `status ${imported.status}`);
  const productId = imported.body?.data?.productId;
  const catalogPrice = imported.body?.data?.priceUzs;
  console.log(`       ${uzs(catalogPrice)} so'm, productId ${productId?.slice(0, 8)}...`);

  console.log('\n2) Mijoz global tovarni sotib oladi (zaxira talab qilinmaydi)');
  const order = await api(WEB, '/api/orders', customer, {
    method: 'POST',
    body: JSON.stringify({
      items: [{ productId, quantity: 1 }],
      recipientName: 'Zanjir Test',
      phone: '+998901234567',
      region: 'Toshkent',
      city: 'Toshkent',
      street: 'Test kocha 1',
      deliveryMethod: 'HOME_DELIVERY',
      paymentProvider: 'UZCARD',
      paymentReceipt: FAKE_RECEIPT,
    }),
  });
  ok(order.status === 200, `status ${order.status} ${order.body?.error?.message ?? ''}`);
  const orderNumber = order.body?.data?.order?.number;
  ok(Boolean(orderNumber), `buyurtma ${orderNumber}`);

  console.log('\n3) Zayavka avtomatik ochildimi');
  const queue = await api(ADMIN, '/api/global/fulfillment', admin);
  const zayavka = queue.body?.data?.items?.find(
    (f: { order: { number: string } }) => f.order.number === orderNumber,
  );
  ok(Boolean(zayavka), 'navbatda topildi');
  ok(zayavka?.status === 'NEW', `status = ${zayavka?.status}`);
  ok(zayavka?.paidTotal === catalogPrice, `paidTotal = ${uzs(zayavka?.paidTotal)}`);
  ok(zayavka?.items?.length === 1, `${zayavka?.items?.length} ta global pozitsiya`);
  ok(Boolean(zayavka?.order?.address), `manzil: ${zayavka?.order?.address}`);

  console.log('\n4) Xitoyda narx keskin oshdi — mijoz bilan kelishish kerak');
  const jumped = await api(ADMIN, `/api/global/fulfillment/${zayavka.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'VERIFY', priceCny: 160 }),
  });
  ok(
    jumped.body?.data?.variance?.decision === 'ASK_CUSTOMER',
    `qaror = ${jumped.body?.data?.variance?.decision}`,
  );
  ok(jumped.body?.data?.status === 'PRICE_CHANGED', `status = ${jumped.body?.data?.status}`);
  ok(
    jumped.body?.data?.extraChargeTotal > 0,
    `mijozdan ${uzs(jumped.body?.data?.extraChargeTotal)} so'm so'raladi`,
  );

  const huge = await api(ADMIN, `/api/global/fulfillment/${zayavka.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'VERIFY', priceCny: 190 }),
  });
  ok(
    huge.body?.data?.variance?.decision === 'CANCEL_SUGGESTED',
    `juda katta oshishda qaror = ${huge.body?.data?.variance?.decision}`,
  );

  console.log('\n5) Narx joyida — avtomatik tasdiqlanadi');
  const verified = await api(ADMIN, `/api/global/fulfillment/${zayavka.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'VERIFY' }),
  });
  ok(
    verified.body?.data?.variance?.decision === 'AUTO_CONFIRM',
    `qaror = ${verified.body?.data?.variance?.decision}`,
  );
  ok(verified.body?.data?.status === 'CONFIRMED', `status = ${verified.body?.data?.status}`);

  console.log('\n6) Sotib olmasdan trek raqam kiritib bolmaydi (tartib himoyasi)');
  const early = await api(ADMIN, `/api/global/fulfillment/${zayavka.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'TRACK', trackNumber: 'ERTA123' }),
  });
  ok(early.status === 409, `status ${early.status} — ${early.body?.error?.code}`);

  console.log('\n7) Operator platformadan sotib oladi');
  // Global buyurtmada operator PUL KELGACH sotib oladi (NOT_PAID himoyasi).
  // Admin karta chekini tasdiqlaganda aynan shu ikki maydon qo'yiladi.
  await prisma.order.update({
    where: { id: order.body?.data?.order?.id },
    data: { status: 'PAID', paidAt: new Date() },
  });

  const purchased = await api(ADMIN, `/api/global/fulfillment/${zayavka.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'PURCHASE', purchaseRef: 'TB-2026-0001' }),
  });
  ok(purchased.body?.data?.status === 'PURCHASED', `status = ${purchased.body?.data?.status}`);
  ok(purchased.body?.data?.purchaseRef === 'TB-2026-0001', 'zakaz raqami saqlandi');

  console.log('\n8) Trek raqam + kargo tortgan ogirlik');
  const tracked = await api(ADMIN, `/api/global/fulfillment/${zayavka.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'TRACK', trackNumber: 'CN123456789UZ', actualWeightKg: 1.15 }),
  });
  ok(tracked.body?.data?.status === 'IN_CARGO', `status = ${tracked.body?.data?.status}`);
  ok(tracked.body?.data?.trackNumber === 'CN123456789UZ', 'trek saqlandi');

  console.log('\n9) Olchov katalogga qaytdimi (jadval aniqlashadi)');
  const source = await prisma.globalSource.findFirst({
    where: { externalItemId: ITEM_ID },
    select: { actualWeightKg: true, weightSamples: true },
  });
  ok(Number(source?.actualWeightKg) === 1.15, `actualWeightKg = ${source?.actualWeightKg}`);
  ok(source?.weightSamples === 1, `olchov soni = ${source?.weightSamples}`);

  console.log('\n10) Yetkazildi');
  const delivered = await api(ADMIN, `/api/global/fulfillment/${zayavka.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'STATUS', status: 'DELIVERED' }),
  });
  ok(delivered.body?.data?.status === 'DELIVERED', `status = ${delivered.body?.data?.status}`);
  ok(Boolean(delivered.body?.data?.deliveredAt), 'deliveredAt yozildi');

  console.log('\n11) Tozalash');
  const removed = await cleanup();
  ok(
    removed.orders > 0 && removed.products > 0,
    `${removed.orders} buyurtma, ${removed.products} mahsulot ochirildi`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
