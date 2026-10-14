// F3b e2e: hisob daftari (yetkazilganda), qaytarish teskari yozuvlari, to'lov hisoblash,
// «To'landi», bekor qilish, manfiy qoldiq, cron. Web :3000, admin :3001, seller :3002.
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
const admin = await login(ADMIN, 'admin@test.uz');
const seller = await login(SELLER, 'seller@test.uz');
log(Boolean(customer.token && admin.cookie && seller.cookie), 'hamma rol tizimga kirdi');

const shopId = psql(`select s.id from "Seller" s join "User" u on u.id=s."ownerUserId" where u.email='seller@test.uz'`);
psql(`update "Seller" set "bankAccount"='20208000900123456789', "bankName"='Kapitalbank' where id='${shopId}'`);
// Avvalgi yugurishlardan qolgan ochiq yozuvlar bu sinovni chalkashtirmasin — to'lab yopamiz.
await call(ADMIN, '/api/payouts/run', admin, 'POST');
for (const id of psql(`select id from "SellerPayout" where "sellerId"='${shopId}' and status='PENDING'`).split('\n').filter(Boolean)) {
  await call(ADMIN, `/api/payouts/${id}/paid`, admin, 'POST', { reference: `OLD-${RUN}` });
}
const openSum = () => psql(`select coalesce(sum(amount),0) from "SellerLedgerEntry" where "sellerId"='${shopId}' and "payoutId" is null and "availableAt" <= now()`);
// Manfiy qoldiq (avvalgi qaytarishlar) bo'lsa — tuzatish bilan nolga (faqat lokal test bazasi).
if (Number(openSum()) !== 0) {
  psql(`insert into "SellerLedgerEntry"(id,"sellerId",type,amount,"availableAt",reference,note) values (gen_random_uuid(),'${shopId}','ADJUSTMENT',${-Number(openSum())},now(),'TEST-ZERO-${RUN}','e2e')`);
}
const pendingBase = Number(psql(`select coalesce(sum(amount),0) from "SellerLedgerEntry" where "sellerId"='${shopId}' and "payoutId" is null and "availableAt" > now()`));

const cat = psql(`select slug from "Category" where "isActive" limit 1`);
let r = await call(SELLER, '/api/products', seller, 'POST', { nameUz: `F3b ko‘ylak ${RUN}`, sku: `F3B-${RUN}`, basePrice: '120000', stock: 50, categorySlug: cat });
const product = r.data?.product?.id ?? r.data?.id;
psql(`update "Product" set status='ACTIVE', "publishedAt"=now() where id='${product}'`);

const order = async (qty) => {
  const r = await call(WEB, '/api/orders', customer, 'POST', { items: [{ productId: product, quantity: qty }], recipientName: 'F3b Test', phone: '+998901234567', region: 'Toshkent', city: 'Toshkent', street: 'F3b 1', deliveryMethod: 'HOME_DELIVERY', paymentProvider: 'CASH_ON_DELIVERY' });
  if (r.http !== 200) console.log('   order fail', r.code, r.message);
  return { id: r.data?.order?.id, number: r.data?.order?.number };
};
async function deliver(o) {
  for (const sid of psql(`select id from "SellerShipment" where "orderId"='${o.id}' and status in ('NEW','ACCEPTED','PACKED') and "fulfillmentModel"='FBS'`).split('\n').filter(Boolean)) {
    await call(ADMIN, `/api/shipments/${sid}/receive`, admin, 'POST');
  }
  return call(ADMIN, `/api/orders/${o.id}/status`, admin, 'PATCH', { status: 'DELIVERED' });
}
const entries = (orderId) => psql(`select type||':'||amount from "SellerLedgerEntry" where "orderId"='${orderId}' order by "createdAt", type`).split('\n').filter(Boolean);
const orderSum = (orderId) => Number(psql(`select coalesce(sum(amount),0) from "SellerLedgerEntry" where "orderId"='${orderId}'`));

// ===== 1. FBS sotuvi =====
console.log('\n— 1. Yetkazilganda daftar (FBS)');
const o1 = await order(2);
r = await deliver(o1);
log(r.http === 200, 'buyurtma yetkazildi', { http: r.http, code: r.code });
let e1 = entries(o1.id);
log(e1.length === 2 && e1.includes('SALE:240000.00') && e1.includes('COMMISSION:-24000.00'), 'sotuv +240 000, komissiya −24 000 (10%), FBS xizmat haqisiz', e1);
const days = Number(psql(`select round(extract(epoch from (l."availableAt"-o."deliveredAt"))/86400) from "SellerLedgerEntry" l join "Order" o on o.id=l."orderId" where l."orderId"='${o1.id}' limit 1`));
log(days === 10, 'to‘lovga tayyor — yetkazilganidan 10 kun keyin', days);
r = await call(ADMIN, `/api/orders/${o1.id}/status`, admin, 'PATCH', { status: 'DELIVERED' });
log(r.http >= 400 && entries(o1.id).length === 2, 'qayta «yetkazildi» — daftar ikkilanmadi', r.http);

