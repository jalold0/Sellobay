// E paket e2e: O1, P6, O3, O4/O5, O10, P5. Web :3000 (test sirlari bilan), admin :3001, seller :3002.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const WEB = 'http://localhost:3000';
const ADMIN = 'http://localhost:3001';
const SELLER = 'http://localhost:3002';
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
const customer = await login(WEB, 'customer@test.uz');
const courier = await login(WEB, 'courier@test.uz');
const admin = await login(ADMIN, 'admin@test.uz');
const seller = await login(SELLER, 'seller@test.uz');
const productId = psql(`select id from "Product" where slug='zara-oversized-shirt'`);
const coins = () => Number(psql(`select "loyaltyPoints" from "User" where email='customer@test.uz'`));
const earnRow = (number) => psql(`select coalesce(sum(points),0) from "LoyaltyTransaction" where reference='${number}' and reason='ORDER_EARN'`);

const order = async (provider, extra = {}) => {
  const r = await call(WEB, '/api/orders', customer, 'POST', { items: [{ productId, quantity: 1 }], recipientName: 'E Test', phone: '+998901234567', region: 'Toshkent', city: 'Toshkent', street: 'E 1', deliveryMethod: 'HOME_DELIVERY', paymentProvider: provider, ...extra });
  return { http: r.http, code: r.code, id: r.data?.order?.id, number: r.data?.order?.number, total: r.data?.order?.grandTotal, coinsEarned: r.data?.order?.coinsEarned };
};
async function click(o, transId, action, prep = '') {
  const amount = String(Number(o.total));
  const sign = createHash('md5').update(transId + 'svc' + 'test_click_secret' + o.id + (action === '1' ? prep : '') + amount + action + 't').digest('hex');
  const p = { click_trans_id: transId, service_id: 'svc', merchant_trans_id: o.id, amount, action, sign_time: 't', sign_string: sign, error: '0' };
  if (action === '1') p.merchant_prepare_id = prep;
  return (await fetch(`${WEB}/api/payments/click`, { method: 'POST', body: new URLSearchParams(p) })).json();
}
async function payme(method, params) {
  const r = await fetch(`${WEB}/api/payments/payme`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Basic ' + Buffer.from('Paycom:test_payme_key').toString('base64') }, body: JSON.stringify({ id: Date.now(), method, params }) });
  return r.json();
}

// ===== O1: coin pul tushganda =====
console.log('\n— O1: cashback to‘lovdan keyin');
let c0 = coins();
const ck = await order('CLICK');
log(ck.http === 200 && ck.coinsEarned > 0, 'buyurtma javobi coin VA‘DASINI ko‘rsatadi', ck.coinsEarned);
log(coins() === c0 && earnRow(ck.number) === '0', 'to‘lovgacha coin hisobga tushmadi', { oldin: c0, hozir: coins() });
const prep = (await click(ck, `E-${RUN}`, '0')).merchant_prepare_id;
await click(ck, `E-${RUN}`, '1', prep);
log(Number(earnRow(ck.number)) === ck.coinsEarned && coins() === c0 + ck.coinsEarned, 'Click to‘lovidan keyin coin tushdi', { earn: earnRow(ck.number) });

c0 = coins();
const cod = await order('CASH_ON_DELIVERY');
log(coins() === c0 && earnRow(cod.number) === '0', 'naqd buyurtma — yetkazishgacha coin yo‘q');
await call(ADMIN, `/api/orders/${cod.id}/status`, admin, 'PATCH', { status: 'DELIVERED' });
log(Number(earnRow(cod.number)) === cod.coinsEarned && coins() === c0 + cod.coinsEarned, 'yetkazilgach (naqd olindi) coin tushdi');

// ===== P6: Payme perform poygasi =====
console.log('\n— P6: Payme perform');
c0 = coins();
const pm = await order('PAYME');
const amountT = Math.round(Number(pm.total) * 100);
const tx1 = `PME-${RUN}-1`;
await payme('CreateTransaction', { id: tx1, time: Date.now(), amount: amountT, account: { order_id: pm.id } });
const perf = await payme('PerformTransaction', { id: tx1 });
log(perf.result?.state === 2, 'Perform o‘tdi', perf.result ?? perf.error);
const perf2 = await payme('PerformTransaction', { id: tx1 });
log(perf2.result?.state === 2 && Number(earnRow(pm.number)) === pm.coinsEarned, 'takroriy Perform — o‘sha natija, coin bir marta', { earn: earnRow(pm.number) });
// Create'dan keyin buyurtma bekor qilindi — Perform pul olmasligi kerak
const pm2 = await order('PAYME');
const tx2 = `PME-${RUN}-2`;
await payme('CreateTransaction', { id: tx2, time: Date.now(), amount: Math.round(Number(pm2.total) * 100), account: { order_id: pm2.id } });
await call(ADMIN, `/api/orders/${pm2.id}/cancel`, admin, 'POST', { reason: 'P6 test' });
const perf3 = await payme('PerformTransaction', { id: tx2 });
log(perf3.error && psql(`select status from "Order" where id='${pm2.id}'`) === 'CANCELLED', 'bekor qilingan buyurtmaga Perform — rad, buyurtma CANCELLED qoldi', perf3.error?.code);
log(psql(`select status from "Payment" where "externalId"='${tx2}'`) !== 'PAID', 'to‘lov PAID bo‘lib qolmadi', psql(`select status from "Payment" where "externalId"='${tx2}'`));

// Yetim manzil
const addr0 = Number(psql(`select count(*) from "UserAddress" u join "User" x on x.id=u."userId" where x.email='customer@test.uz'`));
const big = await call(WEB, '/api/orders', customer, 'POST', { items: [{ productId, quantity: 999 }], recipientName: 'E Test', phone: '+998901234567', region: 'Toshkent', city: 'Toshkent', street: 'Yetim 1', deliveryMethod: 'HOME_DELIVERY', paymentProvider: 'CASH_ON_DELIVERY' });
const addr1 = Number(psql(`select count(*) from "UserAddress" u join "User" x on x.id=u."userId" where x.email='customer@test.uz'`));
log(big.http >= 400 && addr1 === addr0, 'zaxira yetmagan buyurtma — manzil yetim qolmadi', { http: big.http, code: big.code, oldin: addr0, keyin: addr1 });

// ===== O3: variant zaxirasi =====
console.log('\n— O3: inventar');
let inv = await call(SELLER, '/api/inventory', seller);
const k6 = (inv.data?.items ?? []).filter((r) => r.sku.startsWith('K6-'));
log(k6.length >= 2 && k6.every((r) => r.variantLabel), 'ko‘p variantli tovar — har variant alohida qator', k6.map((r) => `${r.variantLabel}:${r.stock}`));
const row = k6[0];
let r = await call(SELLER, '/api/inventory', seller, 'PATCH', { updates: [{ variantId: row.variantId, quantity: row.stock + 5, expected: row.stock + 1 }] });
log(r.http === 409 && r.code === 'STOCK_CHANGED', 'eskirgan qiymat bilan yozish — 409, ustidan yozilmadi', r.code);
r = await call(SELLER, '/api/inventory', seller, 'PATCH', { updates: [{ variantId: row.variantId, quantity: row.stock + 5, expected: row.stock }] });
inv = await call(SELLER, '/api/inventory', seller);
const after = inv.data.items.find((x) => x.variantId === row.variantId);
log(r.http === 200 && after.stock === row.stock + 5, 'to‘g‘ri qiymat bilan — saqlandi', { oldin: row.stock, keyin: after.stock });
await call(SELLER, '/api/inventory', seller, 'PATCH', { updates: [{ variantId: row.variantId, quantity: row.stock, expected: row.stock + 5 }] });
const foreign = psql(`select v.id from "ProductVariant" v where v."productId"='${productId}' limit 1`);
r = await call(SELLER, '/api/inventory', seller, 'PATCH', { updates: [{ variantId: foreign, quantity: 1, expected: 0 }] });
log(r.http === 403, 'boshqa sotuvchining varianti — 403', r.http);

// ===== O4/O5: rad etilgan chek =====
console.log('\n— O4: chekni qayta yuborish');
const uz = await order('UZCARD', { paymentReceipt: `receipts/2026-10/e-${RUN}.jpg` });
log(uz.http === 200, 'karta to‘lovli buyurtma (chek bilan) yaratildi', uz.http);
r = await call(WEB, `/api/orders/${uz.id}/receipt`, customer, 'POST', { receipt: `receipts/2026-10/e2-${RUN}.jpg` });
log(r.http === 409, 'chek tekshiruvda — qayta yuborish kerak emas (409)', r.code);
await call(ADMIN, `/api/orders/${uz.id}/payment`, admin, 'PATCH', { action: 'reject', comment: 'Chek o‘qilmaydi' });
let d = (await call(WEB, `/api/orders/${uz.id}`, customer)).data?.order;
log(d?.receiptResubmit?.reason === 'Chek o‘qilmaydi' && Boolean(d?.receiptResubmit?.deadline), 'mijoz sabab va muddatni ko‘radi', d?.receiptResubmit);
r = await call(WEB, `/api/orders/${uz.id}/receipt`, customer, 'POST', { receipt: 'https://evil.example.com/x.jpg' });
log(r.http === 400, 'noto‘g‘ri chek manzili — 400', r.http);
r = await call(WEB, `/api/orders/${uz.id}/receipt`, customer, 'POST', { receipt: `receipts/2026-10/e3-${RUN}.jpg`, note: 'Yangi chek' });
log(r.http === 200, 'yangi chek yuborildi', r.http);
d = (await call(WEB, `/api/orders/${uz.id}`, customer)).data?.order;
log(d?.paymentReview === true && d?.receiptResubmit === null, 'endi «tekshirilmoqda», qayta yuborish bloki yo‘q');
r = await call(WEB, `/api/orders/${uz.id}/receipt`, customer, 'POST', { receipt: `receipts/2026-10/e4-${RUN}.jpg` });
log(r.http === 409, 'ikkinchi marta — 409', r.code);
const pendingNow = (await call(ADMIN, '/api/payment-review', admin)).data;
log(psql(`select count(*) from "Payment" where "orderId"='${uz.id}' and status='PENDING'`) === '1', 'admin navbatida bitta yangi chek');
c0 = coins();
r = await call(ADMIN, `/api/orders/${uz.id}/payment`, admin, 'PATCH', { action: 'verify', receivedAmount: String(Number(uz.total)) });
log(r.http === 200 && coins() === c0 + uz.coinsEarned, 'yangi chek tasdiqlandi, coin tushdi', r.http);
void pendingNow;

// ===== O10 =====
console.log('\n— O10');
const cat = psql(`select slug from "Category" limit 1`);
const bc = `478${Date.now().toString().slice(-10)}`;
r = await call(SELLER, '/api/products', seller, 'POST', { nameUz: `E barcode ${RUN}`, sku: `E-${RUN}-1`, basePrice: '50000', stock: 2, categorySlug: cat, barcode: bc });
log(r.http === 200 && psql(`select barcode from "ProductVariant" where sku='E-${RUN}-1'`) === bc, 'shtrix-kod variantga saqlandi', r.http);
r = await call(SELLER, '/api/products', seller, 'POST', { nameUz: `E barcode2 ${RUN}`, sku: `E-${RUN}-2`, basePrice: '50000', stock: 2, categorySlug: cat, barcode: bc });
log(r.http === 409 && r.code === 'BARCODE_TAKEN', 'takror shtrix-kod — 409', r.code);
r = await call(SELLER, '/api/products', seller, 'POST', { nameUz: `E img ${RUN}`, sku: `E-${RUN}-3`, basePrice: '50000', stock: 2, categorySlug: cat, imageUrls: ['https://evil.example.com/a.jpg'] });
log(r.http === 400, 'tashqi rasm havolasi — rad', r.message);
r = await call(SELLER, '/api/products', seller, 'POST', { nameUz: `E img2 ${RUN}`, sku: `E-${RUN}-4`, basePrice: '50000', stock: 2, categorySlug: cat, imageUrls: ['https://abc.public.blob.vercel-storage.com/products/2026-10/products-x.webp'] });
log(r.http === 200, 'o‘z xotiramizdagi rasm — qabul qilindi', r.http);
const regEmail = `eseller-${RUN}@test.uz`;
r = await call(WEB, '/api/auth/register', null, 'POST', { email: regEmail, password: 'Parol1234', firstName: 'E', role: 'seller', shopName: `E shop ${RUN}`, tin: '123456789' });
log(r.http === 200 && psql(`select count(*) from "Seller" s join "User" u on u.id=s."ownerUserId" where u.email='${regEmail}'`) === '1', 'sotuvchi ro‘yxatdan o‘tishi (bitta tranzaksiya) ishlaydi', r.http);

// ===== P5: kuryer =====
console.log('\n— P5: kuryer');
const cod2 = await order('CASH_ON_DELIVERY');
// F3a: kuryer buyurtmani ombor yig'gach oladi — ochiq jo'natmalarni qabul qilamiz.
for (const sid of psql(`select id from "SellerShipment" where "orderId"='${cod2.id}' and status in ('NEW','ACCEPTED','PACKED')`).split('\n').filter(Boolean)) {
  await call(ADMIN, `/api/shipments/${sid}/receive`, admin, 'POST');
}
const delId = psql(`select id from "Delivery" where "orderId"='${cod2.id}' and kind='OUTBOUND'`);
let list = await call(WEB, '/api/courier/deliveries', courier);
const avail = list.data?.available ?? [];
log(avail.length > 0 && avail.every((x) => x.order.recipientName === null && x.order.recipientPhone === null && x.order.notes === null), 'bo‘sh topshiriqlarning hech birida mijoz ismi/telefoni/izohi yo‘q', { soni: avail.length });
log(avail.every((x) => Boolean(x.destinationAddress)), 'manzil ko‘rinadi (tanlash uchun)');
await call(WEB, `/api/courier/deliveries/${delId}/claim`, courier, 'POST');
list = await call(WEB, '/api/courier/deliveries', courier);
const mine = (list.data?.mine ?? []).find((x) => x.id === delId);
log(mine?.order?.recipientName === 'E Test', 'olgandan keyin ism ko‘rinadi', mine?.order?.recipientName);
await call(WEB, `/api/courier/deliveries/${delId}/status`, courier, 'POST', { status: 'PICKED_UP' });
await call(WEB, `/api/courier/deliveries/${delId}/status`, courier, 'POST', { status: 'IN_TRANSIT' });
r = await call(WEB, `/api/courier/deliveries/${delId}/status`, courier, 'POST', { status: 'DELIVERED', proofPhotoUrl: 'receipts/2026-10/boshqa.jpg' });
log(r.http === 400, 'begona papkadagi «isbot» surati — 400', r.message);
r = await call(WEB, `/api/courier/deliveries/${delId}/status`, courier, 'POST', { status: 'DELIVERED', proofPhotoUrl: 'delivery-proofs/2026-10/ok.jpg' });
log(r.http === 200, 'to‘g‘ri isbot yo‘li bilan yetkazildi', r.http);
log(Number(earnRow(cod2.number)) === cod2.coinsEarned, 'kuryer yetkazgan naqd buyurtmaga ham coin tushdi');

// tozalash
psql(`delete from "User" where email='${regEmail}'`);
console.log(fails === 0 ? '\nHAMMASI O‘TDI ✅' : `\n${fails} ta TEST YIQILDI ❌`);
process.exit(fails ? 1 : 0);
