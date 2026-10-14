// K7 e2e: UZCARD to'lovini tasdiqlashda admin chekdagi summani kiritishi shart va u tekshiriladi.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const WEB = 'http://localhost:3100';
const ADMIN = 'http://localhost:3001';
const PW = readFileSync(new URL('../../packages/database/prisma/seed-test-accounts.ts', import.meta.url), 'utf8').match(/password: '([^']+)'/)[1];

let fails = 0;
const log = (ok, msg, extra) => {
  console.log(`${ok ? '✅' : '❌'} ${msg}${extra !== undefined ? ' → ' + JSON.stringify(extra) : ''}`);
  if (!ok) fails++;
};
const psql = (sql) =>
  execFileSync(process.env.DOCKER_BIN ?? 'docker', ['exec', 'ecom-postgres', 'psql', '-U', 'postgres', '-d', 'ecommerce', '-tAc', sql], { encoding: 'utf8' }).trim();

const lr = await fetch(`${ADMIN}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ identifier: 'admin@test.uz', password: PW }),
});
const cookie = (lr.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
log(lr.ok, 'Admin login', lr.status);
const adminId = psql(`select id from "User" where email='admin@test.uz'`);

// UZCARD buyurtmasi: web API'da buyurtma (chek yuklash Blob talab qiladi), keyin UZCARD to'lov
// yozuvini xuddi checkout yozgandek (PENDING, MANUAL_CARD payload) qo'shamiz.
async function uzcardOrder() {
  const pj = await (await fetch(`${WEB}/api/products?limit=1`)).json();
  const product = (pj.data?.items ?? pj.items)[0];
  const r = await fetch(`${WEB}/api/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 1 }],
      recipientName: 'K7 Test',
      phone: '+998901234567',
      region: 'Toshkent',
      city: 'Toshkent',
      street: 'Test 1',
      deliveryMethod: 'HOME_DELIVERY',
      paymentProvider: 'CLICK',
    }),
  });
  const j = await r.json();
  const id = j.data.order.id;
  const total = psql(`select "grandTotal" from "Order" where id='${id}'`);
  psql(`insert into "Payment"(id,"orderId",provider,status,amount,currency,"rawPayload","createdAt","updatedAt") values (gen_random_uuid(),'${id}','UZCARD','PENDING',${total},'UZS','{"kind":"MANUAL_CARD","receiptPath":"receipts/k7-test.jpg","note":null}'::jsonb,now(),now())`);
  return { id, total: total.replace(/\.00$/, '') };
}
const verify = async (orderId, body) => {
  const r = await fetch(`${ADMIN}/api/orders/${orderId}/payment`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ action: 'verify', ...body }),
  });
  const j = await r.json();
  return { http: r.status, code: j.error?.code, message: j.error?.message };
};
const payStatus = (orderId) => psql(`select status from "Payment" where "orderId"='${orderId}' and provider='UZCARD'`);

const o = await uzcardOrder();
console.log(`Buyurtma ${o.id}, summa ${o.total}`);

let r = await verify(o.id, {});
log(r.http === 400 && r.code === 'RECEIVED_AMOUNT_REQUIRED', 'Summasiz tasdiqlash rad etiladi (K7)', r.code);
log(payStatus(o.id) === 'PENDING', 'To‘lov PENDING qoldi');

r = await verify(o.id, { receivedAmount: String(Number(o.total) - 50000) });
log(r.http === 409 && r.code === 'RECEIVED_AMOUNT_MISMATCH' && /50000 so'm kam/.test(r.message), 'Kam summa → 409, “50000 so‘m kam”', r.message);
r = await verify(o.id, { receivedAmount: String(Number(o.total) + 1000) });
log(r.http === 409 && /1000 so'm ko'p/.test(r.message), 'Ko‘p summa → 409, “1000 so‘m ko‘p”', r.message);
r = await verify(o.id, { receivedAmount: 'abc' });
log(r.http === 400 && r.code === 'VALIDATION', 'Raqam emas → 400', r.code);
log(payStatus(o.id) === 'PENDING', 'Noto‘g‘ri urinishlardan keyin ham to‘lov PENDING');

r = await verify(o.id, { receivedAmount: o.total });
log(r.http === 200, 'To‘g‘ri summa → tasdiqlandi', r);
const row = psql(`select p.status||'|'||(p."rawPayload"->'verification'->>'receivedAmount')||'|'||(p."rawPayload"->'verification'->>'verifiedBy')||'|'||(p."rawPayload"->>'receiptPath')||'|'||o.status||'|'||o."paidTotal" from "Payment" p join "Order" o on o.id=p."orderId" where o.id='${o.id}' and p.provider='UZCARD'`);
const [ps, recv, by, receipt, os, paidTotal] = row.split('|');
log(ps === 'PAID' && os === 'PAID', 'Bazada: to‘lov va buyurtma PAID', { ps, os });
log(recv === o.total && by === adminId, 'Kim va qancha deb tasdiqlagani saqlandi', { recv, byAdmin: by === adminId });
log(receipt === 'receipts/k7-test.jpg', 'Chek yo‘li (asl payload) saqlanib qoldi', receipt);
log(Number(paidTotal) === Number(o.total), 'paidTotal = chekdagi summa', paidTotal);
const hist = psql(`select comment from "OrderStatusHistory" where "orderId"='${o.id}' and status='PAID' order by "changedAt" desc limit 1`);
log(hist.includes(o.total), 'Tarix izohida summa bor', hist);

console.log(fails === 0 ? '\nHAMMASI O‘TDI ✅' : `\n${fails} ta TEST YIQILDI ❌`);
process.exit(fails ? 1 : 0);
