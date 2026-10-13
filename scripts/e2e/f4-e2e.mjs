// F4 e2e: 3PL «qo'lda» provayder — topshirish, trek, yo'lda, yetkazildi, joyida rad etish,
// kuryer ro'yxatidan chiqarish, qaytgan tovarni qabul qilish. Web :3000, admin :3001.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const WEB = 'http://localhost:3000';
const ADMIN = 'http://localhost:3001';
const SELLER = 'http://localhost:3002';
const PW = readFileSync(new URL('../../packages/database/prisma/seed-test-accounts.ts', import.meta.url), 'utf8').match(/password: '([^']+)'/)[1];
const RUN = Date.now().toString(36).toUpperCase();
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
log(Boolean(customer.token && courier.token && admin.cookie && seller.cookie), 'hamma rol tizimga kirdi');

const cat = psql(`select slug from "Category" where "isActive" limit 1`);
let r = await call(SELLER, '/api/products', seller, 'POST', { nameUz: `F4 kurtka ${RUN}`, sku: `F4-${RUN}`, basePrice: '200000', stock: 30, categorySlug: cat });
const product = r.data?.product?.id ?? r.data?.id;
psql(`update "Product" set status='ACTIVE', "publishedAt"=now() where id='${product}'`);
const stock = () => Number(psql(`select sum(i."quantityOnHand") from "InventoryItem" i join "ProductVariant" v on v.id=i."variantId" where v."productId"='${product}'`));

const order = async (provider = 'CASH_ON_DELIVERY') => {
  const r = await call(WEB, '/api/orders', customer, 'POST', { items: [{ productId: product, quantity: 1 }], recipientName: 'F4 Test', phone: '+998901234567', region: 'Toshkent', city: 'Toshkent', street: 'F4 1', deliveryMethod: 'HOME_DELIVERY', paymentProvider: provider });
  if (r.http !== 200) console.log('   order fail', r.code, r.message);
  return { id: r.data?.order?.id, number: r.data?.order?.number, total: r.data?.order?.grandTotal };
};
const receiveAll = async (id) => {
  for (const sid of psql(`select id from "SellerShipment" where "orderId"='${id}' and status in ('NEW','ACCEPTED','PACKED')`).split('\n').filter(Boolean)) {
    await call(ADMIN, `/api/shipments/${sid}/receive`, admin, 'POST');
  }
};
const status = (id) => psql(`select status from "Order" where id='${id}'`);
const delivery = (id) => psql(`select status||'|'||coalesce(carrier,'-')||'|'||coalesce("trackingNumber",'-')||'|'||coalesce("failureReason",'-') from "Delivery" where "orderId"='${id}' and kind='OUTBOUND'`);
const detail = async (id) => (await call(ADMIN, `/api/orders/${id}`, admin)).data;
async function click(o, transId) {
  const amount = String(Number(o.total));
  const sign = (action, prep) => createHash('md5').update(transId + 'svc' + 'test_click_secret' + o.id + (action === '1' ? prep : '') + amount + action + 't').digest('hex');
  const base = { click_trans_id: transId, service_id: 'svc', merchant_trans_id: o.id, amount, sign_time: 't', error: '0' };
  const p0 = await (await fetch(`${WEB}/api/payments/click`, { method: 'POST', body: new URLSearchParams({ ...base, action: '0', sign_string: sign('0', '') }) })).json();
  await fetch(`${WEB}/api/payments/click`, { method: 'POST', body: new URLSearchParams({ ...base, action: '1', merchant_prepare_id: p0.merchant_prepare_id, sign_string: sign('1', p0.merchant_prepare_id) }) });
}

