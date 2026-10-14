// F3a e2e: sotuvchi jo'natmalari (FBS/FBO), ombor qabuli, konsolidatsiya, kuryer sharti,
// bekor qilish, FBO inventar, marketplace tariflari. Web :3000, admin :3001, seller :3002.
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
log(Boolean(customer.token && courier.token && admin.cookie && seller.cookie), 'hamma rol tizimga kirdi');

const pid = (slug) => psql(`select id from "Product" where slug='${slug}'`);
const testShopId = psql(`select s.id from "Seller" s join "User" u on u.id=s."ownerUserId" where u.email='seller@test.uz'`);
const nikeId = psql(`select id from "Seller" where "brandName"='Nike Store'`);
// Test Shop'ning faol, zaxirasi bor tovari — har yugurishda yangisi (zaxira tugab qolmasin).
const cat = psql(`select slug from "Category" where "isActive" limit 1`);
let r = await call(SELLER, '/api/products', seller, 'POST', { nameUz: `F3a futbolka ${RUN}`, sku: `F3A-${RUN}`, basePrice: '120000', stock: 50, categorySlug: cat });
const shopProduct = r.data?.product?.id ?? r.data?.id;
psql(`update "Product" set status='ACTIVE', "publishedAt"=now() where id='${shopProduct}'`);
const nikeProduct = pid('zara-oversized-shirt');
const platformSlug = psql(`select p.slug from "Product" p join "ProductVariant" v on v."productId"=p.id join "InventoryItem" i on i."variantId"=v.id where p."sellerId" is null and p.status='ACTIVE' and p."deletedAt" is null and i."quantityOnHand"-i."quantityReserved">2 limit 1`);
const platformProduct = platformSlug ? pid(platformSlug) : null;
log(Boolean(shopProduct && nikeProduct), 'test tovarlari tayyor', { shopProduct: Boolean(shopProduct), platform: platformSlug || null });

const order = async (provider, items) => {
  const r = await call(WEB, '/api/orders', customer, 'POST', { items, recipientName: 'F3a Test', phone: '+998901234567', region: 'Toshkent', city: 'Toshkent', street: 'F3a 1', deliveryMethod: 'HOME_DELIVERY', paymentProvider: provider });
  if (r.http !== 200) console.log('   order fail', r.http, r.code, r.message);
  return { http: r.http, id: r.data?.order?.id, number: r.data?.order?.number, total: r.data?.order?.grandTotal };
};
const shipments = (orderId) =>
  psql(`select coalesce("sellerId"::text,'platform')||':'||"fulfillmentModel"||':'||status from "SellerShipment" where "orderId"='${orderId}' order by "createdAt", "fulfillmentModel"`).split('\n').filter(Boolean);
const shipmentId = (orderId, sellerId) =>
  psql(`select id from "SellerShipment" where "orderId"='${orderId}' and ${sellerId ? `"sellerId"='${sellerId}'` : '"sellerId" is null'}`);
const orderStatus = (id) => psql(`select status from "Order" where id='${id}'`);
const outbound = (orderId) => psql(`select id from "Delivery" where "orderId"='${orderId}' and kind='OUTBOUND'`);

async function click(o, transId) {
  const amount = String(Number(o.total));
  const sign = (action, prep) => createHash('md5').update(transId + 'svc' + 'test_click_secret' + o.id + (action === '1' ? prep : '') + amount + action + 't').digest('hex');
  const base = { click_trans_id: transId, service_id: 'svc', merchant_trans_id: o.id, amount, sign_time: 't', error: '0' };
  const p0 = await (await fetch(`${WEB}/api/payments/click`, { method: 'POST', body: new URLSearchParams({ ...base, action: '0', sign_string: sign('0', '') }) })).json();
  const prep = p0.merchant_prepare_id;
  return (await fetch(`${WEB}/api/payments/click`, { method: 'POST', body: new URLSearchParams({ ...base, action: '1', merchant_prepare_id: prep, sign_string: sign('1', prep) }) })).json();
}

