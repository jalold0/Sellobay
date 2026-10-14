// C paket e2e: Y2, Y3, Y4, Y15, Y1, Y14, Y13, O2/P4, O8, sessiya yangilash.
// Web :3000, admin :3001, seller :3002, lokal Docker Postgres.
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

async function login(base, email, password = PW) {
  const r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: email, email, password }) });
  const j = await r.json();
  const cookies = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]);
  return { http: r.status, code: j.error?.code, message: j.error?.message, cookie: cookies.join('; '), cookies, token: j.data?.tokens?.access };
}
const call = async (base, path, auth, method = 'GET', body) => {
  const r = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(auth?.cookie ? { cookie: auth.cookie } : {}), ...(auth?.token ? { authorization: `Bearer ${auth.token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let j = null;
  try { j = await r.json(); } catch { /* html */ }
  return { http: r.status, data: j?.data, code: j?.error?.code, message: j?.error?.message };
};

const admin = await login(ADMIN, 'admin@test.uz');
const seller = await login(SELLER, 'seller@test.uz');
const customer = await login(WEB, 'customer@test.uz');
log(admin.http === 200 && seller.http === 200, 'admin va seller kirdi', [admin.http, seller.http]);

const sellerId = psql(`select s.id from "Seller" s join "User" u on u.id=s."ownerUserId" where u.email='seller@test.uz'`);
psql(`update "Seller" set status='ACTIVE', tin=coalesce(tin,'123456789') where id='${sellerId}'`);
const ownProduct = psql(`select id from "Product" where "sellerId"='${sellerId}' and status='ACTIVE' and "deletedAt" is null limit 1`);
const ownSlug = psql(`select slug from "Product" where id='${ownProduct}'`);

// ===== Y2 + Y4: sotuvchini to'xtatish =====
console.log('\n— Y2/Y4: sotuvchini to‘xtatish');
let r = await call(ADMIN, `/api/sellers/${sellerId}/status`, admin, 'POST', { action: 'suspend' });
log(r.http === 400, 'sababsiz to‘xtatish — 400', r.http);
r = await call(ADMIN, `/api/sellers/${sellerId}/status`, admin, 'POST', { action: 'suspend', reason: 'Hujjatlar muddati o‘tgan' });
log(r.http === 200 && r.data?.seller?.status === 'SUSPENDED', 'admin sotuvchini to‘xtatdi', r.data ?? r.code);
r = await call(WEB, `/api/products/${ownSlug}`, null);
log(r.http === 404, 'vitrinada tovar sahifasi yo‘q (404)', r.http);
r = await call(WEB, `/api/products?ids=${ownProduct}`, null);
log(!(r.data?.items ?? r.data ?? []).some?.((p) => p.id === ownProduct), 'katalog ro‘yxatida yo‘q');
r = await call(WEB, '/api/orders', customer, 'POST', { items: [{ productId: ownProduct, quantity: 1 }], recipientName: 'C Test', phone: '+998901234567', region: 'Toshkent', city: 'Toshkent', street: 'C 1', deliveryMethod: 'HOME_DELIVERY', paymentProvider: 'CASH_ON_DELIVERY' });
log(r.http >= 400, 'checkout to‘xtatilgan sotuvchi tovarini sotmaydi', [r.http, r.code]);
r = await call(SELLER, '/api/auth/me', seller);
log(r.data?.seller?.status === 'SUSPENDED' && r.data?.seller?.suspendReason === 'Hujjatlar muddati o‘tgan', 'seller paneli: holat va sabab ko‘rinadi', r.data?.seller);
r = await call(SELLER, '/api/inventory', seller, 'PATCH', { updates: [{ productId: ownProduct, quantity: 5 }] });
log(r.http === 403 && r.code === 'SELLER_SUSPENDED', 'to‘xtatilgan sotuvchi zaxirani o‘zgartira olmaydi', r.code);
r = await call(SELLER, '/api/products', seller, 'POST', { nameUz: 'Test', sku: `C-${RUN}-0`, basePrice: '1000', stock: 1, categorySlug: 'x' });
log(r.http === 403 && r.code === 'SELLER_SUSPENDED', 'to‘xtatilgan sotuvchi tovar qo‘sha olmaydi', r.code);
r = await call(ADMIN, `/api/sellers/${sellerId}/status`, admin, 'POST', { action: 'reactivate' });
log(r.http === 200, 'admin qayta faollashtirdi', r.http);
r = await call(WEB, `/api/products/${ownSlug}`, null);
log(r.http === 200, 'tovar vitrinaga qaytdi', r.http);

// ===== Y3: ariza, KYC, rad etish =====
console.log('\n— Y3/Y4: ariza va KYC');
const email = `seller-${RUN}@test.uz`;
r = await call(WEB, '/api/auth/register', null, 'POST', { email, password: 'Parol1234', firstName: 'Ali', lastName: 'Valiyev', role: 'seller' });
log(r.http === 400, 'STIR’siz sotuvchi arizasi qabul qilinmaydi', [r.http, r.message]);
r = await call(WEB, '/api/auth/register', null, 'POST', { email, password: 'Parol1234', firstName: 'Ali', lastName: 'Valiyev', role: 'seller', shopName: `Ali Shop ${RUN}`, tin: '123 456 789'.replace(/\s/g, ''), bankName: 'Kapitalbank', bankAccount: '20208000900123456789' });
log(r.http === 200 && r.data?.pendingApproval === true, 'KYC bilan ariza qabul qilindi', r.http);
const newSeller = psql(`select s.id||'|'||coalesce(s.tin,'-')||'|'||s."brandName"||'|'||coalesce(s."bankAccount",'-') from "Seller" s join "User" u on u.id=s."ownerUserId" where u.email='${email}'`).split('|');
log(newSeller[1] === '123456789' && newSeller[2] === `Ali Shop ${RUN}` && newSeller[3] === '20208000900123456789', 'STIR, do‘kon nomi, hisob raqami saqlandi', newSeller.slice(1));
const pend = await login(SELLER, email, 'Parol1234');
log(pend.http === 403 && pend.code === 'SELLER_PENDING', 'kutilayotgan sotuvchi panelga kirmaydi', pend.code);
const pendingList = await call(ADMIN, '/api/sellers/pending', admin);
const item = pendingList.data?.items?.find((s) => s.id === newSeller[0]);
log(item?.tin === '123456789' && item?.bankAccount === '20208000900123456789', 'admin ro‘yxatida KYC ko‘rinadi');
// STIR'siz ariza
const noTinEmail = `notin-${RUN}@test.uz`;
psql(`insert into "User"(id,email,status,"createdAt","updatedAt") values (gen_random_uuid(),'${noTinEmail}','PENDING',now(),now())`);
const noTinSeller = psql(`insert into "Seller"(id,"ownerUserId","legalName","brandName",status,"createdAt","updatedAt") select gen_random_uuid(),id,'NoTin','NoTin','PENDING',now(),now() from "User" where email='${noTinEmail}' returning id`).split('\n')[0];
r = await call(ADMIN, `/api/sellers/${noTinSeller}/approve`, admin, 'POST');
log(r.http === 409 && r.code === 'KYC_MISSING', 'STIR’siz ariza tasdiqlanmaydi', r.code);
r = await call(ADMIN, `/api/sellers/${noTinSeller}/reject`, admin, 'POST', {});
log(r.http === 400, 'sababsiz rad etish — 400', r.http);
// Rad etish → sabab sotuvchiga ko'rinadi
r = await call(ADMIN, `/api/sellers/${newSeller[0]}/reject`, admin, 'POST', { reason: 'STIR soliq bazasida topilmadi' });
log(r.http === 200, 'admin arizani sabab bilan rad etdi', r.http);
const rej = await login(SELLER, email, 'Parol1234');
log(rej.http === 403 && rej.code === 'SELLER_REJECTED' && rej.message?.includes('STIR soliq bazasida topilmadi'), 'rad etilgan sotuvchi sababni ko‘radi', rej.message);
r = await call(ADMIN, `/api/sellers/${newSeller[0]}/approve`, admin, 'POST');
log(r.http === 409 && r.code === 'NOT_PENDING', 'bloklanganni «Tasdiqlash» qayta ochmaydi', r.code);
r = await call(ADMIN, `/api/sellers/${sellerId}/reject`, admin, 'POST', { reason: 'test' });
log(r.http === 409, 'faol sotuvchini «Rad etish» bloklamaydi', r.code);
// Tasdiqlash yo'li
const okEmail = `okseller-${RUN}@test.uz`;
await call(WEB, '/api/auth/register', null, 'POST', { email: okEmail, password: 'Parol1234', firstName: 'Vali', role: 'seller', shopName: `Vali ${RUN}`, tin: '98765432101234' });
const okSeller = psql(`select s.id from "Seller" s join "User" u on u.id=s."ownerUserId" where u.email='${okEmail}'`);
r = await call(ADMIN, `/api/sellers/${okSeller}/approve`, admin, 'POST');
log(r.http === 200 && psql(`select u.status from "User" u where email='${okEmail}'`) === 'ACTIVE', 'KYC’li ariza tasdiqlandi, foydalanuvchi ACTIVE', r.http);
const okLogin = await login(SELLER, okEmail, 'Parol1234');
log(okLogin.http === 200, 'tasdiqlangan sotuvchi panelga kiradi', okLogin.http);

// ===== Y15: narx tekshiruvi =====
console.log('\n— Y15: narx');
const cat = psql(`select slug from "Category" limit 1`);
const mk = (extra) => call(SELLER, '/api/products', seller, 'POST', { nameUz: `C test ${RUN}`, sku: `C-${RUN}-${Math.random().toString(36).slice(2, 7)}`, stock: 3, categorySlug: cat, ...extra });
for (const bad of ['abc', '1e5', '-100', '0', 'Infinity']) {
  r = await mk({ basePrice: bad });
  log(r.http === 400, `narx «${bad}» rad etildi`, r.http);
}
r = await mk({ basePrice: '100000', compareAtPrice: '90000' });
log(r.http === 400, 'eski narx yangidan kichik — rad', r.message);
r = await mk({ basePrice: '125000.50', compareAtPrice: '150000' });
const created = r.data?.product;
log(r.http === 200 && psql(`select "basePrice"||'|'||"compareAtPrice" from "Product" where id='${created?.id}'`) === '125000.50|150000.00', 'to‘g‘ri narx Decimal sifatida saqlandi', r.http);

// ===== Y1: tahrirlash, arxiv, qayta yuborish, admin takedown =====
console.log('\n— Y1: tovar hayot sikli');
const pid = created?.id;
r = await call(SELLER, `/api/products/${pid}`, seller, 'PATCH', { basePrice: 'abc' });
log(r.http === 400, 'tahrirda noto‘g‘ri narx — 400', r.http);
r = await call(SELLER, `/api/products/${pid}`, seller, 'PATCH', { basePrice: '119000', nameUz: `C test yangi ${RUN}` });
log(r.http === 200 && psql(`select "basePrice" from "Product" where id='${pid}'`) === '119000.00', 'narx va nom tahrirlandi', r.data);
r = await call(SELLER, `/api/products/${pid}`, seller, 'PATCH', { basePrice: '200000' });
log(r.http === 400, 'yangi narx eski narxdan oshib ketsa — rad (chegirma yolg‘on bo‘lardi)', r.message);
r = await call(SELLER, `/api/products/${ownProduct}`, okLogin, 'PATCH', { basePrice: '1000' });
log(r.http === 404, 'boshqa sotuvchining tovari — 404', r.http);
r = await call(SELLER, `/api/products/${pid}`, seller, 'POST', { action: 'archive' });
log(r.http === 200 && r.data?.product?.status === 'ARCHIVED', 'sotuvchi tovarni arxivladi', r.data);
const pSlug = psql(`select slug from "Product" where id='${pid}'`);
r = await call(WEB, `/api/products/${pSlug}`, null);
log(r.http === 404, 'arxivdagi tovar vitrinada yo‘q', r.http);
r = await call(SELLER, `/api/products/${pid}`, seller, 'POST', { action: 'resubmit' });
log(r.http === 200 && r.data?.product?.status === 'PENDING_REVIEW', 'qayta tekshiruvga yuborildi', r.data);
r = await call(ADMIN, `/api/products/${pid}`, admin, 'PATCH', { action: 'reject' });
log(r.http === 400, 'admin sababsiz rad eta olmaydi', r.http);
r = await call(ADMIN, `/api/products/${pid}`, admin, 'PATCH', { action: 'reject', reason: 'Rasm sifati past' });
log(r.http === 200 && r.data?.product?.status === 'DRAFT', 'admin sabab bilan rad etdi', r.data);
let list = await call(SELLER, '/api/products', seller);
let row = list.data?.items?.find((p) => p.id === pid);
log(row?.moderationNote?.reason === 'Rasm sifati past' && row?.moderationNote?.action === 'reject', 'sotuvchi rad etish sababini ko‘radi', row?.moderationNote);
await call(SELLER, `/api/products/${pid}`, seller, 'POST', { action: 'resubmit' });
list = await call(SELLER, '/api/products', seller);
row = list.data?.items?.find((p) => p.id === pid);
log(row?.status === 'PENDING_REVIEW' && row?.moderationNote === null, 'qayta yuborilgach eski sabab ko‘rinmaydi', row?.status);
r = await call(ADMIN, `/api/products/${pid}`, admin, 'PATCH', { action: 'approve' });
log(r.http === 200 && r.data?.product?.status === 'ACTIVE', 'admin tasdiqladi', r.data);
r = await call(ADMIN, `/api/products/${pid}`, admin, 'PATCH', { action: 'takedown', reason: 'Shikoyat: soxta brend' });
log(r.http === 200 && r.data?.product?.status === 'ARCHIVED', 'admin sotuvdan oldi', r.data);
list = await call(SELLER, '/api/products', seller);
row = list.data?.items?.find((p) => p.id === pid);
log(row?.moderationNote?.action === 'takedown' && row?.moderationNote?.reason === 'Shikoyat: soxta brend', 'sotuvchi sotuvdan olish sababini ko‘radi', row?.moderationNote);
r = await call(ADMIN, `/api/products/${pid}`, admin, 'PATCH', { action: 'takedown', reason: 'yana' });
log(r.http === 409, 'arxivdagini qayta takedown — 409', r.http);

// ===== Y14: admin «Tekshiruvga yuborish» =====
console.log('\n— Y14');
const catId = psql(`select id from "Category" limit 1`);
r = await call(ADMIN, '/api/products/create', admin, 'POST', { nameUz: `Admin review ${RUN}`, sku: `A-${RUN}`, basePrice: 50000, stock: 1, categoryId: catId, status: 'PENDING_REVIEW' });
log(r.http === 200 && r.data?.product?.status === 'PENDING_REVIEW', '«Tekshiruvga yuborish» → PENDING_REVIEW (ACTIVE emas)', r.data?.product?.status ?? r.message);

// ===== Y13: audit jurnali =====
console.log('\n— Y13: audit');
const actions = psql(`select string_agg(distinct action, ',' order by action) from "AuditLog" where "createdAt" > now() - interval '10 minutes'`).split(',');
for (const a of ['seller.suspend', 'seller.reactivate', 'seller.reject', 'seller.approve', 'product.reject', 'product.approve', 'product.takedown', 'product.create', 'product.seller_archive', 'product.seller_edit']) {
  log(actions.includes(a), `jurnalda «${a}»`);
}
log(psql(`select count(*) from "AuditLog" where action='seller.reject' and "resourceId"='${newSeller[0]}' and meta->>'reason'='STIR soliq bazasida topilmadi' and "userId" is not null`) === '1', 'rad etish sababi va admin kimligi yozilgan');

// ===== O2/P4: statistika =====
console.log('\n— O2/P4: statistika');
const st = await call(ADMIN, '/api/stats', admin);
const db = await call(ADMIN, '/api/dashboard', admin);
const ss = await call(SELLER, '/api/stats', seller);
log(st.http === 200 && db.http === 200 && ss.http === 200, 'admin va seller statistikasi ishlaydi', [st.http, db.http, ss.http]);
const refunded = Number(psql(`select coalesce(sum("refundedTotal"),0) from "Order" where "paidAt" >= now() - interval '30 days' and status not in ('CANCELLED','RETURNED','REFUNDED')`));
log(Math.round(st.data?.kpi?.revenue - refunded) === Math.round(db.data?.revenue?.current), 'analitika va bosh sahifa daromadi bir xil ta’rif', { stats: st.data?.kpi?.revenue, dashboard: db.data?.revenue?.current, refunded });
const expected = Number(psql(`select coalesce(sum("grandTotal"),0) from "Order" where "paidAt" >= now() - interval '30 days' and status not in ('CANCELLED','RETURNED','REFUNDED')`));
log(Math.round(st.data?.kpi?.revenue) === Math.round(expected), 'bekor qilingan/qaytarilgan to‘langan buyurtmalar daromadga kirmaydi', { api: st.data?.kpi?.revenue, sql: expected });
const lastDay = st.data?.revenueSeries?.at?.(-1)?.date ?? st.data?.series?.at?.(-1)?.date;
const tashToday = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
log(!lastDay || lastDay === tashToday, 'grafikning oxirgi kuni — Toshkent bo‘yicha bugun', { lastDay, tashToday });

// ===== Sessiya yangilash =====
console.log('\n— sessiyani yangilash');
// Node fetch'da cookie jar yo'q — brauzer zanjirini qo'lda yuramiz: 302 → refresh → 302 + yangi cookie.
const rt = admin.cookies.find((c) => c.startsWith('sb_rt='));
const step1 = await fetch(`${ADMIN}/api/sellers/pending`, { headers: { cookie: rt }, redirect: 'manual' });
const loc1 = step1.headers.get('location') ?? '';
log(step1.status === 307 || step1.status === 302 ? loc1.includes('/api/auth/refresh?next=') : false, 'access tugagan — middleware yangilashga yo‘naltiradi', [step1.status, loc1.replace(ADMIN, '')]);
const step2 = await fetch(new URL(loc1, ADMIN), { headers: { cookie: rt }, redirect: 'manual' });
const fresh = (step2.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
log(fresh.includes('sb_at=') && (step2.headers.get('location') ?? '').endsWith('/api/sellers/pending'), 'refresh yangi cookie berib asl so‘rovga qaytaradi', step2.status);
r = await call(ADMIN, '/api/sellers/pending', { cookie: fresh });
log(r.http === 200 && Array.isArray(r.data?.items), 'yangi cookie bilan so‘rov o‘tdi', r.http);
const sRt = seller.cookies.find((c) => c.startsWith('sb_rt='));
const post = await fetch(`${SELLER}/api/auth/refresh`, { method: 'POST', headers: { cookie: sRt } });
log(post.status === 200 && (post.headers.getSetCookie?.() ?? []).some((c) => c.startsWith('sb_at=')), 'seller POST /api/auth/refresh yangi access beradi', post.status);
const bad = await fetch(`${ADMIN}/api/auth/refresh`, { method: 'POST', headers: { cookie: 'sb_rt=yaroqsiz' } });
log(bad.status === 401, 'yaroqsiz refresh — 401', bad.status);

// ===== O8: parol almashtirish va login cheklovi =====
console.log('\n— O8');
r = await call(ADMIN, '/api/auth/password', admin, 'POST', { currentPassword: 'notogri1', newPassword: 'Yangi12345' });
log(r.http === 400 && r.code === 'WRONG_PASSWORD', 'noto‘g‘ri joriy parol — rad', r.code);
r = await call(ADMIN, '/api/auth/password', admin, 'POST', { currentPassword: PW, newPassword: 'qisqa' });
log(r.http === 400, 'kuchsiz yangi parol — rad', r.message);
r = await call(ADMIN, '/api/auth/password', admin, 'POST', { currentPassword: PW, newPassword: `Vaqtin4a${RUN}` });
log(r.http === 200, 'parol almashtirildi', r.data);
const relog = await login(ADMIN, 'admin@test.uz', `Vaqtin4a${RUN}`);
log(relog.http === 200, 'yangi parol bilan kirildi', relog.http);
r = await call(ADMIN, '/api/auth/password', relog, 'POST', { currentPassword: `Vaqtin4a${RUN}`, newPassword: PW });
log(r.http === 200, 'seed paroli qaytarildi', r.http);
let last = 0;
for (let i = 0; i < 11; i++) last = (await login(ADMIN, `brute-${RUN}@test.uz`, 'x')).http;
log(last === 429, 'admin login: ko‘p urinish — 429', last);

console.log(fails === 0 ? '\nHAMMASI O‘TDI ✅' : `\n${fails} ta TEST YIQILDI ❌`);
process.exit(fails ? 1 : 0);
