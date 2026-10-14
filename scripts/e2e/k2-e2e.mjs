// K2 e2e: admin status route to'lov holatini hisobga oladimi (lokal DB, test akkauntlar).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const WEB = 'http://localhost:3100';
const ADMIN = 'http://localhost:3001';
const SECRET = 'test_click_secret';
const seed = readFileSync(new URL('../../packages/database/prisma/seed-test-accounts.ts', import.meta.url), 'utf8');
const PW = seed.match(/password: '([^']+)'/)[1];

let fails = 0;
const log = (ok, msg, extra) => {
  console.log(`${ok ? '✅' : '❌'} ${msg}${extra !== undefined ? ' → ' + JSON.stringify(extra) : ''}`);
  if (!ok) fails++;
};
const psql = (sql) =>
  execFileSync(process.env.DOCKER_BIN ?? 'docker', ['exec', 'ecom-postgres', 'psql', '-U', 'postgres', '-d', 'ecommerce', '-tAc', sql], { encoding: 'utf8' }).trim();

// admin login → cookie
const lr = await fetch(`${ADMIN}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ identifier: 'admin@test.uz', password: PW }),
});
const cookie = (lr.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
log(lr.ok && cookie.includes('sb_at='), 'Admin login', lr.status);

const adminGet = (id) => fetch(`${ADMIN}/api/orders/${id}`, { headers: { cookie } }).then((r) => r.json());
const adminPatch = async (id, status) => {
  const r = await fetch(`${ADMIN}/api/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ status }),
  });
  return { http: r.status, body: await r.json() };
};

async function createOrder(provider) {
  const pj = await (await fetch(`${WEB}/api/products?limit=1`)).json();
  const product = (pj.data?.items ?? pj.items)[0];
  const r = await fetch(`${WEB}/api/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 1 }],
      recipientName: 'K2 Test',
      phone: '+998901234567',
      region: 'Toshkent',
      city: 'Toshkent',
      street: 'Test 1',
      deliveryMethod: 'HOME_DELIVERY',
      paymentProvider: provider,
    }),
  });
  const j = await r.json();
  if (!j.success) throw new Error('order create: ' + JSON.stringify(j));
  return { id: j.data.order.id, total: String(Number(j.data.order.grandTotal)) };
}

async function clickPay(order) {
  const tid = 'K2-' + Date.now();
  const sign = (action, prep = '') =>
    createHash('md5').update(tid + 'svc' + SECRET + order.id + prep + order.total + action + 't').digest('hex');
  const post = (p) =>
    fetch(`${WEB}/api/payments/click`, { method: 'POST', body: new URLSearchParams(p) }).then((r) => r.json());
  const base = { click_trans_id: tid, service_id: 'svc', merchant_trans_id: order.id, amount: order.total, sign_time: 't', error: '0' };
  const p = await post({ ...base, action: '0', sign_string: sign('0') });
  return post({ ...base, action: '1', merchant_prepare_id: p.merchant_prepare_id, sign_string: sign('1', p.merchant_prepare_id) });
}

// --- 1. Click, to'lanmagan ---
const click = await createOrder('CLICK');
let d = await adminGet(click.id);
log(JSON.stringify(d.data.allowedNextStatuses) === '["CONFIRMED"]', 'To‘lanmagan Click: menyuda faqat CONFIRMED', d.data.allowedNextStatuses);
let r = await adminPatch(click.id, 'DELIVERED');
log(r.http === 409 && r.body.error?.code === 'PAYMENT_REQUIRED', 'To‘lanmagan Click → DELIVERED rad etiladi (K2)', r.body.error?.code);
r = await adminPatch(click.id, 'PAID');
log(r.http === 409 && r.body.error?.code === 'PAID_NOT_MANUAL', 'PAID ni qo‘lda qo‘yib bo‘lmaydi', r.body.error?.code);
log(psql(`select status||'|'||coalesce("paidAt"::text,'-')||'|'||(select count(*) from "Payment" where "orderId"='${click.id}') from "Order" where id='${click.id}'`) === 'PENDING|-|0', 'Buyurtma o‘zgarmagan: PENDING, paidAt yo‘q, to‘lov yozuvi yo‘q');
r = await adminPatch(click.id, 'CONFIRMED');
log(r.http === 200, 'To‘lanmagan Click → CONFIRMED ruxsat', r.http);

// --- 2. Click to'landi → endi yetkazish mumkin, COD settle bo'lmaydi ---
const paid = await clickPay(click);
log(paid.error === 0, 'Click webhook bilan to‘landi', paid.error);
d = await adminGet(click.id);
log(JSON.stringify(d.data.allowedNextStatuses) === '["PROCESSING","PACKED","SHIPPED","OUT_FOR_DELIVERY","DELIVERED"]', 'To‘langan: PROCESSING…DELIVERED', d.data.allowedNextStatuses);
r = await adminPatch(click.id, 'DELIVERED');
log(r.http === 200 && r.body.data?.codSettled === false, 'To‘langan Click → DELIVERED, codSettled=false', r.body.data);

// --- 3. Naqd (COD) ---
const cod = await createOrder('CASH_ON_DELIVERY');
d = await adminGet(cod.id);
log(d.data.allowedNextStatuses.includes('DELIVERED') && !d.data.allowedNextStatuses.includes('PAID'), 'Naqd: DELIVERED bor, PAID yo‘q', d.data.allowedNextStatuses);
r = await adminPatch(cod.id, 'DELIVERED');
log(r.http === 200 && r.body.data?.codSettled === true, 'Naqd → DELIVERED, codSettled=true', r.body.data);
log(psql(`select o.status||'|'||(o."paidAt" is not null)||'|'||(o."paidTotal"=o."grandTotal")||'|'||p.provider||':'||p.status from "Order" o join "Payment" p on p."orderId"=o.id where o.id='${cod.id}'`) === 'DELIVERED|true|true|CASH_ON_DELIVERY:PAID', 'Bazada: DELIVERED, paidAt va paidTotal yozilgan, COD to‘lovi PAID');

// --- 4. UZCARD (chek tasdiqlanmagan) — yozuvni bazada simulyatsiya qilamiz ---
const uz = await createOrder('CLICK');
psql(`insert into "Payment"(id,"orderId",provider,status,amount,currency,"createdAt","updatedAt") values (gen_random_uuid(),'${uz.id}','UZCARD','PENDING',${uz.total},'UZS',now(),now())`);
d = await adminGet(uz.id);
log(JSON.stringify(d.data.allowedNextStatuses) === '["CONFIRMED"]', 'Tasdiqlanmagan UZCARD: faqat CONFIRMED', d.data.allowedNextStatuses);
r = await adminPatch(uz.id, 'DELIVERED');
log(r.http === 409, 'Tasdiqlanmagan UZCARD → DELIVERED rad etiladi', r.http);
log(psql(`select status from "Payment" where "orderId"='${uz.id}'`) === 'PENDING', 'UZCARD to‘lovi PENDING qoldi (PAID ga o‘tmadi)');

console.log(fails === 0 ? '\nHAMMASI O‘TDI ✅' : `\n${fails} ta TEST YIQILDI ❌`);
process.exit(fails ? 1 : 0);