// ===== 1. Ikki sotuvchi, naqd — konsolidatsiya =====
console.log('\n— 1. Ikki sotuvchi (FBS + FBS), naqd');
const o1 = await order('CASH_ON_DELIVERY', [{ productId: shopProduct, quantity: 1 }, { productId: nikeProduct, quantity: 1 }]);
let sh = shipments(o1.id);
const nikeModel = psql(`select "fulfillmentModel" from "Product" where id='${nikeProduct}'`);
log(o1.http === 200 && sh.length === 2 && sh.includes(`${testShopId}:FBS:NEW`) && sh.includes(`${nikeId}:${nikeModel}:NEW`), 'naqd buyurtma — darhol har sotuvchiga o‘z modelida jo‘natma', sh);
log(psql(`select count(*) from "OrderItem" where "orderId"='${o1.id}' and "sellerShipmentId" is null`) === '0', 'har satr o‘z jo‘natmasiga bog‘landi');
const hrs = Number(psql(`select round(extract(epoch from ("deadlineAt"-now()))/3600) from "SellerShipment" where "orderId"='${o1.id}' limit 1`));
log(hrs >= 47 && hrs <= 48, 'FBS topshirish muddati ≈ 48 soat', hrs);

r = await call(WEB, `/api/courier/deliveries/${outbound(o1.id)}/claim`, courier, 'POST');
log(r.http >= 400, 'tovar omborga kelmaguncha kuryer ola olmaydi', { http: r.http, code: r.code });
r = await call(ADMIN, `/api/orders/${o1.id}/status`, admin, 'PATCH', { status: 'PACKED' });
log(r.http === 409 && r.code === 'SELLER_SHIPMENTS_OPEN', 'admin «Qadoqlandi» qila olmaydi — FBS tovari kelmagan', { http: r.http, code: r.code });

r = await call(SELLER, '/api/orders', seller);
const so = (r.data?.items ?? []).find((x) => x.id === o1.id);
log(so && so.shipments.length === 1 && so.items.length === 1, 'sotuvchi faqat o‘z qismini ko‘radi', so && { sh: so.shipments.length, items: so.items.length });
log(so && !('customer' in so) && !('address' in so), 'sotuvchiga mijoz telefoni/manzili berilmaydi');
const s1 = shipmentId(o1.id, testShopId);
const sNike = shipmentId(o1.id, nikeId);
r = await call(SELLER, `/api/shipments/${sNike}`, seller, 'POST', { action: 'accept' });
log(r.http === 404, 'begona sotuvchi jo‘natmasiga tegib bo‘lmaydi', r.http);
r = await call(SELLER, `/api/shipments/${s1}`, seller, 'POST', { action: 'accept' });
log(r.http === 200 && r.data?.shipment?.status === 'ACCEPTED', 'sotuvchi qabul qildi', r.data);
r = await call(SELLER, `/api/shipments/${s1}`, seller, 'POST', { action: 'pack' });
log(r.http === 200 && r.data?.shipment?.status === 'PACKED', 'sotuvchi qadoqladi', r.data);
r = await call(SELLER, `/api/shipments/${s1}`, seller, 'POST', { action: 'pack' });
log(r.http === 409, 'qayta qadoqlash — 409', r.http);

r = await call(ADMIN, '/api/shipments', admin);
const inbound = (r.data?.items ?? []).filter((x) => x.order.id === o1.id);
log(inbound.length === 2, '«Ombor qabuli» ro‘yxatida ikkala jo‘natma', inbound.map((x) => x.status));
r = await call(ADMIN, `/api/shipments/${s1}/receive`, admin, 'POST');
log(r.http === 200 && r.data?.orderReady === false, 'Test Shop qabul qilindi — Nike hali kutilmoqda', r.data);
log(orderStatus(o1.id) !== 'PACKED', 'buyurtma hali «Qadoqlandi» emas', orderStatus(o1.id));
r = await call(ADMIN, `/api/shipments/${sNike}/receive`, admin, 'POST');
log(r.http === 200 && r.data?.orderReady && r.data?.orderPacked, 'Nike tovari qo‘lda keldi (panelda bosilmagan) — qabul qilindi, buyurtma tayyor', r.data);
log(orderStatus(o1.id) === 'PACKED', 'buyurtma avtomatik «Qadoqlandi»', orderStatus(o1.id));
log(psql(`select count(*) from "OrderStatusHistory" where "orderId"='${o1.id}' and status='PACKED' and comment like 'Barcha tovarlar omborda%'`) === '1', 'tarixga bitta yozuv');
log(psql(`select count(*) from "AuditLog" where action='shipment.receive' and "resourceId" in ('${s1}','${sNike}')`) === '2', 'ombor qabuli jurnalga yozildi');
r = await call(ADMIN, `/api/shipments/${sNike}/receive`, admin, 'POST');
log(r.http === 409, 'qayta qabul — 409', r.http);
r = await call(WEB, `/api/courier/deliveries/${outbound(o1.id)}/claim`, courier, 'POST');
log(r.http === 200, 'endi kuryer oldi', { http: r.http, code: r.code });

