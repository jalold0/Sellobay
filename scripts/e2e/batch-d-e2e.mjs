// D paket e2e: K5 — pulni qaytarishni qayd etish. Web :3000, admin :3001.
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
const customer = await login(WEB, 'customer@test.uz');
const admin = await login(ADMIN, 'admin@test.uz');
const adminH = { 'content-type': 'application/json', cookie: admin.cookie };
const productId = psql(`select id from "Product" where slug='zara-oversized-shirt'`);

async function order(provider) {
  const r = await fetch(`${WEB}/api/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${customer.token}` },
    body: JSON.stringify({ items: [{ productId, quantity: 1 }], recipientName: 'D Test', phone: '+998901234567', region: 'Toshkent', city: 'Toshkent', street: 'D 1', deliveryMethod: 'HOME_DELIVERY', paymentProvider: provider }),
  });
  const j = await r.json();
  return { id: j.data?.order?.id, number: j.data?.order?.number, total: j.data?.order?.grandTotal };
}
async function click(o, transId, action, prep = '') {
  const amount = String(Number(o.total));
  const sign = createHash('md5').update(transId + 'svc' + 'test_click_secret' + o.id + (action === '1' ? prep : '') + amount + action + 't').digest('hex');
  const p = { click_trans_id: transId, service_id: 'svc', merchant_trans_id: o.id, amount, action, sign_time: 't', sign_string: sign, error: '0' };
  if (action === '1') p.merchant_prepare_id = prep;
  return (await fetch(`${WEB}/api/payments/click`, { method: 'POST', body: new URLSearchParams(p) })).json();
}
const detail = async (id) => (await (await fetch(`${ADMIN}/api/orders/${id}`, { headers: adminH })).json()).data;
const refund = async (id, body) => {
  const r = await fetch(`${ADMIN}/api/orders/${id}/refund`, { method: 'POST', headers: adminH, body: JSON.stringify(body) });
  const j = await r.json();
  return { http: r.status, data: j.data, code: j.error?.code, message: j.error?.message };
};
const pending = async () => (await (await fetch(`${ADMIN}/api/refunds`, { headers: adminH })).json()).data?.items ?? [];

// To'langan Click buyurtma → admin bekor qiladi → qaytarilishi kerak
const o = await order('CLICK');
const prep = (await click(o, `D-${RUN}`, '0')).merchant_prepare_id;
log((await click(o, `D-${RUN}`, '1', prep)).error === 0, 'Click buyurtma to‘landi', o.number);
let d = await detail(o.id);
log(d?.refund?.remaining === '0.00', 'faol to‘langan buyurtmada qaytarish yo‘q', d?.refund);
let r = await refund(o.id, { amount: '1000', method: 'GATEWAY' });
log(r.http === 409 && r.code === 'NOT_REFUNDABLE', 'faol buyurtmaga qaytarish qayd etilmaydi', r.code);
await fetch(`${ADMIN}/api/orders/${o.id}/cancel`, { method: 'POST', headers: adminH, body: JSON.stringify({ reason: 'Mijoz voz kechdi' }) });
const total = Number(o.total).toFixed(2);
d = await detail(o.id);
log(d?.refund?.remaining === total, 'bekor qilingach — butun summa qaytarilishi kerak', d?.refund);
log((await pending()).some((x) => x.id === o.id && x.remaining === total), '«Pul qaytarilishi kerak» navbatida');

