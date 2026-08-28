// Mijoz global buyurtmani qanday ko'rishini tekshirish: har bosqichda
// `/api/orders` va `/api/orders/:id` nima qaytaradi.
// Web (3000) va admin (3001) dev serverlari turgan bo'lishi kerak.
import { prisma } from '../packages/database/src/index.ts';

const WEB = process.env.E2E_BASE ?? 'http://localhost:3000';
const ADMIN = process.env.ADMIN_BASE ?? 'http://localhost:3001';
const ITEM_ID = '555444333222';

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

  const imported = await api(ADMIN, '/api/global/catalog', admin, {
    method: 'POST',
    body: JSON.stringify({
      url: `https://item.taobao.com/item.htm?id=${ITEM_ID}`,
      name: { uz: 'Mijoz korinishi testi' },
      priceCny: 130,
      weightCategory: 'SHOES',
      freightMode: 'AVIA',
      publish: true,
    }),
  });
  const productId = imported.body?.data?.productId;

  const order = await api(WEB, '/api/orders', customer, {
    method: 'POST',
    body: JSON.stringify({
      items: [{ productId, quantity: 1 }],
      recipientName: 'Mijoz Test',
      phone: '+998901234567',
      region: 'Toshkent',
      city: 'Toshkent',
      street: 'Test kocha 2',
      deliveryMethod: 'HOME_DELIVERY',
      paymentProvider: 'UZCARD',
      paymentReceipt: FAKE_RECEIPT,
    }),
  });
  const orderId = order.body?.data?.order?.id;
  const orderNumber = order.body?.data?.order?.number;
  console.log(`Tayyorgarlik: ${orderNumber} yaratildi (AVIA)\n`);

  const zayavka = (await api(ADMIN, '/api/global/fulfillment', admin)).body?.data?.items?.find(
    (f: { order: { number: string } }) => f.order.number === orderNumber,
  );

  async function customerSees() {
    const detail = await api(WEB, `/api/orders/${orderId}`, customer);
    // GET /api/orders/:id javobi: { data: { order: {...} } }
    return detail.body?.data?.order;
  }

  console.log('1) Buyurtma ro‘yxatida GLOBAL deb belgilanadi');
  const list = await api(WEB, '/api/orders', customer);
  const row = list.body?.data?.items?.find((o: { id: string }) => o.id === orderId);
  ok(row?.scope === 'GLOBAL', `scope = ${row?.scope}`);
  ok(row?.global?.freightMode === 'AVIA', `yuk turi = ${row?.global?.freightMode}`);

  console.log('\n2) Boshida — "Tekshirilmoqda", trek yo‘q');
  let v = (await customerSees())?.global;
  ok(v?.stage === 'CHECKING', `bosqich = ${v?.stage}`);
  ok(v?.stageIndex === 0, `chiziqda ${v?.stageIndex}-o‘rin`);
  ok(v?.trackNumber === null, 'trek raqam hali ko‘rsatilmaydi');
  ok(
    v?.leadTimeDays?.[0] === 5,
    `muddat ${v?.leadTimeDays?.[0]}-${v?.leadTimeDays?.[1]} kun (AVIA)`,
  );

  console.log('\n3) Narx oshdi — mijoz buni ko‘radi va summani biladi');
  await api(ADMIN, `/api/global/fulfillment/${zayavka.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'VERIFY', priceCny: 160 }),
  });
  v = (await customerSees())?.global;
  ok(v?.stage === 'PRICE_CHANGED', `bosqich = ${v?.stage}`);
  ok(v?.needsDecision === true, 'mijoz qarori kutilyapti');
  ok(v?.extraChargeUzs > 0, `qo‘shimcha ${v?.extraChargeUzs} so‘m`);

  console.log('\n4) Tasdiqlandi → sotib olindi (trek hali yo‘q)');
  await api(ADMIN, `/api/global/fulfillment/${zayavka.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'VERIFY' }),
  });
  // Global buyurtmada operator PUL KELGACH sotib oladi (NOT_PAID himoyasi).
  // Admin karta chekini tasdiqlaganda aynan shu ikki maydon qo'yiladi.
  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'PAID', paidAt: new Date() },
  });

  await api(ADMIN, `/api/global/fulfillment/${zayavka.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'PURCHASE', purchaseRef: 'SECRET-REF-001' }),
  });
  v = (await customerSees())?.global;
  ok(v?.stage === 'PURCHASED', `bosqich = ${v?.stage}`);
  ok(v?.trackNumber === null, 'trek hali ko‘rsatilmaydi');
  ok(v?.needsDecision === false, 'qaror kutilmayapti');

  console.log('\n5) Kargoga topshirildi — endi trek ko‘rinadi');
  await api(ADMIN, `/api/global/fulfillment/${zayavka.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'TRACK', trackNumber: 'CN987654321UZ', actualWeightKg: 1.2 }),
  });
  v = (await customerSees())?.global;
  ok(v?.stage === 'IN_CARGO', `bosqich = ${v?.stage}`);
  ok(v?.trackNumber === 'CN987654321UZ', `trek = ${v?.trackNumber}`);

  console.log('\n6) Ichki ma’lumot mijozga SIZMAYDI');
  const detail = await customerSees();
  const raw = JSON.stringify(detail);
  ok(!raw.includes('SECRET-REF-001'), 'platformadagi zakaz raqami chiqmadi');
  ok(!raw.includes('verifiedPriceCny'), 'tekshirilgan ¥ narx chiqmadi');
  ok(!raw.includes('absorbedTotal'), 'biz yutgan farq chiqmadi');
  ok(!raw.includes('operatorNote'), 'operator izohi chiqmadi');

  console.log('\n7) Yetkazildi');
  await api(ADMIN, `/api/global/fulfillment/${zayavka.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'STATUS', status: 'DELIVERED' }),
  });
  v = (await customerSees())?.global;
  ok(v?.stage === 'DELIVERED', `bosqich = ${v?.stage}`);
  ok(v?.stageIndex === 4, `chiziq oxiri (${v?.stageIndex})`);

  console.log('\n8) Oddiy (lokal) buyurtmada global blok yo‘q');
  const anyLocal = list.body?.data?.items?.find((o: { scope?: string }) => o.scope === 'LOCAL');
  ok(anyLocal ? anyLocal.global === null : true, 'lokal buyurtmada global = null');

  console.log('\n9) Tozalash');
  ok((await cleanup()) > 0, 'test ma’lumoti o‘chirildi');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
