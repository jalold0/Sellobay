// K3 e2e: kuryer to'lanmagan / bekor qilingan buyurtmani ololmasligi (lokal DB, test akkauntlar).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const WEB = 'http://localhost:3100';
const SECRET = 'test_click_secret';
const PW = readFileSync(new URL('../../packages/database/prisma/seed-test-accounts.ts', import.meta.url), 'utf8').match(/password: '([^']+)'/)[1];

let fails = 0;
const log = (ok, msg, extra) => {
  console.log(`${ok ? '✅' : '❌'} ${msg}${extra !== undefined ? ' → ' + JSON.stringify(extra) : ''}`);
  if (!ok) fails++;
};
const psql = (sql) =>
  execFileSync(process.env.DOCKER_BIN ?? 'docker', ['exec', 'ecom-postgres', 'psql', '-U', 'postgres', '-d', 'ecommerce', '-tAc', sql], { encoding: 'utf8' }).trim();

async function login(email) {
  const r = await fetch(`${WEB}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: email, email, password: PW }),
  });
  const j = await r.json();
  return j.data.tokens.access;
}
const courier = await login('courier@test.uz');
const customer = await login('customer@test.uz');
const authed = (token) => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' });

async function createOrder(provider, token) {
  const pj = await (await fetch(`${WEB}/api/products?limit=1`)).json();
  const product = (pj.data?.items ?? pj.items)[0];
  const r = await fetch(`${WEB}/api/orders`, {
    method: 'POST',
    headers: token ? authed(token) : { 'content-type': 'application/json' },
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: 1 }],
      recipientName: 'K3 Test',
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
  const id = j.data.order.id;
  const deliveryId = psql(`select id from "Delivery" where "orderId"='${id}' and kind='OUTBOUND'`);
  return { id, total: String(Number(j.data.order.grandTotal)), deliveryId };
}
async function available() {
  const j = await (await fetch(`${WEB}/api/courier/deliveries`, { headers: authed(courier) })).json();
  return (j.data?.available ?? []).map((d) => d.id);
}
async function claim(deliveryId) {
  const r = await fetch(`${WEB}/api/courier/deliveries/${deliveryId}/claim`, { method: 'POST', headers: authed(courier) });
  const j = await r.json();
  return { http: r.status, code: j.error?.code };
}
async function setStatus(deliveryId, status, note) {
  const r = await fetch(`${WEB}/api/courier/deliveries/${deliveryId}/status`, {
    method: 'POST',
    headers: authed(courier),
    body: JSON.stringify({ status, note }),
  });
  const j = await r.json();
  return { http: r.status, code: j.error?.code };
}
async function clickPay(order) {
  const tid = 'K3-' + Date.now();
  const sign = (action, prep = '') =>
    createHash('md5').update(tid + 'svc' + SECRET + order.id + prep + order.total + action + 't').digest('hex');
  const post = (p) => fetch(`${WEB}/api/payments/click`, { method: 'POST', body: new URLSearchParams(p) }).then((r) => r.json());
  const base = { click_trans_id: tid, service_id: 'svc', merchant_trans_id: order.id, amount: order.total, sign_time: 't', error: '0' };
  const p = await post({ ...base, action: '0', sign_string: sign('0') });
  return post({ ...base, action: '1', merchant_prepare_id: p.merchant_prepare_id, sign_string: sign('1', p.merchant_prepare_id) });
}
const cancel = async (orderId) =>
  (await fetch(`${WEB}/api/orders/${orderId}/cancel`, { method: 'POST', headers: authed(customer), body: '{}' })).status;

// 1. To'lanmagan Click
const click = await createOrder('CLICK');
log(!(await available()).includes(click.deliveryId), 'To‘lanmagan Click buyurtmasi kuryer ro‘yxatida YO‘Q');
let r = await claim(click.deliveryId);
log(r.http === 409 && r.code === 'ORDER_NOT_READY', 'To‘lanmagan Click: o‘ziga olish rad etiladi', r);
log(psql(`select coalesce("courierId"::text,'-') from "Delivery" where id='${click.deliveryId}'`) === '-', 'Bazada kuryer biriktirilmagan');

// 2. To'langandan keyin
log((await clickPay(click)).error === 0, 'Click bilan to‘landi');
log((await available()).includes(click.deliveryId), 'To‘langan buyurtma ro‘yxatda paydo bo‘ldi');
r = await claim(click.deliveryId);
log(r.http === 200, 'To‘langan buyurtmani o‘ziga oldi', r);

// 3. Naqd, olingandan keyin mijoz bekor qiladi
const cod = await createOrder('CASH_ON_DELIVERY', customer);
log((await available()).includes(cod.deliveryId), 'Naqd buyurtma ro‘yxatda bor');
r = await claim(cod.deliveryId);
log(r.http === 200, 'Naqd buyurtmani o‘ziga oldi', r);
log((await cancel(cod.id)) === 200, 'Mijoz buyurtmani bekor qildi');
r = await setStatus(cod.deliveryId, 'PICKED_UP');
log(r.http === 409 && r.code === 'ORDER_NOT_READY', 'Bekor qilingan buyurtmani olib ketib bo‘lmaydi', r);
log(psql(`select d.status||'|'||o.status from "Delivery" d join "Order" o on o.id=d."orderId" where d.id='${cod.deliveryId}'`) === 'ASSIGNED|CANCELLED', 'Bazada: yetkazish ASSIGNED, buyurtma CANCELLED (SHIPPED bo‘lmadi)');
r = await setStatus(cod.deliveryId, 'FAILED', 'Buyurtma bekor qilingan');
log(r.http === 200, '«Bajarilmadi» bilan yopish mumkin', r);

// 4. Olinmasdan bekor qilingan naqd
const cod2 = await createOrder('CASH_ON_DELIVERY', customer);
log((await cancel(cod2.id)) === 200, 'Mijoz ikkinchi buyurtmani bekor qildi');
log(!(await available()).includes(cod2.deliveryId), 'Bekor qilingan buyurtma ro‘yxatda YO‘Q');
r = await claim(cod2.deliveryId);
log(r.http === 409 && r.code === 'ORDER_NOT_READY', 'Bekor qilinganini o‘ziga olish rad etiladi', r);

// 5. Qaytarish (RETURN) topshirig'i ta'sirlanmasligi kerak
const ret = await createOrder('CASH_ON_DELIVERY', customer);
psql(`update "Order" set status='RETURNED' where id='${ret.id}'`);
const retDel = psql(`insert into "Delivery"(id,"orderId",kind,status,method,"destinationAddress","createdAt","updatedAt") values (gen_random_uuid(),'${ret.id}','RETURN','ASSIGNED','HOME_DELIVERY','Ombor',now(),now()) returning id`).split('\n')[0];
log((await available()).includes(retDel), 'RETURN topshirig‘i ro‘yxatda bor (qaytarish oqimi buzilmagan)');
r = await claim(retDel);
log(r.http === 200, 'RETURN topshirig‘ini o‘ziga oldi', r);
r = await setStatus(retDel, 'PICKED_UP');
log(r.http === 200, 'RETURN: PICKED_UP ruxsat', r);

console.log(fails === 0 ? '\nHAMMASI O‘TDI ✅' : `\n${fails} ta TEST YIQILDI ❌`);
process.exit(fails ? 1 : 0);
