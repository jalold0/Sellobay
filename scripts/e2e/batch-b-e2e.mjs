// B paket e2e: Y9 (admin bekor qilish), Y10 (kuryer COD), Y6 (qaytarishda zaxira), K4 (muddat).
// Web :3000 (CRON_SECRET=test_cron_secret, CLICK_SECRET_KEY=test_click_secret, CLICK_SERVICE_ID=svc),
// admin :3001, lokal Docker Postgres.
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
  if (!j.data) throw new Error(`login ${email}: ${r.status} ${JSON.stringify(j.error)}`);
  return { cookie: (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; '), token: j.data?.tokens?.access };
}
const bearer = (a) => ({ 'content-type': 'application/json', authorization: `Bearer ${a.token}` });
const customer = await login(WEB, 'customer@test.uz');
const courier = await login(WEB, 'courier@test.uz');
const admin = await login(ADMIN, 'admin@test.uz');
const adminH = { 'content-type': 'application/json', cookie: admin.cookie };

const productId = psql(`select id from "Product" where slug='zara-oversized-shirt'`);
const stockOf = () => Number(psql(`select sum(i."quantityOnHand") from "InventoryItem" i join "ProductVariant" v on v.id=i."variantId" where v."productId"='${productId}'`));
const soldOf = () => Number(psql(`select "soldCount" from "Product" where id='${productId}'`));
const coinsOf = () => Number(psql(`select "loyaltyPoints" from "User" where email='customer@test.uz'`));
const row = (sql) => psql(sql);

async function order(provider, { auth = customer } = {}) {
  const r = await fetch(`${WEB}/api/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(auth ? { authorization: `Bearer ${auth.token}` } : {}) },
    body: JSON.stringify({ items: [{ productId, quantity: 1 }], recipientName: 'B Test', phone: '+998901234567', region: 'Toshkent', city: 'Toshkent', street: 'Test 2', deliveryMethod: 'HOME_DELIVERY', paymentProvider: provider }),
  });
  const j = await r.json();
  if (r.status !== 200) console.log('order fail', r.status, j.error);
  return { http: r.status, id: j.data?.order?.id, number: j.data?.order?.number, total: j.data?.order?.grandTotal };
}
async function click(o, transId, action, prep = '') {
  const amount = String(Number(o.total));
  const sign = createHash('md5').update(transId + 'svc' + 'test_click_secret' + o.id + (action === '1' ? prep : '') + amount + action + 't').digest('hex');
  const p = { click_trans_id: transId, service_id: 'svc', merchant_trans_id: o.id, amount, action, sign_time: 't', sign_string: sign, error: '0' };
  if (action === '1') p.merchant_prepare_id = prep;
  return (await fetch(`${WEB}/api/payments/click`, { method: 'POST', body: new URLSearchParams(p) })).json();
}
async function payClick(o, tag) {
  const prep = (await click(o, `B-${tag}-${RUN}`, '0')).merchant_prepare_id;
  return (await click(o, `B-${tag}-${RUN}`, '1', prep)).error;
}
async function courierStep(deliveryId, status, note) {
  const r = await fetch(`${WEB}/api/courier/deliveries/${deliveryId}/status`, { method: 'POST', headers: bearer(courier), body: JSON.stringify({ status, note }) });
  const j = await r.json();
  return { http: r.status, code: j.error?.code };
}
async function courierDeliver(deliveryId) {
  const c = await fetch(`${WEB}/api/courier/deliveries/${deliveryId}/claim`, { method: 'POST', headers: bearer(courier) });
  const steps = [c.status];
  for (const s of ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']) steps.push((await courierStep(deliveryId, s)).http);
  return steps;
}
const adminCancel = async (id, reason = 'Mijoz telefonda voz kechdi') => {
  const r = await fetch(`${ADMIN}/api/orders/${id}/cancel`, { method: 'POST', headers: adminH, body: JSON.stringify({ reason }) });
  return { http: r.status, ...(await r.json()) };
};
// F3a: kuryer buyurtmani ombor yig'gach oladi — ochiq jo'natmalarni qabul qilamiz.
const warehouseReady = async (orderId) => {
  const ids = row(`select id from "SellerShipment" where "orderId"='${orderId}' and status in ('NEW','ACCEPTED','PACKED')`).split('\n').filter(Boolean);
  for (const id of ids) await fetch(`${ADMIN}/api/shipments/${id}/receive`, { method: 'POST', headers: adminH });
};
const adminDetail = async (id) => (await (await fetch(`${ADMIN}/api/orders/${id}`, { headers: adminH })).json()).data;

// ===== Y9: admin bekor qilish =====
console.log('\n— Y9: admin bekor qilish');
let stock0 = stockOf();
const coins0 = coinsOf();
const paid = await order('CLICK');
log(paid.http === 200 && (await payClick(paid, 'Y9')) === 0, 'Click buyurtma yaratildi va to‘landi', paid.number);
log((await adminDetail(paid.id))?.canCancel === true, 'detal API: canCancel = true (PAID, hali omborda)');
let r = await adminCancel(paid.id, 'x');
log(r.http === 400, 'sababsiz (juda qisqa) — 400', r.http);
r = await adminCancel(paid.id);
log(r.http === 200 && r.data?.refundRequired === true, 'admin bekor qildi, refundRequired = true', r.data);
log(stockOf() === stock0, 'zaxira qaytdi', { oldin: stock0, hozir: stockOf() });
log(coinsOf() === coins0, 'berilgan coin qaytarib olindi', { oldin: coins0, hozir: coinsOf() });
log(row(`select status||'|'||coalesce("cancellationReason",'-') from "Order" where id='${paid.id}'`) === 'CANCELLED|Mijoz telefonda voz kechdi', 'buyurtma CANCELLED, sabab yozildi');
log(row(`select count(*) from "OrderStatusHistory" where "orderId"='${paid.id}' and status='CANCELLED' and "changedBy" is not null and comment like '%qaytarilishi kerak%'`) === '1', 'tarixda admin + "to‘lov qaytarilishi kerak" izohi');
log(row(`select status from "Delivery" where "orderId"='${paid.id}' and kind='OUTBOUND'`) === 'FAILED', 'kuryer topshirig‘i yopildi (FAILED)');
log((await adminDetail(paid.id))?.canCancel === false, 'detal API: endi canCancel = false');
r = await adminCancel(paid.id);
log(r.http === 409, 'ikkinchi bekor qilish — 409', r.error?.code);

const shipped = await order('CLICK');
await payClick(shipped, 'Y9S');
await fetch(`${ADMIN}/api/orders/${shipped.id}/status`, { method: 'PATCH', headers: adminH, body: JSON.stringify({ status: 'SHIPPED' }) });
r = await adminCancel(shipped.id);
log(r.http === 409 && r.error?.code === 'NOT_CANCELLABLE', 'jo‘natilgan (SHIPPED) buyurtmani bekor qilib bo‘lmaydi', r.error?.code);

// ===== Y10: kuryer naqd buyurtmani yetkazdi =====
console.log('\n— Y10: kuryer COD');
stock0 = stockOf();
const sold0 = soldOf();
const cod = await order('CASH_ON_DELIVERY');
await warehouseReady(cod.id);
const codDel = row(`select id from "Delivery" where "orderId"='${cod.id}' and kind='OUTBOUND'`);
const steps = await courierDeliver(codDel);
log(steps.every((s) => s === 200), 'kuryer: olish → yo‘lda → yetkazildi', steps);
log(row(`select status||'|'||("paidAt" is not null)||'|'||("paidTotal"="grandTotal") from "Order" where id='${cod.id}'`) === 'DELIVERED|true|true', 'buyurtma DELIVERED, paidAt va paidTotal yozildi');
log(row(`select status||'|'||("paidAt" is not null) from "Payment" where "orderId"='${cod.id}'`) === 'PAID|true', 'naqd to‘lov PAID');
log(soldOf() === sold0 + 1, 'soldCount +1', { oldin: sold0, hozir: soldOf() });
log(stockOf() === stock0 - 1, 'zaxira −1 (sotildi)');

// ===== Y6: qaytarish — zaxira tovar omborga kelganda =====
console.log('\n— Y6: qaytarish (kuryer orqali)');
stock0 = stockOf();
r = await fetch(`${WEB}/api/orders/${cod.id}/return`, { method: 'POST', headers: bearer(customer), body: JSON.stringify({ reason: 'O‘lchami to‘g‘ri kelmadi' }) });
let j = await r.json();
log(r.status === 200 && j.data?.restockOnReceipt === true, 'mijoz qaytarishni so‘radi', r.status);
log(stockOf() === stock0, 'zaxira HALI qaytmadi (tovar mijozda)', { oldin: stock0, hozir: stockOf() });
log(soldOf() === sold0, 'soldCount qaytdi');
r = await fetch(`${ADMIN}/api/returns/${cod.id}/dispatch`, { method: 'POST', headers: adminH });
j = await r.json();
const retDel = j.data?.deliveryIds?.[0];
log(r.status === 200 && j.data?.created === 1, 'admin kuryerga qaytarish topshirig‘ini ochdi', j.data ?? j.error);
r = await fetch(`${ADMIN}/api/returns/${cod.id}/receive`, { method: 'POST', headers: adminH });
log(r.status === 409, 'topshiriq ochilgan — admin "qabul qilindi" qila olmaydi (409)', r.status);
const retSteps = await courierDeliver(retDel);
log(retSteps.every((s) => s === 200), 'kuryer tovarni mijozdan olib omborga topshirdi', retSteps);
log(stockOf() === stock0 + 1, 'zaxira endi qaytdi (+1)', { oldin: stock0, hozir: stockOf() });
log(row(`select count(*) from "StockMovement" where type='RETURN' and reference='${cod.number}#${retDel}'`) === '1', 'RETURN harakati topshiriq bo‘yicha yozildi');
log(row(`select status from "Order" where id='${cod.id}'`) === 'RETURNED', 'buyurtma RETURNED qoldi');

console.log('\n— Y6: qaytarish (mijoz o‘zi olib keldi) + admin DELIVERED yo‘li');
const cod2 = await order('CASH_ON_DELIVERY');
r = await fetch(`${ADMIN}/api/orders/${cod2.id}/status`, { method: 'PATCH', headers: adminH, body: JSON.stringify({ status: 'DELIVERED' }) });
j = await r.json();
log(r.status === 200 && j.data?.codSettled === true && j.data?.soldCountItems === 1, 'admin DELIVERED: COD PAID + soldCount (umumiy funksiya)', j.data);
log(row(`select status from "Payment" where "orderId"='${cod2.id}'`) === 'PAID', 'naqd to‘lov PAID');
stock0 = stockOf();
await fetch(`${WEB}/api/orders/${cod2.id}/return`, { method: 'POST', headers: bearer(customer), body: '{}' });
log(stockOf() === stock0, 'qaytarish so‘raldi — zaxira hali qaytmadi');
const pending = await (await fetch(`${ADMIN}/api/returns`, { headers: adminH })).json();
log(pending.data?.items?.some((x) => x.id === cod2.id), 'admin "Qaytarishlar" ro‘yxatida ko‘rinadi');
r = await fetch(`${ADMIN}/api/returns/${cod2.id}/receive`, { method: 'POST', headers: adminH });
j = await r.json();
log(r.status === 200 && j.data?.stockRestocked === 1, 'admin "Qabul qilindi" bosdi', j.data ?? j.error);
log(stockOf() === stock0 + 1, 'zaxira qaytdi (+1)');
r = await fetch(`${ADMIN}/api/returns/${cod2.id}/receive`, { method: 'POST', headers: adminH });
log(r.status === 409 && stockOf() === stock0 + 1, 'ikkinchi bosish — 409, zaxira ikki marta qaytmadi', r.status);
const pending2 = await (await fetch(`${ADMIN}/api/returns`, { headers: adminH })).json();
log(!pending2.data?.items?.some((x) => x.id === cod2.id), 'ro‘yxatdan chiqdi');

// ===== K4: to'lanmagan buyurtmalar muddati =====
console.log('\n— K4: to‘lanmagan buyurtmalar');
const expire = (auth) => fetch(`${WEB}/api/internal/orders/expire`, { headers: auth ? { authorization: auth } : {} });
r = await expire(null);
log(r.status === 401, 'sarlavhasiz — 401', r.status);
r = await expire('Bearer wrong-secret');
log(r.status === 401, 'noto‘g‘ri kalit — 401', r.status);

stock0 = stockOf();
const old = await order('CLICK');
const fresh = await order('CLICK');
const oldCod = await order('CASH_ON_DELIVERY');
const rejected = await order('CLICK');
psql(`update "Order" set "placedAt"=now()-interval '13 hours' where id in ('${old.id}','${oldCod.id}','${rejected.id}')`);
psql(`insert into "Payment"(id,"orderId",provider,status,amount,currency,"failedAt","createdAt","updatedAt") values (gen_random_uuid(),'${rejected.id}','UZCARD','FAILED',${Number(rejected.total)},'UZS',now()-interval '2 hours',now(),now())`);
log(stockOf() === stock0 - 4, '4 ta buyurtma yaratildi (zaxira −4)');
r = await expire('Bearer test_cron_secret');
j = await r.json();
const expired = j.data?.expired ?? [];
log(r.status === 200 && expired.includes(old.number), '12 soatdan oshgan to‘lanmagan Click — bekor qilindi', { http: r.status, expired: expired.length });
log(!expired.includes(fresh.number), 'yangi (1 soatdan kam) — tegilmadi');
log(!expired.includes(oldCod.number), 'naqd buyurtma — tegilmadi');
log(!expired.includes(rejected.number), 'chek rad etilganiga 2 soat — tegilmadi (24 soat beriladi)');
log(row(`select status||'|'||coalesce("cancellationReason",'-') from "Order" where id='${old.id}'`).startsWith('CANCELLED|To'), 'buyurtma CANCELLED, sabab yozildi');
log(stockOf() === stock0 - 3, 'bekor qilinganining zaxirasi qaytdi', { kutilgan: stock0 - 3, hozir: stockOf() });
r = await expire('Bearer test_cron_secret');
j = await r.json();
log(!(j.data?.expired ?? []).includes(old.number) && stockOf() === stock0 - 3, 'qayta chaqirish — ikki marta bekor qilmaydi');
// Muddati o'tgandan keyin kelgan Click to'lovi qabul qilinmaydi
const late = await payClick(old, 'K4LATE');
log(late !== 0, 'bekor qilingan buyurtmaga kechikkan Click to‘lovi rad etiladi', late);

// tozalash: test buyurtmalarini qoldirmaymiz (zaxira qaytsin)
for (const o of [fresh, oldCod, rejected]) await adminCancel(o.id, 'e2e tozalash');

console.log(fails === 0 ? '\nHAMMASI O‘TDI ✅' : `\n${fails} ta TEST YIQILDI ❌`);
process.exit(fails ? 1 : 0);
