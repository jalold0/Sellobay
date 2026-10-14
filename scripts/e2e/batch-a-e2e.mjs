// A paket e2e: O7, Y8, Y7, Y9, Y11, O6 — haqiqiy API va lokal Docker Postgres.
// Web :3000 (CLICK_SECRET_KEY=test_click_secret, CLICK_SERVICE_ID, CLICK_MERCHANT_ID,
// PAYME_MERCHANT_ID, PAYME_KEY=test_payme_key), admin :3001.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const WEB = 'http://localhost:3000';
const ADMIN = 'http://localhost:3001';
const PW = readFileSync(new URL('../../packages/database/prisma/seed-test-accounts.ts', import.meta.url), 'utf8').match(/password: '([^']+)'/)[1];
let fails = 0;
const RUN = Date.now().toString(36);
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
const customer = await login(WEB, 'customer@test.uz');
const admin = await login(ADMIN, 'admin@test.uz');
const productId = psql(`select id from "Product" where slug='zara-oversized-shirt'`);
const stockOf = () => Number(psql(`select sum(i."quantityOnHand") from "InventoryItem" i join "ProductVariant" v on v.id=i."variantId" where v."productId"='${productId}'`));
const coinsOf = () => Number(psql(`select "loyaltyPoints" from "User" where email='customer@test.uz'`));

async function order(provider, { auth = null, extra = {} } = {}) {
  const r = await fetch(`${WEB}/api/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${auth.token}` } : {}) },
    body: JSON.stringify({ items: [{ productId, quantity: 1 }], recipientName: 'A Test', phone: '+998901234567', region: 'Toshkent', city: 'Toshkent', street: 'Test 1', deliveryMethod: 'HOME_DELIVERY', paymentProvider: provider, ...extra }),
  });
  const j = await r.json();
  return { http: r.status, code: j.error?.code, id: j.data?.order?.id, number: j.data?.order?.number, total: j.data?.order?.grandTotal };
}
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

// --- O7 ---
let o = await order('UZUM_BANK');
log(o.http === 400 && o.code === 'PAYMENT_METHOD_UNAVAILABLE', 'O7: oqimi yo‘q UZUM_BANK rad etiladi', o);
const guestClick = await order('CLICK');
let r = await fetch(`${WEB}/api/payments/create`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: guestClick.id, provider: 'CLICK' }) });
let j = await r.json();
log(r.status === 200 && typeof j.data?.checkoutUrl === 'string', 'O7: mehmon Click buyurtmasiga to‘lov havolasi beriladi', r.status);
const owned = await order('CLICK', { auth: customer });
r = await fetch(`${WEB}/api/payments/create`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ orderId: owned.id, provider: 'CLICK' }) });
log(r.status === 401, 'O7: egasi bor buyurtmaga login’siz havola berilmaydi', r.status);
const pc = await (await fetch(`${WEB}/api/payment-cards`)).json();
log(JSON.stringify(pc.data?.providers) === '["CLICK","PAYME","CASH_ON_DELIVERY"]', 'O7: /api/payment-cards ishlaydigan provayderlarni qaytaradi', pc.data?.providers);

// --- Y8 ---
const prep = (await click(guestClick, `A-Y8-1-${RUN}`, '0')).merchant_prepare_id;
log((await click(guestClick, `A-Y8-1-${RUN}`, '1', prep)).error === 0, 'Y8: Click to‘lovi o‘tdi');
log((await click(guestClick, `A-Y8-1-${RUN}`, '1', prep)).error === -4, 'Y8: o‘sha tranzaksiya qayta kelsa -4 (500 emas)');
r = await fetch(`${ADMIN}/api/orders/${guestClick.id}/status`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: admin.cookie }, body: JSON.stringify({ status: 'SHIPPED' }) });
log(r.status === 200, 'Y8: admin buyurtmani SHIPPED qildi', r.status);
const prep2 = (await click(guestClick, `A-Y8-2-${RUN}`, '0')).merchant_prepare_id;
const c2 = await click(guestClick, `A-Y8-2-${RUN}`, '1', prep2 ?? guestClick.id);
log(c2.error === -4, 'Y8: jo‘natilgan buyurtmaga yangi Click to‘lovi -4', c2.error);
log(psql(`select status||'|'||(select count(*) from "Payment" where "orderId"='${guestClick.id}') from "Order" where id='${guestClick.id}'`) === 'SHIPPED|1', 'Y8: buyurtma SHIPPED qoldi, bitta to‘lov yozuvi');