// ===== 2. FBO + qaytarish =====
console.log('\n— 2. FBO sotuvi va qaytarish');
await call(ADMIN, `/api/sellers/${shopId}/fulfillment`, admin, 'POST', { model: 'FBO', applyToProducts: true });
const o2 = await order(1);
r = await deliver(o2);
const e2 = entries(o2.id);
log(r.http === 200 && e2.includes('SALE:120000.00') && e2.includes('COMMISSION:-14400.00') && e2.includes('FULFILLMENT_FEE:-5000.00'), 'FBO: komissiya 12% va xizmat haqi 5 000', e2);
await call(ADMIN, `/api/sellers/${shopId}/fulfillment`, admin, 'POST', { model: 'FBS', applyToProducts: true });
r = await call(WEB, `/api/orders/${o2.id}/return`, customer, 'POST', { reason: 'O‘lchami mos kelmadi' });
const e2r = entries(o2.id);
log(r.http === 200 && e2r.length === 6 && orderSum(o2.id) === 0, 'qaytarilganda teskari yozuvlar — buyurtma bo‘yicha jami 0', { http: r.http, e: e2r });
log(psql(`select count(distinct "availableAt") from "SellerLedgerEntry" where "orderId"='${o2.id}'`) === '1', 'teskari yozuv sotuv bilan bir sanada yechiladi');

// ===== 3. Sotuvchi balansi va cron =====
console.log('\n— 3. Balans va cron');
r = await call(SELLER, '/api/finance', seller);
log(r.http === 200 && Number(r.data?.balance?.pending) === pendingBase + 216000 && Number(r.data.balance.available) === 0, 'qaytarish muddatida 216 000, to‘lovga tayyor 0', r.data?.balance);
log(r.data?.tariff?.model === 'FBS' && r.data.tariff.commissionPct === 10 && r.data.bank.accountTail === '6789', 'tarif va rekvizit (oxirgi 4 raqam) ko‘rinadi', { t: r.data?.tariff, b: r.data?.bank });
log(!JSON.stringify(r.data).includes('20208000900123456789'), 'to‘liq hisob raqami panelga chiqmaydi');
r = await call(WEB, '/api/internal/payouts/run', null, 'POST');
log(r.http === 401, 'cron: sirsiz — 401', r.http);
r = await call(WEB, '/api/internal/payouts/run', { token: 'test_cron_secret' }, 'POST');
const today = Number(psql(`select extract(day from now() at time zone 'Asia/Tashkent')`));
log(r.http === 200 && r.data?.skipped === ![1, 16].includes(today), 'cron: to‘lov kuni bo‘lmasa hech narsa qilmaydi', r.data);

// ===== 4. To'lov hisoblash va «To'landi» =====
console.log('\n— 4. To‘lov');
psql(`update "SellerLedgerEntry" set "availableAt"=now()-interval '1 day' where "orderId" in ('${o1.id}','${o2.id}')`);
r = await call(SELLER, '/api/finance', seller);
log(Number(r.data?.balance?.available) === 216000, 'muddat o‘tgach — to‘lovga tayyor 216 000', r.data?.balance);
r = await call(ADMIN, '/api/payouts/run', admin, 'POST');
const p1 = psql(`select id||'|'||amount||'|'||coalesce("bankAccount",'-') from "SellerPayout" where "sellerId"='${shopId}' and status='PENDING'`).split('|');
log(r.http === 200 && p1[1] === '216000.00' && p1[2] === '20208000900123456789', 'to‘lov hisoblandi: 216 000, rekvizit nusxalandi', p1);
r = await call(ADMIN, '/api/payouts/run', admin, 'POST');
log(r.data?.created === 0, 'qayta hisoblash — ikkinchi to‘lov yo‘q', r.data);
r = await call(SELLER, '/api/finance', seller);
log(Number(r.data?.balance?.inPayout) === 216000 && Number(r.data.balance.available) === 0, 'sotuvchida: bank o‘tkazmasida 216 000', r.data?.balance);
r = await call(ADMIN, '/api/payouts', admin);
const ap = (r.data?.pending ?? []).find((x) => x.id === p1[0]);
log(ap && ap.entries >= 8 && ap.seller.brandName, 'admin ro‘yxatida: kamida 8 ta yozuv', ap && { entries: ap.entries });
r = await call(ADMIN, `/api/payouts/${p1[0]}/paid`, admin, 'POST', { reference: '' });
log(r.http === 400, 'topshiriqnoma raqamisiz — 400', r.message);
r = await call(ADMIN, `/api/payouts/${p1[0]}/paid`, admin, 'POST', { reference: `TP-${RUN}` });
log(r.http === 200, '«To‘landi»', r.http);
r = await call(ADMIN, `/api/payouts/${p1[0]}/paid`, admin, 'POST', { reference: `TP-${RUN}` });
log(r.http === 409, 'qayta «To‘landi» — 409', r.http);
log(psql(`select amount from "SellerLedgerEntry" where reference='PAYOUT:${p1[0]}'`) === '-216000.00', 'daftarga to‘lov (−216 000) yozildi');
log(psql(`select count(*) from "AuditLog" where action in ('payout.paid','payout.create') and "resourceId"='${p1[0]}'`) === '2', 'jurnalga yozildi');
r = await call(SELLER, '/api/finance', seller);
log(Number(r.data?.balance?.inPayout) === 0 && r.data.payouts.some((p) => p.status === 'PAID' && p.reference === `TP-${RUN}`), 'sotuvchi to‘lov raqamini ko‘radi', r.data?.balance);