// ===== 1. Topshirish va yetkazish =====
console.log('\n— 1. 3PL orqali yetkazish');
const o1 = await order();
let d = await detail(o1.id);
log(d?.carrierEvents?.length === 0 && d.carrier === null, 'tovar omborga kelmaguncha 3PL tugmasi yo‘q', d?.carrierEvents);
r = await call(ADMIN, `/api/orders/${o1.id}/carrier`, admin, 'POST', { company: 'Fargo', trackingNumber: `FRG-${RUN}` });
log(r.http === 409, 'yig‘ilmagan buyurtmani 3PL’ga berib bo‘lmaydi', { http: r.http, code: r.code });
await receiveAll(o1.id);
d = await detail(o1.id);
log(status(o1.id) === 'PACKED' && d.carrierEvents.join() === 'HANDED_OVER', 'omborda yig‘ildi — «Kompaniyaga topshirish» chiqdi', d.carrierEvents);
r = await call(ADMIN, `/api/orders/${o1.id}/carrier`, admin, 'POST', { company: 'Fargo', trackingNumber: 'ab' });
log(r.http === 400, 'noto‘g‘ri trek raqami — 400', r.message);
r = await call(ADMIN, `/api/orders/${o1.id}/carrier`, admin, 'POST', { company: 'Fargo', trackingNumber: `FRG-${RUN}` });
log(r.http === 200 && status(o1.id) === 'SHIPPED', '3PL’ga topshirildi — buyurtma «Jo‘natildi»', { http: r.http, s: status(o1.id) });
log(delivery(o1.id) === `PICKED_UP|MANUAL|FRG-${RUN}|-`, 'yetkazish yozuvi: provayder va trek', delivery(o1.id));
log(psql(`select "shippedAt" is not null from "Order" where id='${o1.id}'`) === 't', 'shippedAt yozildi');
r = await call(ADMIN, `/api/orders/${o1.id}/carrier`, admin, 'POST', { company: 'Fargo', trackingNumber: `FRG-${RUN}` });
log(r.http === 409, 'qayta topshirish — 409', r.http);
const delId = psql(`select id from "Delivery" where "orderId"='${o1.id}' and kind='OUTBOUND'`);
r = await call(WEB, `/api/courier/deliveries/${delId}/claim`, courier, 'POST');
log(r.http >= 400, 'o‘z kuryerimiz 3PL yetkazishini ola olmaydi', { http: r.http, code: r.code });
r = await call(WEB, `/api/orders/${o1.id}`, customer);
log(r.data?.order?.tracking?.company === 'Fargo' && r.data.order.tracking.trackingNumber === `FRG-${RUN}`, 'mijoz kompaniya va trek raqamini ko‘radi', r.data?.order?.tracking);
d = await detail(o1.id);
log(d.carrier?.company === 'Fargo' && d.carrierEvents.join() === 'OUT_FOR_DELIVERY,DELIVERED,REFUSED', 'admin: keyingi hodisalar', d.carrierEvents);
r = await call(ADMIN, `/api/orders/${o1.id}/carrier/event`, admin, 'POST', { event: 'OUT_FOR_DELIVERY' });
log(r.http === 200 && status(o1.id) === 'OUT_FOR_DELIVERY', '«Yetkazilmoqda»', status(o1.id));
r = await call(ADMIN, `/api/orders/${o1.id}/carrier/event`, admin, 'POST', { event: 'OUT_FOR_DELIVERY' });
log(r.http === 409, 'takroriy hodisa — 409', r.http);
r = await call(ADMIN, `/api/orders/${o1.id}/carrier/event`, admin, 'POST', { event: 'DELIVERED' });
log(r.http === 200 && status(o1.id) === 'DELIVERED' && delivery(o1.id).startsWith('DELIVERED|'), '«Yetkazildi» — buyurtma va yetkazish yopildi', { s: status(o1.id), d: delivery(o1.id) });
log(psql(`select status from "Payment" where "orderId"='${o1.id}'`) === 'PAID', 'naqd to‘lov olindi deb yozildi');
log(psql(`select count(*) from "SellerLedgerEntry" where "orderId"='${o1.id}' and type='SALE'`) === '1', 'sotuvchi daftariga sotuv tushdi');
log(psql(`select count(*) from "AuditLog" where action='order.carrier' and "resourceId"='${o1.id}'`) === '3', 'har hodisa jurnalda');