r = await refund(o.id, { amount: 'abc', method: 'GATEWAY' });
log(r.http === 400, 'noto‘g‘ri summa — 400', r.http);
r = await refund(o.id, { amount: String(Number(o.total) + 1), method: 'GATEWAY' });
log(r.http === 409 && r.code === 'EXCEEDS_REMAINING', 'qoldiqdan ko‘p — rad', r.message);
r = await refund(o.id, { amount: '100000', method: 'GATEWAY', reference: `CLK-${RUN}`, note: 'Birinchi qism' });
log(r.http === 200 && r.data?.fullyRefunded === false && r.data?.refundedTotal === '100000.00', 'qisman qaytarish qayd etildi', r.data);
log(psql(`select status||'|'||"refundedTotal" from "Order" where id='${o.id}'`) === 'CANCELLED|100000.00', 'buyurtma CANCELLED, refundedTotal = 100000');
log(psql(`select status from "Payment" where "orderId"='${o.id}' and provider='CLICK'`) === 'PARTIALLY_REFUNDED', 'to‘lov PARTIALLY_REFUNDED');
const rest = (Number(o.total) - 100000).toFixed(2);
// Parallel ikki admin qolganini qaytarsa — faqat bittasi o'tadi
const both = await Promise.all([1, 2].map(() => refund(o.id, { amount: rest, method: 'GATEWAY' })));
log(both.filter((x) => x.http === 200).length === 1 && both.some((x) => x.code === 'NOT_REFUNDABLE'), 'parallel ikki qaytarish — ikki marta yozilmadi', both.map((x) => x.http + ':' + (x.code ?? 'ok')));
log(psql(`select status||'|'||"refundedTotal" from "Order" where id='${o.id}'`) === `REFUNDED|${total}`, 'to‘liq qaytdi — buyurtma REFUNDED');
log(psql(`select status||'|'||("refundedAt" is not null) from "Payment" where "orderId"='${o.id}' and provider='CLICK'`) === 'REFUNDED|true', 'to‘lov REFUNDED, refundedAt yozildi');
log(!(await pending()).some((x) => x.id === o.id), 'navbatdan chiqdi');
d = await detail(o.id);
log(d?.refund?.remaining === '0.00' && d?.status === 'REFUNDED', 'detal: qaytariladigan pul yo‘q');
log(psql(`select count(*) from "AuditLog" where action='order.refund' and "resourceId"='${o.id}'`) === '2', 'jurnalda 2 ta qaytarish yozuvi');
log(psql(`select count(*) from "OrderStatusHistory" where "orderId"='${o.id}' and comment like 'Pul%qaytarildi%'`) === '2', 'buyurtma tarixida 2 ta izoh');

// To'lanmagan bekor qilingan buyurtma — qaytariladigan pul yo'q
const cod = await order('CASH_ON_DELIVERY');
await fetch(`${ADMIN}/api/orders/${cod.id}/cancel`, { method: 'POST', headers: adminH, body: JSON.stringify({ reason: 'Test' }) });
r = await refund(cod.id, { amount: '1000', method: 'CASH' });
log(r.http === 409 && r.code === 'NOT_REFUNDABLE', 'to‘lanmagan buyurtmaga qaytarish yo‘q', r.code);

// Yetkazilgan naqd buyurtma qaytarildi → naqd qaytarish
const cod2 = await order('CASH_ON_DELIVERY');
await fetch(`${ADMIN}/api/orders/${cod2.id}/status`, { method: 'PATCH', headers: adminH, body: JSON.stringify({ status: 'DELIVERED' }) });
await fetch(`${WEB}/api/orders/${cod2.id}/return`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${customer.token}` }, body: '{}' });
d = await detail(cod2.id);
log(d?.refund?.remaining === Number(cod2.total).toFixed(2), 'qaytarilgan naqd buyurtma — qaytarilishi kerak', d?.refund);
r = await refund(cod2.id, { amount: d?.refund?.remaining, method: 'CASH' });
log(r.http === 200 && r.data?.status === 'REFUNDED', 'naqd qaytarish qayd etildi → REFUNDED', r.data);
// Pul tovar kelishidan OLDIN qaytarildi — tovar baribir qabul qilinishi va zaxira qaytishi kerak
const stockOf = () => Number(psql(`select sum(i."quantityOnHand") from "InventoryItem" i join "ProductVariant" v on v.id=i."variantId" where v."productId"='${productId}'`));
const pr = (await (await fetch(`${ADMIN}/api/returns`, { headers: adminH })).json()).data?.items ?? [];
log(pr.some((x) => x.id === cod2.id), 'pul qaytarilgan, tovar hali kelmagan buyurtma «Qaytarishlar» ro‘yxatida qoladi');
const s0 = stockOf();
const rcv = await fetch(`${ADMIN}/api/returns/${cod2.id}/receive`, { method: 'POST', headers: adminH });
log(rcv.status === 200 && stockOf() === s0 + 1, 'REFUNDED bo‘lsa ham tovar qabul qilindi, zaxira +1', rcv.status);
log(psql(`select status from "Order" where id='${cod2.id}'`) === 'REFUNDED', 'buyurtma REFUNDED holatida qoldi');
// Bekor qilingan + pul qaytarilgan (yetkazilmagan) buyurtma qaytarish oqimiga kirmaydi
const rc = await fetch(`${ADMIN}/api/returns/${o.id}/receive`, { method: 'POST', headers: adminH });
log(rc.status === 409, 'bekor qilingan buyurtmani «qabul qilib» bo‘lmaydi', rc.status);

console.log(fails === 0 ? '\nHAMMASI O‘TDI ✅' : `\n${fails} ta TEST YIQILDI ❌`);
process.exit(fails ? 1 : 0);