// ===== 5. Bekor qilish =====
console.log('\n— 5. To‘lovni bekor qilish');
const o3 = await order(1);
await deliver(o3);
psql(`update "SellerLedgerEntry" set "availableAt"=now()-interval '1 day' where "orderId"='${o3.id}'`);
await call(ADMIN, '/api/payouts/run', admin, 'POST');
const p3 = psql(`select id from "SellerPayout" where "sellerId"='${shopId}' and status='PENDING'`);
r = await call(ADMIN, `/api/payouts/${p3}/cancel`, admin, 'POST', { reason: 'Rekvizit eskirgan' });
log(r.http === 200 && psql(`select count(*) from "SellerLedgerEntry" where "payoutId"='${p3}'`) === '0', 'bekor qilindi — yozuvlar yana to‘lov kutadi', r.http);
await call(ADMIN, '/api/payouts/run', admin, 'POST');
const p3b = psql(`select amount from "SellerPayout" where "sellerId"='${shopId}' and status='PENDING'`);
log(p3b === '108000.00', 'keyingi hisoblashda yana yig‘ildi (108 000)', p3b);
for (const id of psql(`select id from "SellerPayout" where "sellerId"='${shopId}' and status='PENDING'`).split('\n').filter(Boolean)) {
  await call(ADMIN, `/api/payouts/${id}/paid`, admin, 'POST', { reference: `TP2-${RUN}` });
}

// ===== 6. To'lovdan keyin qaytarish — manfiy qoldiq =====
console.log('\n— 6. To‘langan savdo qaytarildi');
r = await call(WEB, `/api/orders/${o1.id}/return`, customer, 'POST', { reason: 'Nuqson' });
log(r.http === 200 && orderSum(o1.id) === 0, 'teskari yozuvlar tushdi', r.http);
r = await call(SELLER, '/api/finance', seller);
log(Number(r.data?.balance?.available) === -216000, 'qoldiq manfiy (−216 000) — keyingi savdolardan ushlanadi', r.data?.balance);
r = await call(ADMIN, '/api/payouts/run', admin, 'POST');
log(psql(`select count(*) from "SellerPayout" where "sellerId"='${shopId}' and status='PENDING'`) === '0', 'manfiy qoldiqqa to‘lov yaratilmaydi');
const total = psql(`select sum(amount) from "SellerLedgerEntry" where "sellerId"='${shopId}' and "createdAt" > now() - interval '1 hour' and reference not like 'TEST-ZERO-%' and "orderId" in ('${o1.id}','${o2.id}','${o3.id}') or reference in (select 'PAYOUT:'||id from "SellerPayout" where reference like 'TP%-${RUN}')`);
log(Number(total) === -216000, 'daftar yig‘indisi = platformaning sotuvchidan qarzi (bu yerda −216 000: to‘langan, keyin qaytgan)', total);

// tozalash: manfiy qoldiqni nolga (keyingi yugurishlar uchun)
psql(`insert into "SellerLedgerEntry"(id,"sellerId",type,amount,"availableAt",reference,note) values (gen_random_uuid(),'${shopId}','ADJUSTMENT',216000,now(),'TEST-RESET-${RUN}','e2e')`);

console.log(`\n${fails === 0 ? 'HAMMASI O‘TDI' : `${fails} ta XATO`}`);
process.exit(fails ? 1 : 0);
