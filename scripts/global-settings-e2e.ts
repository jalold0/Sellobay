// Sozlamalar + xabarlar: tarif admin panelidan o'zgarganda narx ham o'zgaradimi,
// va bosqich o'zgarganda mijozga xabar yoziladimi.
// Web (3000) va admin (3001) dev serverlari turgan bo'lishi kerak.
import { prisma } from '../packages/database/src/index.ts';

const WEB = process.env.E2E_BASE ?? 'http://localhost:3000';
const ADMIN = process.env.ADMIN_BASE ?? 'http://localhost:3001';
const ITEM_ID = '111222333444';

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
  await prisma.notification.deleteMany({
    where: { data: { path: ['scope'], equals: 'GLOBAL' }, title: { contains: 'Global' } },
  });
  return orders.length + sources.length;
}

async function main() {
  await cleanup();
  const admin = await login(ADMIN, 'admin@test.uz');
  const customer = await login(WEB, 'customer@test.uz');

  const preview = (payload: object) =>
    api(ADMIN, '/api/global/catalog/preview', admin, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

  console.log('1) Standart sozlamalar bilan narx');
  const base = await preview({ priceCny: 130, weightCategory: 'SHOES', freightMode: 'AUTO' });
  const basePrice = base.body?.data?.totalUzs;
  ok(basePrice > 0, `narx = ${uzs(basePrice)} so'm`);

  console.log('\n2) Admin panelidan kargo tarifi $6 → $5.8 ga tushiriladi');
  const saved = await api(ADMIN, '/api/global/settings', admin, {
    method: 'PATCH',
    body: JSON.stringify({ freight: { AUTO: { usdPerKg: 5.8 } } }),
  });
  ok(saved.status === 200, `status ${saved.status}`);
  ok(saved.body?.data?.effective?.freight?.AUTO?.usdPerKg === 5.8, 'tarif saqlandi');
  ok(
    saved.body?.data?.effective?.freight?.AUTO?.minChargeableKg === 0.5,
    'qolgan maydonlar standart qoldi',
  );

  console.log('\n3) Narx DARHOL yangi tarifdan hisoblanadi (kod tegilmadi)');
  const cheaper = await preview({ priceCny: 130, weightCategory: 'SHOES', freightMode: 'AUTO' });
  ok(
    cheaper.body?.data?.totalUzs < basePrice,
    `${uzs(basePrice)} → ${uzs(cheaper.body?.data?.totalUzs)} so'm`,
  );

  console.log('\n4) Kurs ham ishlaydi (12 600 → 13 000)');
  await api(ADMIN, '/api/global/settings', admin, {
    method: 'PATCH',
    body: JSON.stringify({ freight: { AUTO: { usdPerKg: 5.8 } }, pricing: { uzsPerUsd: 13_000 } }),
  });
  const pricier = await preview({ priceCny: 130, weightCategory: 'SHOES', freightMode: 'AUTO' });
  ok(
    pricier.body?.data?.totalUzs > cheaper.body?.data?.totalUzs,
    `kurs oshdi → ${uzs(pricier.body?.data?.totalUzs)} so'm`,
  );

  console.log('\n5) Buzuq qiymat rad etiladi (narx nolga tushmaydi)');
  const bad = await api(ADMIN, '/api/global/settings', admin, {
    method: 'PATCH',
    body: JSON.stringify({ freight: { AUTO: { usdPerKg: -10 } } }),
  });
  ok(bad.status === 400, `status ${bad.status} — ${bad.body?.error?.code}`);
  const unknown = await api(ADMIN, '/api/global/settings', admin, {
    method: 'PATCH',
    body: JSON.stringify({ nomalum: 1 }),
  });
  ok(unknown.status === 400, `noma'lum maydon rad etildi (${unknown.status})`);

  console.log('\n6) Standartga qaytarish');
  await api(ADMIN, '/api/global/settings', admin, { method: 'PATCH', body: JSON.stringify({}) });
  const restored = await preview({ priceCny: 130, weightCategory: 'SHOES', freightMode: 'AUTO' });
  ok(
    restored.body?.data?.totalUzs === basePrice,
    `narx tiklandi: ${uzs(restored.body?.data?.totalUzs)}`,
  );

  console.log('\n7) Xabarlar: buyurtma yaratib bosqichlardan o‘tkazamiz');
  const imported = await api(ADMIN, '/api/global/catalog', admin, {
    method: 'POST',
    body: JSON.stringify({
      url: `https://item.taobao.com/item.htm?id=${ITEM_ID}`,
      name: { uz: 'Xabar testi' },
      priceCny: 130,
      weightCategory: 'SHOES',
      publish: true,
    }),
  });
  const order = await api(WEB, '/api/orders', customer, {
    method: 'POST',
    body: JSON.stringify({
      items: [{ productId: imported.body?.data?.productId, quantity: 1 }],
      recipientName: 'Xabar Test',
      phone: '+998901234567',
      region: 'Toshkent',
      city: 'Toshkent',
      street: 'Test kocha 3',
      deliveryMethod: 'HOME_DELIVERY',
      paymentProvider: 'CASH_ON_DELIVERY',
    }),
  });
  const orderNumber = order.body?.data?.order?.number;
  const z = (await api(ADMIN, '/api/global/fulfillment', admin)).body?.data?.items?.find(
    (f: { order: { number: string } }) => f.order.number === orderNumber,
  );

  const notifications = async () =>
    prisma.notification.findMany({
      where: { body: { contains: orderNumber } },
      orderBy: { createdAt: 'asc' },
      select: { title: true, body: true, channel: true, data: true },
    });

  await api(ADMIN, `/api/global/fulfillment/${z.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'VERIFY', priceCny: 160 }),
  });
  let list = await notifications();
  ok(list.length === 1, `narx oshgani uchun 1 xabar (${list.length})`);
  ok(list[0]?.channel === 'IN_APP', `kanal = ${list[0]?.channel}`);
  ok(/qo‘shimcha/.test(list[0]?.body ?? ''), 'xabarda qo‘shimcha summa bor');

  await api(ADMIN, `/api/global/fulfillment/${z.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'VERIFY' }),
  });
  await api(ADMIN, `/api/global/fulfillment/${z.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'PURCHASE', purchaseRef: 'REF-N-1' }),
  });
  await api(ADMIN, `/api/global/fulfillment/${z.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'TRACK', trackNumber: 'CN111222333UZ' }),
  });
  await api(ADMIN, `/api/global/fulfillment/${z.id}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'STATUS', status: 'DELIVERED' }),
  });

  list = await notifications();
  const titles = list.map((n) => n.title);
  ok(list.length === 5, `jami 5 xabar (${list.length})`);
  ok(
    titles.some((t) => t.includes('tasdiqlandi')),
    'tasdiqlash xabari bor',
  );
  ok(
    titles.some((t) => t.includes('sotib olindi')),
    'sotib olish xabari bor',
  );
  const cargo = list.find((n) => n.title.includes('yo‘lda'));
  ok(Boolean(cargo), 'kargo xabari bor');
  ok(/CN111222333UZ/.test(cargo?.body ?? ''), 'kargo xabarida trek raqam bor');
  ok(
    titles.some((t) => t.includes('yetkazildi')),
    'yetkazildi xabari bor',
  );
  ok(
    list.every((n) => !/REF-N-1/.test(n.body)),
    'xabarlarda ichki zakaz raqami YO‘Q',
  );

  console.log('\n8) Tozalash');
  ok((await cleanup()) > 0, 'test ma’lumoti o‘chirildi');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