// ===== 2. Click (oldindan to'lov) + platforma tovari =====
console.log('\n— 2. Click: to‘lovdan keyin jo‘natma; FBO + FBS');
const items2 = [{ productId: shopProduct, quantity: 1 }, ...(platformProduct ? [{ productId: platformProduct, quantity: 1 }] : [])];
const o2 = await order('CLICK', items2);
log(o2.http === 200 && shipments(o2.id).length === 0, 'to‘lovgacha jo‘natma yo‘q (sotuvchi to‘lanmaganni qadoqlamaydi)', shipments(o2.id));
await click(o2, `F3A-${RUN}`);
sh = shipments(o2.id);
log(orderStatus(o2.id) === 'PAID' && sh.length === items2.length, 'Click to‘lovidan keyin jo‘natmalar ochildi', sh);
if (platformProduct) {
  log(sh.includes('platform:FBO:NEW'), 'platformaning o‘z tovari — FBO (ombor yig‘adi)', sh);
  r = await call(ADMIN, `/api/orders/${o2.id}/status`, admin, 'PATCH', { status: 'PACKED' });
  log(r.http === 409, 'FBS kelmagan — admin hali qadoqlay olmaydi', r.code);
  log(shipments(o2.id).includes('platform:FBO:NEW'), '409 da FBO belgisi ham qaytarildi (tranzaksiya)');
}
await click(o2, `F3A-${RUN}`); // takroriy callback
log(shipments(o2.id).length === items2.length, 'takroriy Click callback — jo‘natma ikkilanmadi');
r = await call(ADMIN, `/api/shipments/${shipmentId(o2.id, testShopId)}/receive`, admin, 'POST');
log(r.http === 200 && r.data?.orderReady === !platformProduct, 'FBS qabul qilindi', r.data);
if (platformProduct) {
  r = await call(ADMIN, `/api/orders/${o2.id}/status`, admin, 'PATCH', { status: 'PACKED' });
  log(r.http === 200 && shipments(o2.id).includes('platform:FBO:HANDED_OVER'), 'admin «Qadoqlandi» — FBO yig‘ildi deb belgilandi', { http: r.http, sh: shipments(o2.id) });
}
r = await call(ADMIN, `/api/orders/${o2.id}`, admin);
log(Array.isArray(r.data?.shipments) && r.data.shipments.every((s) => s.status === 'HANDED_OVER'), 'admin buyurtma sahifasida jo‘natmalar ko‘rinadi', r.data?.shipments?.map((s) => s.status));