// --- Y7: Payme perform'gacha bekor — zaxira, promo, coin qaytadi ---
psql(`insert into "PromoCode"(id,code,type,value,"usageLimit","usagePerUser","usedCount","isActive","createdAt") values (gen_random_uuid(),'APAKET10','PERCENT',10,100,5,0,true,now()) on conflict (code) do update set "usedCount"=0,"usageLimit"=100,"usagePerUser"=5`);
const stock0 = stockOf();
const coins0 = coinsOf();
const pm = await order('PAYME', { auth: customer, extra: { promoCode: 'APAKET10' } });
log(pm.http === 200 && stockOf() === stock0 - 1, 'Y7: Payme buyurtma (promo bilan) yaratildi, zaxira −1', pm);
const amountT = Math.round(Number(pm.total) * 100);
const txId = 'PM-' + Date.now();
await payme('CheckPerformTransaction', { amount: amountT, account: { order_id: pm.id } });
const ct = await payme('CreateTransaction', { id: txId, time: Date.now(), amount: amountT, account: { order_id: pm.id } });
log(ct.result?.state === 1, 'Y7: Payme CreateTransaction', ct.result ?? ct.error);
const cc = await payme('CancelTransaction', { id: txId, reason: 3 });
log(cc.result?.state === -1, 'Y7: Payme perform’gacha bekor qildi', cc.result ?? cc.error);
log(stockOf() === stock0, 'Y7: zaxira qaytdi', { oldin: stock0, hozir: stockOf() });
log(Number(psql(`select "usedCount" from "PromoCode" where code='APAKET10'`)) === 0, 'Y7: promo usedCount qaytdi');
log(coinsOf() === coins0, 'Y7: berilgan coin qaytarib olindi', { oldin: coins0, hozir: coinsOf() });
await payme('CancelTransaction', { id: txId, reason: 3 });
log(stockOf() === stock0 && coinsOf() === coins0, 'Y7: takroriy Cancel hech narsani ikki marta qaytarmaydi');

// --- Y9: mijoz bekor qiladi — kuryer topshirig'i va kutilayotgan to'lov yopiladi ---
const cod = await order('CASH_ON_DELIVERY', { auth: customer });
r = await fetch(`${WEB}/api/orders/${cod.id}/cancel`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${customer.token}` }, body: '{}' });
log(r.status === 200, 'Y9: mijoz bekor qildi', r.status);
log(psql(`select d.status||'|'||p.status from "Delivery" d join "Payment" p on p."orderId"=d."orderId" where d."orderId"='${cod.id}'`) === 'FAILED|CANCELLED', 'Y9: yetkazish FAILED, naqd to‘lov CANCELLED');

// --- Y11: parallel promo (limit 1) va coin ---
psql(`insert into "PromoCode"(id,code,type,value,"usageLimit","usagePerUser","usedCount","isActive","createdAt") values (gen_random_uuid(),'BIRTA','FIXED',10000,1,5,0,true,now()) on conflict (code) do update set "usedCount"=0,"usageLimit"=1`);
const res = await Promise.all([1, 2, 3].map(() => order('CASH_ON_DELIVERY', { extra: { promoCode: 'BIRTA', phone: '+998901234567' } })));
const withPromo = res.filter((x) => x.id).map((x) => psql(`select coalesce("promoCode",'-') from "Order" where id='${x.id}'`)).filter((c) => c === 'BIRTA').length;
log(withPromo === 1 && Number(psql(`select "usedCount" from "PromoCode" where code='BIRTA'`)) === 1, 'Y11: limit 1 — 3 ta parallel buyurtmadan faqat bittasi promoni oldi', res.map((x) => x.http + ':' + (x.code ?? 'ok')));
psql(`update "User" set "loyaltyPoints"=100 where email='customer@test.uz'`);
const coinRes = await Promise.all([1, 2].map(() => order('CASH_ON_DELIVERY', { auth: customer, extra: { redeemCoins: 100 } })));
const bal = coinsOf();
log(bal >= 0 && coinRes.filter((x) => x.http === 200).length >= 1 && !(coinRes.every((x) => x.http === 200) && bal < 0), 'Y11: 100 coin bilan 2 parallel buyurtma — balans manfiy bo‘lmadi', { natija: coinRes.map((x) => x.http + ':' + (x.code ?? 'ok')), balans: bal });
// Coin buyurtma yaratilganda beriladi (O1), shuning uchun birinchi buyurtmadan keyin balans
// oshadi va ikkinchisi HAQIQATAN yetarli bo'lishi mumkin. To'g'ri invariant — hisob daftari:
// 100 + Σberilgan − Σsarflangan = joriy balans (yo'qolgan yozuv yo'q) va balans ≥ 0.
const refs = coinRes.filter((x) => x.number).map((x) => `'${x.number}'`).join(',') || "''";
const net = Number(psql(`select coalesce(sum(points),0) from "LoyaltyTransaction" where reference in (${refs})`));
log(100 + net === bal && bal >= 0, 'Y11: hisob daftari mos (100 + berilgan − sarflangan = balans)', { net, balans: bal });

console.log(fails === 0 ? '\nHAMMASI O‘TDI ✅' : `\n${fails} ta TEST YIQILDI ❌`);
process.exit(fails ? 1 : 0);
