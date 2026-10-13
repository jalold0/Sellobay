// F5 e2e: narx taklifi → shaxsiy global tovar → to'lov sahifasi (ADR 0015).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const WEB = 'http://localhost:3000';
const ADMIN = 'http://localhost:3001';
const PW = readFileSync(new URL('../../packages/database/prisma/seed-test-accounts.ts', import.meta.url), 'utf8').match(/password: '([^']+)'/)[1];
const RUN = Date.now().toString(36);
let fails = 0;
const log = (ok, msg, extra) => {
  console.log(`${ok ? '✅' : '❌'} ${msg}${extra !== undefined ? ' → ' + JSON.stringify(extra) : ''}`);
  if (!ok) fails++;
};
const psql = (sql) =>
  execFileSync(process.env.DOCKER_BIN ?? 'docker', ['exec', 'ecom-postgres', 'psql', '-U', 'postgres', '-d', 'ecommerce', '-tAc', sql], { encoding: 'utf8' }).trim();
async function login(base, email) {
  const r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: email, email, password: PW }) });
  const j = await r.json();
  return { cookie: (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; '), token: j.data?.tokens?.access };
}
const call = async (base, path, auth, method = 'GET', body) => {
  const r = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(auth?.cookie ? { cookie: auth.cookie } : {}), ...(auth?.token ? { authorization: `Bearer ${auth.token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const j = await r.json().catch(() => null);
  return { http: r.status, data: j?.data, code: j?.error?.code, message: j?.error?.message };
};
async function click(o, transId) {
  const amount = String(Number(o.total));
  const sign = (action, prep) => createHash('md5').update(transId + 'svc' + 'test_click_secret' + o.id + (action === '1' ? prep : '') + amount + action + 't').digest('hex');
  const base = { click_trans_id: transId, service_id: 'svc', merchant_trans_id: o.id, amount, sign_time: 't', error: '0' };
  const p0 = await (await fetch(`${WEB}/api/payments/click`, { method: 'POST', body: new URLSearchParams({ ...base, action: '0', sign_string: sign('0', '') }) })).json();
  await fetch(`${WEB}/api/payments/click`, { method: 'POST', body: new URLSearchParams({ ...base, action: '1', merchant_prepare_id: p0.merchant_prepare_id, sign_string: sign('1', p0.merchant_prepare_id) }) });
}

const customer = await login(WEB, 'customer@test.uz');
const other = await login(WEB, 'seller@test.uz');
const operator = await login(WEB, 'admin@test.uz');
const admin = await login(ADMIN, 'admin@test.uz');
log(Boolean(customer.token && other.token && operator.token && admin.cookie), 'hamma rol tizimga kirdi');

const addr = { recipientName: 'F5 Test', phone: '+998901234567', region: 'Toshkent', city: 'Toshkent', street: 'F5 1', deliveryMethod: 'HOME_DELIVERY' };
const placeOrder = (who, items, paymentProvider = 'CLICK') => call(WEB, '/api/orders', who, 'POST', { items, ...addr, paymentProvider });
async function quotedRequest(qty, n) {
  let r = await call(WEB, '/api/global/sourcing', customer, 'POST', { url: `https://item.taobao.com/item.htm?id=${Date.now()}${n}`, qty, variantNote: 'qora, L' });
  const id = r.data?.request?.id;
  r = await call(WEB, `/api/global/sourcing/${id}/quote`, operator, 'POST', { priceCny: 120, weightKg: 0.8 });
  return { id, number: r.data?.number, quoted: r.http === 200 };
}
const sr = (id) => psql(`select status||'|'||coalesce("orderId"::text,'-') from "SourcingRequest" where id='${id}'`);

// ===== 1. Qabul qilish → shaxsiy tovar =====
console.log('\n— 1. Taklif qabul qilindi');
const q1 = await quotedRequest(2, 1);
log(q1.quoted, 'operator narx taklif qildi', q1.number);
let r = await call(WEB, `/api/global/sourcing/${q1.id}`, customer, 'PATCH', { action: 'ACCEPT' });
const co = r.data?.checkout;
log(r.http === 200 && r.data.status === 'ACCEPTED' && co?.quantity === 2 && co.unitPrice > 0, 'qabul qilindi — to‘lov uchun tovar berildi', co && { qty: co.quantity, unit: co.unitPrice, name: co.name?.uz });
log(psql(`select count(*) from "GlobalSource" where "sourcingRequestId"='${q1.id}'`) === '1', 'shaxsiy global tovar yaratildi (bitta)');
r = await call(WEB, `/api/global/sourcing/${q1.id}`, customer, 'PATCH', { action: 'ACCEPT' });
log(r.http === 409, 'qayta qabul — 409', r.http);

// ===== 2. Katalogda ko'rinmaydi =====
console.log('\n— 2. Katalogda yo‘q');
r = await call(WEB, `/api/products/${co.slug}`, null);
log(r.http === 404, 'tovar sahifasi — 404', r.http);
r = await call(WEB, `/api/products?q=${encodeURIComponent(q1.number)}&limit=50`, null);
const listed = JSON.stringify(r.data ?? {}).includes(co.productId);
log(r.http === 200 && !listed, 'ro‘yxat/qidiruvda yo‘q', r.http);
r = await call(WEB, `/api/products/suggest?q=${encodeURIComponent('Xitoydan buyurtma')}`, null);
log(!JSON.stringify(r.data ?? {}).includes(co.slug), 'tezkor qidiruvda yo‘q');

// ===== 3. Buyurtma qoidalari =====
console.log('\n— 3. Faqat egasi, taklifdagi sonda');
r = await placeOrder(other, [{ productId: co.productId, quantity: 2 }]);
log(r.http === 400 && r.code === 'PRODUCT_NOT_FOUND', 'begona foydalanuvchi ola olmaydi', r.code);
r = await placeOrder(customer, [{ productId: co.productId, quantity: 1 }]);
log(r.http === 409 && r.code === 'QUOTE_QTY_MISMATCH', 'boshqa son — 409', r.message);
const zara = psql(`select id from "Product" where slug='zara-oversized-shirt'`);
r = await placeOrder(customer, [{ productId: co.productId, quantity: 2 }, { productId: zara, quantity: 1 }]);
log(r.http === 409, 'boshqa tovar bilan aralash — 409', r.code);
r = await placeOrder(customer, [{ productId: co.productId, quantity: 2 }], 'CASH_ON_DELIVERY');
log(r.http >= 400, 'naqd — yo‘q (global faqat oldindan to‘lov)', r.code);
r = await placeOrder(customer, [{ productId: co.productId, quantity: 2 }]);
const o1 = { id: r.data?.order?.id, total: r.data?.order?.grandTotal };
log(r.http === 200 && sr(q1.id) === `ACCEPTED|${o1.id}`, 'buyurtma berildi va so‘rovga bog‘landi', sr(q1.id));
log(psql(`select count(*) from "GlobalFulfillment" where "orderId"='${o1.id}'`) === '1', 'global zayavka ochildi (operator Xitoyga buyurtma beradi)');
log(Number(o1.total) === Number(psql(`select "quotedTotal" from "SourcingRequest" where id='${q1.id}'`)), 'summa taklif bilan bir xil', { order: o1.total });
r = await placeOrder(customer, [{ productId: co.productId, quantity: 2 }]);
log(r.http === 409 && r.code === 'QUOTE_NOT_PAYABLE', 'ikkinchi buyurtma — 409', r.message);
r = await call(WEB, '/api/global/sourcing', customer);
const row1 = (r.data?.items ?? []).find((x) => x.id === q1.id);
log(row1 && row1.checkout === null && row1.orderId === o1.id, 'ro‘yxatda «to‘lovga o‘tish» endi yo‘q', row1 && { checkout: row1.checkout });
await click(o1, `F5-${RUN}-1`);
log(sr(q1.id) === `ORDERED|${o1.id}`, 'to‘langach — «Buyurtma berildi»', sr(q1.id));

// ===== 3b. Global buyurtma: kuryer faqat omborga kelgach; «mijoz oldi» — buyurtma ham =====
console.log('\n— 3b. Global buyurtma oqimi (O9)');
const courier = await login(WEB, 'courier@test.uz');
const gDel = psql(`select id from "Delivery" where "orderId"='${o1.id}' and kind='OUTBOUND'`);
r = await call(WEB, `/api/courier/deliveries/${gDel}/claim`, courier, 'POST');
log(r.http >= 400, 'to‘langan, lekin tovar hali Xitoyda — kuryer ola olmaydi', { http: r.http, code: r.code });
r = await call(ADMIN, `/api/orders/${o1.id}/status`, admin, 'PATCH', { status: 'PACKED' });
log(r.http === 200, 'kargo omborga keldi — admin «Qadoqlandi»', r.http);
let gd = (await call(ADMIN, `/api/orders/${o1.id}`, admin)).data;
log(gd?.carrierEvents?.join() === 'HANDED_OVER', 'endi 3PL’ga topshirsa bo‘ladi', gd?.carrierEvents);
const gfId = psql(`select id from "GlobalFulfillment" where "orderId"='${o1.id}'`);
r = await call(ADMIN, `/api/global/fulfillment/${gfId}`, admin, 'PATCH', { action: 'STATUS', status: 'DELIVERED' });
log(r.http === 200 && psql(`select status from "Order" where id='${o1.id}'`) === 'DELIVERED', 'zayavka «mijoz oldi» — buyurtma ham «Yetkazildi»', { http: r.http, code: r.code });

// ===== 4. To'lanmagan buyurtma bekor — qayta to'lash mumkin =====
console.log('\n— 4. To‘lanmagan buyurtma bekor qilindi');
const q2 = await quotedRequest(1, 2);
r = await call(WEB, `/api/global/sourcing/${q2.id}`, customer, 'PATCH', { action: 'ACCEPT' });
const co2 = r.data.checkout;
r = await placeOrder(customer, [{ productId: co2.productId, quantity: 1 }]);
const o2 = r.data?.order?.id;
r = await call(WEB, `/api/orders/${o2}/cancel`, customer, 'POST', {});
log(r.http === 200 && sr(q2.id) === 'ACCEPTED|-', 'bekor qilindi — so‘rov yana to‘lovni kutadi', sr(q2.id));
r = await call(WEB, '/api/global/sourcing', customer);
log((r.data?.items ?? []).find((x) => x.id === q2.id)?.checkout?.productId === co2.productId, '«To‘lovga o‘tish» qaytdi');
r = await placeOrder(customer, [{ productId: co2.productId, quantity: 1 }]);
log(r.http === 200, 'qayta buyurtma berildi', r.http);
const o2b = { id: r.data?.order?.id, total: r.data?.order?.grandTotal };
await click(o2b, `F5-${RUN}-2`);
r = await call(ADMIN, `/api/orders/${o2b.id}/cancel`, admin, 'POST', { reason: 'Xitoyda tovar tugadi' });
log(r.http === 200 && sr(q2.id).startsWith('CANCELLED|'), 'to‘langan buyurtma bekor — so‘rov ham bekor', sr(q2.id));

// ===== 5. Muddat tugagan =====
console.log('\n— 5. Taklif muddati tugagan');
const q3 = await quotedRequest(1, 3);
r = await call(WEB, `/api/global/sourcing/${q3.id}`, customer, 'PATCH', { action: 'ACCEPT' });
const co3 = r.data.checkout;
psql(`update "SourcingRequest" set "quoteExpiresAt"=now()-interval '1 hour' where id='${q3.id}'`);
r = await placeOrder(customer, [{ productId: co3.productId, quantity: 1 }]);
log(r.http === 409 && r.code === 'QUOTE_NOT_PAYABLE', 'muddat o‘tgach to‘lab bo‘lmaydi', r.message);
r = await call(WEB, '/api/global/sourcing', customer);
log((r.data?.items ?? []).find((x) => x.id === q3.id)?.checkout === null, '«To‘lovga o‘tish» ko‘rsatilmaydi');

console.log(`\n${fails === 0 ? 'HAMMASI O‘TDI' : `${fails} ta XATO`}`);
process.exit(fails ? 1 : 0);