// ===== 3. Bekor qilish =====
console.log('\n— 3. Bekor qilish');
const o3 = await order('CASH_ON_DELIVERY', [{ productId: shopProduct, quantity: 1 }]);
r = await fetch(`${WEB}/api/orders/${o3.id}/cancel`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${customer.token}` }, body: '{}' });
log(r.status === 200 && shipments(o3.id).every((x) => x.endsWith(':CANCELLED')), 'mijoz bekor qildi — jo‘natma yopildi', shipments(o3.id));
r = await call(SELLER, `/api/shipments/${shipmentId(o3.id, testShopId)}`, seller, 'POST', { action: 'accept' });
log(r.http === 409, 'sotuvchi bekor qilingan jo‘natmani qabul qila olmaydi', r.http);
r = await call(ADMIN, `/api/shipments/${shipmentId(o3.id, testShopId)}/receive`, admin, 'POST');
log(r.http === 409 && /bekor/.test(r.message ?? ''), 'ombor ham qabul qilmaydi', r.message);

// ===== 4. FBO sotuvchi =====
console.log('\n— 4. FBO: model admin tomonidan, zaxirani ombor yuritadi');
r = await call(ADMIN, `/api/sellers/${testShopId}/fulfillment`, admin, 'POST', { model: 'FBO', applyToProducts: true });
log(r.http === 200 && r.data?.productsMoved > 0, 'Test Shop FBO ga o‘tdi (tovarlari bilan)', r.data);
r = await call(ADMIN, '/api/sellers', admin);
const ts = (r.data?.items ?? []).find((x) => x.id === testShopId);
log(ts?.fulfillmentModel === 'FBO' && ts.productsByModel.FBS === 0, 'sotuvchilar ro‘yxatida model ko‘rinadi', ts && { m: ts.fulfillmentModel, by: ts.productsByModel });
r = await call(SELLER, '/api/inventory', seller);
const row = (r.data?.items ?? []).find((x) => x.productId === shopProduct);
log(row?.fulfillmentModel === 'FBO', 'inventarda FBO belgisi', row?.fulfillmentModel);
r = await call(SELLER, '/api/inventory', seller, 'PATCH', { updates: [{ variantId: row.variantId, quantity: row.stock + 5, expected: row.stock }] });
log(r.http === 409 && r.code === 'FBO_STOCK_MANAGED_BY_WAREHOUSE', 'sotuvchi FBO zaxirasini o‘zgartira olmaydi', r.code);
r = await call(SELLER, '/api/auth/me', seller);
log(r.data?.seller?.fulfillmentModel === 'FBO', 'panel sotuvchi modelini biladi', r.data?.seller?.fulfillmentModel);
const o4 = await order('CASH_ON_DELIVERY', [{ productId: shopProduct, quantity: 1 }]);
log(shipments(o4.id)[0]?.endsWith(':FBO:NEW'), 'FBO tovar buyurtmasi — FBO jo‘natma', shipments(o4.id));
r = await call(SELLER, `/api/shipments/${shipmentId(o4.id, testShopId)}`, seller, 'POST', { action: 'accept' });
log(r.http === 403, 'FBO jo‘natmani sotuvchi emas, ombor yig‘adi', r.http);
r = await call(ADMIN, `/api/orders/${o4.id}/status`, admin, 'PATCH', { status: 'PACKED' });
log(r.http === 200 && orderStatus(o4.id) === 'PACKED', 'FBO — admin «Qadoqlandi» qiladi (avvalgidek)', r.http);
r = await call(SELLER, '/api/products', seller, 'POST', { nameUz: `F3a FBO ${RUN}`, sku: `F3A-${RUN}-2`, basePrice: '90000', stock: 3, categorySlug: cat });
log(psql(`select "fulfillmentModel" from "Product" where sku='F3A-${RUN}-2'`) === 'FBO', 'FBO sotuvchining yangi tovari — FBO');
r = await call(ADMIN, `/api/sellers/${testShopId}/fulfillment`, admin, 'POST', { model: 'FBS', applyToProducts: true });
log(r.http === 200 && psql(`select count(*) from "Product" where "sellerId"='${testShopId}' and "fulfillmentModel"='FBO'`) === '0', 'qaytadan FBS', r.data);

// ===== 5. Tariflar =====
console.log('\n— 5. Marketplace tariflari');
r = await call(ADMIN, '/api/marketplace/settings', admin);
log(r.http === 200 && r.data?.effective?.commissionPct?.FBS === 10, 'standart tariflar', r.data?.effective);
r = await call(ADMIN, '/api/marketplace/settings', admin, 'PATCH', { ...r.data.effective, payoutDays: [0, 16] });
log(r.http === 400, 'noto‘g‘ri to‘lov kuni — 400', r.message);
const s5 = { commissionPct: { FBS: 9, FBO: 13 }, feePerUnit: { FBS: 0, FBO: 6000 }, handoverHours: { FBS: 72, FBO: 24 }, payoutDays: [16, 1] };
r = await call(ADMIN, '/api/marketplace/settings', admin, 'PATCH', s5);
log(r.http === 200 && r.data?.effective?.handoverHours?.FBS === 72 && r.data.effective.payoutDays.join() === '1,16', 'tariflar saqlandi', r.data?.effective);
const o5 = await order('CASH_ON_DELIVERY', [{ productId: shopProduct, quantity: 1 }]);
const h5 = Number(psql(`select round(extract(epoch from ("deadlineAt"-now()))/3600) from "SellerShipment" where "orderId"='${o5.id}'`));
log(h5 >= 71 && h5 <= 72, 'yangi muddat (72 soat) yangi jo‘natmaga qo‘llandi', h5);
r = await call(ADMIN, '/api/marketplace/settings', admin, 'PATCH', r.data.defaults);
log(r.http === 200 && r.data?.effective?.handoverHours?.FBS === 48, 'standartga qaytarildi');
r = await call(SELLER, '/api/marketplace/settings', seller);
log(r.http === 404 || r.http === 401 || r.http === 403, 'sotuvchi tariflarni o‘zgartira olmaydi (admin API emas)', r.http);

// tozalash: ochiq test jo'natmalari ombor ro'yxatini to'ldirmasin
for (const o of [o4, o5]) await fetch(`${ADMIN}/api/orders/${o.id}/cancel`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: admin.cookie }, body: JSON.stringify({ reason: 'F3a e2e tozalash' }) });

console.log(`\n${fails === 0 ? 'HAMMASI O‘TDI' : `${fails} ta XATO`}`);
process.exit(fails ? 1 : 0);
