// K8 e2e: global buyurtma to'lanmaguncha operator Xitoydan sotib ololmaydi.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const WEB = 'http://localhost:3000';
const ADMIN = 'http://localhost:3001';
const PW = readFileSync(new URL('../../packages/database/prisma/seed-test-accounts.ts', import.meta.url), 'utf8').match(/password: '([^']+)'/)[1];
let fails = 0;
const log = (ok, msg, extra) => { console.log(`${ok ? '✅' : '❌'} ${msg}${extra !== undefined ? ' → ' + JSON.stringify(extra) : ''}`); if (!ok) fails++; };
const psql = (sql) => execFileSync(process.env.DOCKER_BIN ?? 'docker', ['exec', 'ecom-postgres', 'psql', '-U', 'postgres', '-d', 'ecommerce', '-tAc', sql], { encoding: 'utf8' }).trim();
const login = async (base, email) => { const r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: email, email, password: PW }) }); const j = await r.json(); return { cookie: (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; '), token: j.data?.tokens?.access }; };

const customer = await login(WEB, 'customer@test.uz');
const admin = await login(ADMIN, 'admin@test.uz');
const productId = psql(`select p.id from "Product" p join "GlobalSource" g on g."productId"=p.id where g."externalItemId"='444555666777'`);
const r = await fetch(`${WEB}/api/orders`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${customer.token}` }, body: JSON.stringify({ items: [{ productId, quantity: 1 }], recipientName: 'K8 Test', phone: '+998901234567', region: 'Toshkent', city: 'Toshkent', street: 'Test 1', deliveryMethod: 'HOME_DELIVERY', paymentProvider: 'CLICK' }) });
const o = (await r.json()).data?.order;
log(r.status === 200 && o?.id, 'Global buyurtma Click bilan yaratildi', r.status);
const gfId = psql(`select id from "GlobalFulfillment" where "orderId"='${o.id}'`);
psql(`update "GlobalFulfillment" set status='CONFIRMED' where id='${gfId}'`);
const purchase = async () => { const x = await fetch(`${ADMIN}/api/global/fulfillment/${gfId}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: admin.cookie }, body: JSON.stringify({ action: 'PURCHASE', purchaseRef: 'TB-K8-' + Date.now() }) }); return { http: x.status, code: (await x.json()).error?.code }; };
let p = await purchase();
log(p.http === 409 && p.code === 'NOT_PAID', 'K8: to‘lanmagan global buyurtmani sotib olib bo‘lmaydi', p);
log(psql(`select status from "GlobalFulfillment" where id='${gfId}'`) === 'CONFIRMED', 'K8: zayavka CONFIRMED qoldi');
const amount = String(Number(o.grandTotal));
const tid = 'K8-' + Date.now();
const sign = (a, prep = '') => createHash('md5').update(tid + 'svc' + 'test_click_secret' + o.id + prep + amount + a + 't').digest('hex');
const post = (x) => fetch(`${WEB}/api/payments/click`, { method: 'POST', body: new URLSearchParams(x) }).then((y) => y.json());
const base = { click_trans_id: tid, service_id: 'svc', merchant_trans_id: o.id, amount, sign_time: 't', error: '0' };
const pr = await post({ ...base, action: '0', sign_string: sign('0') });
const cp = await post({ ...base, action: '1', merchant_prepare_id: pr.merchant_prepare_id, sign_string: sign('1', pr.merchant_prepare_id) });
log(cp.error === 0, 'Click bilan to‘landi', cp.error);
p = await purchase();
log(p.http === 200, 'K8: to‘langandan keyin sotib olish ruxsat', p);
console.log(fails === 0 ? '\nHAMMASI O‘TDI ✅' : `\n${fails} ta TEST YIQILDI ❌`);
process.exit(fails ? 1 : 0);
