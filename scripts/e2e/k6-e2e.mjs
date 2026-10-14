// K6 e2e: checkout variant narxini oladimi (lokal DB, seller API orqali haqiqiy variantli tovar).
// Ishlatish: node k6-e2e.mjs [setup|check]
//   setup — seller API orqali S (narxsiz) / M (1 250 000) variantli tovar yaratadi, slug'ni chiqaradi
//   check — buyurtma va savat narxlarini tekshiradi
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const WEB = 'http://localhost:3100';
const SELLER = 'http://localhost:3002';
const STATE = 'C:/Users/Jaloldin/AppData/Local/Temp/claude/E--Projects-Sellobay/a5441bb7-c0ee-4ae2-9b13-cd0385f28728/scratchpad/k6-state.json';
const PW = readFileSync(new URL('../../packages/database/prisma/seed-test-accounts.ts', import.meta.url), 'utf8').match(/password: '([^']+)'/)[1];
const BASE_PRICE = 1_000_000;
const M_PRICE = 1_250_000;

let fails = 0;
const log = (ok, msg, extra) => {
  console.log(`${ok ? '✅' : '❌'} ${msg}${extra !== undefined ? ' → ' + JSON.stringify(extra) : ''}`);
  if (!ok) fails++;
};
const psql = (sql) =>
  execFileSync(process.env.DOCKER_BIN ?? 'docker', ['exec', 'ecom-postgres', 'psql', '-U', 'postgres', '-d', 'ecommerce', '-tAc', sql], { encoding: 'utf8' }).trim();

async function cookieLogin(base, email) {
  const r = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: email, email, password: PW }),
  });
  return { ok: r.ok, cookie: (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; '), json: await r.json() };
}

const mode = process.argv[2] ?? 'check';

if (mode === 'setup') {
  const s = await cookieLogin(SELLER, 'seller@test.uz');
  log(s.ok, 'Seller login', s.ok);
  const sku = 'K6-' + Date.now();
  const r = await fetch(`${SELLER}/api/products`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: s.cookie },
    body: JSON.stringify({
      nameUz: 'K6 test futbolka',
      sku,
      basePrice: BASE_PRICE,
      stock: 10,
      categorySlug: psql(`select slug from "Category" order by "createdAt" limit 1`),
      variants: [
        { size: 'S', stock: 5 },
        { size: 'M', stock: 5, priceOverride: M_PRICE },
      ],
    }),
  });
  const j = await r.json();
  log(r.ok, 'Seller API: S/M variantli tovar yaratildi', r.status);
  const productId = j.data?.id ?? j.data?.product?.id ?? j.id;
  const row = psql(`select p.slug||'|'||p.status from "Product" p where p.sku='${sku}'`);
  const [slug, status] = row.split('|');
  const variants = psql(`select v.id||'|'||coalesce(v.price::text,'null')||'|'||a."valueString" from "ProductVariant" v join "VariantAttribute" a on a."variantId"=v.id join "Product" p on p.id=v."productId" where p.sku='${sku}' order by a."valueString"`)
    .split('\n')
    .map((l) => l.split('|'));
  const vs = Object.fromEntries(variants.map(([id, price, size]) => [size, { id, price }]));
  writeFileSync(STATE, JSON.stringify({ productId, slug, sku, vs }, null, 2));
  log(status === 'ACTIVE', 'Tovar ACTIVE (dev avto-tasdiq)', status);
  log(vs.S?.price === 'null' && Number(vs.M?.price) === M_PRICE, 'Bazada: S narxsiz, M = 1 250 000', vs);
  console.log('SLUG=' + slug);
  process.exit(fails ? 1 : 0);
}

// --- check ---
if (!existsSync(STATE)) throw new Error('avval: node k6-e2e.mjs setup');
const st = JSON.parse(readFileSync(STATE, 'utf8'));

const api = await (await fetch(`${WEB}/api/products/${st.slug}`)).json();
const apiM = (api.data?.variants ?? api.data?.product?.variants ?? []).find((v) => v.id === st.vs.M.id);
log(apiM && Number(apiM.price) === M_PRICE, 'Mahsulot API: M varianti 1 250 000 deb ko‘rsatiladi', apiM?.price);

async function order(variantId) {
  const r = await fetch(`${WEB}/api/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      items: [{ productId: psql(`select id from "Product" where sku='${st.sku}'`), variantId, quantity: 1 }],
      recipientName: 'K6 Test',
      phone: '+998901234567',
      region: 'Toshkent',
      city: 'Toshkent',
      street: 'Test 1',
      deliveryMethod: 'HOME_DELIVERY',
      paymentProvider: 'CASH_ON_DELIVERY',
    }),
  });
  const j = await r.json();
  if (!j.success) return { http: r.status, code: j.error?.code };
  const id = j.data.order.id;
  return {
    http: r.status,
    grandTotal: Number(j.data.order.grandTotal),
    unitPrice: Number(psql(`select "unitPrice" from "OrderItem" where "orderId"='${id}'`)),
    itemVariant: psql(`select "variantId" from "OrderItem" where "orderId"='${id}'`),
  };
}

let o = await order(st.vs.M.id);
log(o.unitPrice === M_PRICE && o.itemVariant === st.vs.M.id, 'M bilan buyurtma: OrderItem.unitPrice = 1 250 000 (K6)', o);
log(o.grandTotal === M_PRICE, 'M bilan buyurtma: jami 1 250 000 (bepul yetkazish chegarasidan yuqori)', o.grandTotal);
o = await order(st.vs.S.id);
log(o.unitPrice === BASE_PRICE, 'S bilan buyurtma: asosiy narx 1 000 000', o.unitPrice);

// Nofaol variantni aniq tanlab bo'lmaydi
psql(`update "ProductVariant" set "isActive"=false where id='${st.vs.M.id}'`);
o = await order(st.vs.M.id);
log(o.http === 400 && o.code === 'VARIANT_NOT_FOUND', 'Nofaol M varianti → 400 VARIANT_NOT_FOUND', o);
psql(`update "ProductVariant" set "isActive"=true where id='${st.vs.M.id}'`);

// Savat snapshot'i
const c = await cookieLogin(WEB, 'customer@test.uz');
const put = await fetch(`${WEB}/api/cart`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json', cookie: c.cookie },
  body: JSON.stringify({ strategy: 'replace', items: [{ productId: psql(`select id from "Product" where sku='${st.sku}'`), variantId: st.vs.M.id, quantity: 1 }] }),
});
const cartJ = await put.json();
const line = (cartJ.data?.items ?? []).find((i) => i.variantId === st.vs.M.id);
log(line && Number(line.unitPrice) === M_PRICE, 'Server savati: M qatori 1 250 000', line?.unitPrice);

console.log(fails === 0 ? '\nHAMMASI O‘TDI ✅' : `\n${fails} ta TEST YIQILDI ❌`);
process.exit(fails ? 1 : 0);
