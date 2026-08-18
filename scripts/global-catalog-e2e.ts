// Global katalog importini uchdan-uchgacha sinash (admin, 3001-port).
// Admin dev server turgan bo'lishi kerak: npx tsx scripts/global-catalog-e2e.ts
import { prisma } from '../packages/database/src/index.ts';

const BASE = process.env.ADMIN_BASE ?? 'http://localhost:3001';
const TEST_ITEM_ID = '888777666555';

async function login(email: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password: 'Test1234' }),
  });
  if (!res.ok) throw new Error(`login ${email}: ${res.status} ${await res.text()}`);
  const cookies = res.headers.getSetCookie?.() ?? [];
  return { cookie: cookies.map((c) => c.split(';')[0]).join('; ') };
}

async function api(path: string, jar: { cookie: string }, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', cookie: jar.cookie, ...(init.headers ?? {}) },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const ok = (c: boolean, msg: string) => console.log(`${c ? '  OK  ' : ' XATO '} ${msg}`);

async function cleanup() {
  const sources = await prisma.globalSource.findMany({
    where: { externalItemId: TEST_ITEM_ID },
    select: { productId: true },
  });
  if (sources.length) {
    await prisma.product.deleteMany({ where: { id: { in: sources.map((s) => s.productId) } } });
  }
  return sources.length;
}

async function main() {
  await cleanup();

  const admin = await login('admin@test.uz');
  console.log('Login: admin OK');

  console.log('1) Himoya: admin paneli non-admin loginini rad etadi');
  const badLogin = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'customer@test.uz', password: 'Test1234' }),
  });
  ok(badLogin.status === 403, `login status ${badLogin.status} (NOT_AN_ADMIN)`);

  console.log('   Himoya: sessiyasiz import ham otmaydi');
  const anon = await api(
    '/api/global/catalog',
    { cookie: '' },
    {
      method: 'POST',
      body: JSON.stringify({
        url: `https://item.taobao.com/item.htm?id=${TEST_ITEM_ID}`,
        name: { uz: 'Test' },
        priceCny: 100,
      }),
    },
  );
  ok(anon.status === 401, `status ${anon.status}`);

  console.log('\n2) Narx preview — saqlamasdan hisoblaydi');
  const preview = await api('/api/global/catalog/preview', admin, {
    method: 'POST',
    body: JSON.stringify({ priceCny: 130, weightCategory: 'SHOES', freightMode: 'AUTO' }),
  });
  ok(preview.status === 200, `status ${preview.status}`);
  ok(preview.body?.data?.totalUzs > 0, `narx = ${preview.body?.data?.totalUzs}`);
  ok(
    preview.body?.data?.weightSource === 'CATEGORY',
    `og'irlik manbai = ${preview.body?.data?.weightSource}`,
  );
  ok(preview.body?.data?.chargeableKg === 1.5, `hisobga = ${preview.body?.data?.chargeableKg} kg`);
  console.log(
    `       ${preview.body?.data?.totalUzs} so'm · kafolat ${preview.body?.data?.guaranteeCeilingKg} kg`,
  );

  console.log('\n3) Import — Product + GlobalSource yaratiladi');
  const imported = await api('/api/global/catalog', admin, {
    method: 'POST',
    body: JSON.stringify({
      url: `https://item.taobao.com/item.htm?id=${TEST_ITEM_ID}&spm=test`,
      name: { uz: 'E2E test krossovka', ru: 'E2E тест кроссовки' },
      images: ['https://img.alicdn.com/test1.jpg'],
      priceCny: 130,
      weightCategory: 'SHOES',
      freightMode: 'AUTO',
      publish: true,
    }),
  });
  ok(imported.status === 200, `status ${imported.status}`);
  const result = imported.body?.data;
  ok(
    result?.priceUzs === preview.body?.data?.totalUzs,
    `narx preview bilan bir xil: ${result?.priceUzs}`,
  );
  ok(result?.sku === `GL-TAO-${TEST_ITEM_ID}`, `SKU = ${result?.sku}`);
  // Bazada eski test mahsuloti bo'lsa slug -2, -3 ... bilan chiqadi — bu to'g'ri xatti-harakat
  ok(/^e2e-test-krossovka(-\d+)?$/.test(result?.slug ?? ''), `slug = ${result?.slug}`);
  ok(result?.status === 'ACTIVE', `holat = ${result?.status}`);

  console.log('\n4) Bazada haqiqatan yaratildimi');
  const product = await prisma.product.findUnique({
    where: { id: result.productId },
    select: {
      basePrice: true,
      weightGrams: true,
      status: true,
      images: { select: { url: true } },
      globalSource: { select: { platform: true, externalItemId: true, estimatedWeightKg: true } },
    },
  });
  ok(Number(product?.basePrice) === result.priceUzs, `basePrice = ${product?.basePrice}`);
  ok(product?.weightGrams === 1500, `weightGrams = ${product?.weightGrams}`);
  ok(product?.images.length === 1, `${product?.images.length} ta rasm`);
  ok(product?.globalSource?.externalItemId === TEST_ITEM_ID, `GlobalSource ulandi`);

  console.log('\n5) Takroriy import rad etiladi');
  const dup = await api('/api/global/catalog', admin, {
    method: 'POST',
    body: JSON.stringify({
      url: `https://item.taobao.com/item.htm?id=${TEST_ITEM_ID}`,
      name: { uz: 'Yana test' },
      priceCny: 130,
    }),
  });
  ok(dup.status === 409, `status ${dup.status} — ${dup.body?.error?.code}`);

  console.log('\n6) Qisqa havola rad etiladi (ID aniqlanmaydi)');
  const short = await api('/api/global/catalog', admin, {
    method: 'POST',
    body: JSON.stringify({ url: 'https://m.tb.cn/h.abc123', name: { uz: 'Qisqa' }, priceCny: 50 }),
  });
  ok(short.status === 400, `status ${short.status} — ${short.body?.error?.code}`);

  console.log('\n7) Kargo tortdi — narx qayta hisoblanadi (zaxira olib tashlanadi)');
  const repriced = await api(`/api/global/catalog/${result.globalSourceId}`, admin, {
    method: 'PATCH',
    body: JSON.stringify({ actualWeightKg: 1.1 }),
  });
  ok(repriced.status === 200, `status ${repriced.status}`);
  ok(
    repriced.body?.data?.weightSource === 'MEASURED',
    `manba = ${repriced.body?.data?.weightSource}`,
  );
  ok(
    repriced.body?.data?.chargeableKg === 1.5,
    `hisobga = ${repriced.body?.data?.chargeableKg} kg`,
  );
  ok(
    repriced.body?.data?.weightSamples === 1,
    `o'lchov soni = ${repriced.body?.data?.weightSamples}`,
  );
  console.log(
    `       ${result.priceUzs} → ${repriced.body?.data?.priceUzs} so'm ` +
      `(${repriced.body?.data?.diffUzs >= 0 ? '+' : ''}${repriced.body?.data?.diffUzs})`,
  );

  console.log('\n8) Ro‘yxat');
  const list = await api('/api/global/catalog', admin);
  const row = list.body?.data?.items?.find((i: { id: string }) => i.id === result.globalSourceId);
  ok(Boolean(row), `ro'yxatda topildi`);
  ok(row?.actualWeightKg === 1.1, `actualWeightKg = ${row?.actualWeightKg}`);

  console.log('\n9) Tozalash');
  ok((await cleanup()) > 0, 'test mahsuloti o‘chirildi');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
