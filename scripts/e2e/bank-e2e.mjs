// Sotuvchi bank rekviziti (admin): validatsiya, saqlash, kutilayotgan to'lovga qo'llash, jurnal.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ADMIN = 'http://localhost:3001';
const PW = readFileSync(new URL('../../packages/database/prisma/seed-test-accounts.ts', import.meta.url), 'utf8').match(/password: '([^']+)'/)[1];
let fails = 0;
const log = (ok, msg, extra) => {
  console.log(`${ok ? '✅' : '❌'} ${msg}${extra !== undefined ? ' → ' + JSON.stringify(extra) : ''}`);
  if (!ok) fails++;
};
const psql = (sql) =>
  execFileSync(process.env.DOCKER_BIN ?? 'docker', ['exec', 'ecom-postgres', 'psql', '-U', 'postgres', '-d', 'ecommerce', '-tAc', sql], { encoding: 'utf8' }).trim();
const r0 = await fetch(`${ADMIN}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: 'admin@test.uz', email: 'admin@test.uz', password: PW }) });
const cookie = r0.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
const put = async (id, body) => {
  const r = await fetch(`${ADMIN}/api/sellers/${id}/bank`, { method: 'PUT', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body) });
  const j = await r.json();
  return { http: r.status, data: j.data, message: j.error?.message };
};

const shop = psql(`select s.id from "Seller" s join "User" u on u.id=s."ownerUserId" where u.email='seller@test.uz'`);
// Kutilayotgan to'lov (rekvizitsiz nusxa bilan) — yangi rekvizit unga ham tushishi kerak.
psql(`insert into "SellerPayout"(id,"sellerId",amount,"periodStart","periodEnd",status) values (gen_random_uuid(),'${shop}',1000,now(),now(),'PENDING')`);

let r = await put(shop, { bankName: 'Kapitalbank', bankAccount: '123' });
log(r.http === 400, 'qisqa hisob raqami — 400', r.message);
r = await put('00000000-0000-0000-0000-000000000000', { bankName: 'Kapitalbank', bankAccount: '20208000900111122223' });
log(r.http === 404, 'noma’lum sotuvchi — 404', r.http);
r = await put(shop, { bankName: 'Hamkorbank', bankAccount: '20208000900111122223' });
log(r.http === 200 && r.data?.seller?.accountTail === '2223', 'saqlandi', r.data);
log(psql(`select "bankName"||'|'||"bankAccount" from "Seller" where id='${shop}'`) === 'Hamkorbank|20208000900111122223', 'sotuvchida yangi rekvizit');
log(psql(`select count(*) from "SellerPayout" where "sellerId"='${shop}' and status='PENDING' and "bankAccount"<>'20208000900111122223'`) === '0', 'kutilayotgan to‘lovlar yangi rekvizitni oldi');
const meta = psql(`select meta::text from "AuditLog" where action='seller.bank' and "resourceId"='${shop}' order by "createdAt" desc limit 1`);
log(meta.includes('••2223') && !meta.includes('20208000900111122223'), 'jurnalda faqat oxirgi 4 raqam', meta);
r = await fetch(`${ADMIN}/api/sellers/${shop}/bank`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{}' });
log(r.status === 401, 'tizimga kirmagan — 401', r.status);

// tozalash: test to'lovi
psql(`delete from "SellerPayout" where "sellerId"='${shop}' and amount=1000 and status='PENDING'`);
console.log(`\n${fails === 0 ? 'HAMMASI O‘TDI' : `${fails} ta XATO`}`);
process.exit(fails ? 1 : 0);