// ===== 2. Joyida rad etish (naqd) =====
console.log('\n— 2. Mijoz topshirishda rad etdi (naqd)');
const s0 = stock();
const o2 = await order();
await receiveAll(o2.id);
await call(ADMIN, `/api/orders/${o2.id}/carrier`, admin, 'POST', { company: 'BTS', trackingNumber: `BTS-${RUN}` });
r = await call(ADMIN, `/api/orders/${o2.id}/carrier/event`, admin, 'POST', { event: 'REFUSED' });
log(r.http === 400, 'sababsiz rad etish — 400', r.message);
r = await call(ADMIN, `/api/orders/${o2.id}/carrier/event`, admin, 'POST', { event: 'REFUSED', note: 'Rangi mos kelmadi' });
log(r.http === 200 && status(o2.id) === 'RETURNED', 'buyurtma «Qaytarildi»', status(o2.id));
log(delivery(o2.id) === `FAILED|MANUAL|BTS-${RUN}|Rangi mos kelmadi`, 'yetkazish — muvaffaqiyatsiz, sabab yozildi', delivery(o2.id));
log(psql(`select status from "Payment" where "orderId"='${o2.id}'`) === 'CANCELLED', 'naqd to‘lov yopildi (pul olinmadi)');
log(psql(`select count(*) from "SellerLedgerEntry" where "orderId"='${o2.id}'`) === '0', 'sotuvchiga sotuv yozilmadi');
log(stock() === s0 - 1, 'zaxira HALI qaytmadi (tovar 3PL’da)', { oldin: s0, hozir: stock() });
r = await call(ADMIN, '/api/returns', admin);
log((r.data?.items ?? []).some((x) => x.id === o2.id), '«Qaytarishlar» ro‘yxatida', (r.data?.items ?? []).length);
r = await call(ADMIN, `/api/returns/${o2.id}/receive`, admin, 'POST');
log(r.http === 200 && stock() === s0, 'tovar omborga qaytdi — zaxira tiklandi', { http: r.http, stock: stock() });

// ===== 3. Joyida rad etish (oldindan to'langan) =====
console.log('\n— 3. Rad etish (Click bilan to‘langan)');
const o3 = await order('CLICK');
await click(o3, `F4-${RUN}`);
await receiveAll(o3.id);
await call(ADMIN, `/api/orders/${o3.id}/carrier`, admin, 'POST', { company: 'Fargo', trackingNumber: `FRG-${RUN}-3` });
await call(ADMIN, `/api/orders/${o3.id}/carrier/event`, admin, 'POST', { event: 'REFUSED', note: 'O‘lchami katta' });
d = await detail(o3.id);
log(status(o3.id) === 'RETURNED' && d.refund?.remaining === Number(o3.total).toFixed(2), 'pul qaytarish navbatida — to‘liq summa', d.refund);
r = await call(ADMIN, `/api/orders/${o3.id}/refund`, admin, 'POST', { amount: d.refund.remaining, method: 'GATEWAY' });
log(r.http === 200 && status(o3.id) === 'REFUNDED', 'pul qaytarildi', { http: r.http, s: status(o3.id) });
r = await call(ADMIN, '/api/returns', admin);
log((r.data?.items ?? []).some((x) => x.id === o3.id), 'pul oldin qaytsa ham tovar qabul ro‘yxatida qoladi', (r.data?.items ?? []).length);
r = await call(ADMIN, `/api/returns/${o3.id}/receive`, admin, 'POST');
log(r.http === 200, 'tovar qabul qilindi', r.http);

console.log(`\n${fails === 0 ? 'HAMMASI O‘TDI' : `${fails} ta XATO`}`);
process.exit(fails ? 1 : 0);
