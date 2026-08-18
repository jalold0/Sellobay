// Global sourcing oqimini HTTP orqali uchdan-uchgacha sinash.
// Dev server 3000-portda turgan bo'lishi kerak: npx tsx scripts/global-e2e-check.ts
import { prisma } from '../packages/database/src/index.ts';

const BASE = process.env.E2E_BASE ?? 'http://localhost:3000';
const PASSWORD = 'Test1234';

interface Jar {
  cookie: string;
}

async function login(email: string): Promise<Jar> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password: PASSWORD }),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (!res.ok) throw new Error(`login ${email}: ${res.status} ${await res.text()}`);
  return { cookie: setCookie.map((c) => c.split(';')[0]).join('; ') };
}

async function api(path: string, jar: Jar, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', cookie: jar.cookie, ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

const ok = (c: boolean, msg: string) => console.log(`${c ? '  OK  ' : ' XATO '} ${msg}`);

async function main() {
  const roles = await prisma.userRoleAssignment.findMany({
    where: { user: { email: 'admin@test.uz' } },
    select: { role: true },
  });
  console.log(`admin@test.uz rollari: ${roles.map((r) => r.role).join(', ') || "yo'q"}\n`);

  const customer = await login('customer@test.uz');
  const admin = await login('admin@test.uz');
  console.log('Login: customer va admin — OK\n');

  console.log('1) Mijoz havola yuboradi');
  const created = await api('/api/global/sourcing', customer, {
    method: 'POST',
    body: JSON.stringify({
      url: 'https://item.taobao.com/item.htm?id=999888777666&spm=test',
      qty: 2,
      freightMode: 'AUTO',
      variantNote: 'qora, 42',
    }),
  });
  ok(created.status === 200, `status ${created.status}`);
  const req = created.body?.data?.request;
  ok(req?.status === 'NEW', `status = ${req?.status}`);
  ok(req?.platform === 'TAOBAO', `platforma = ${req?.platform}`);
  ok(
    req?.normalizedUrl === 'https://item.taobao.com/item.htm?id=999888777666',
    `kanonik havola = ${req?.normalizedUrl}`,
  );
  ok(/^SRQ-2026-\d{8}$/.test(req?.number ?? ''), `raqam = ${req?.number}`);

  console.log('\n2) Dublikat — yangi yozuv yaratmaydi');
  const dup = await api('/api/global/sourcing', customer, {
    method: 'POST',
    body: JSON.stringify({ url: 'https://item.taobao.com/item.htm?id=999888777666', qty: 2 }),
  });
  ok(dup.body?.data?.duplicate === true, `duplicate = ${dup.body?.data?.duplicate}`);

  console.log('\n3) Yaroqsiz havola rad etiladi');
  const bad = await api('/api/global/sourcing', customer, {
    method: 'POST',
    body: JSON.stringify({ url: 'https://www.amazon.com/dp/B08N5WRWNW' }),
  });
  ok(bad.status === 400, `status ${bad.status} — ${bad.body?.error?.code}`);

  console.log('\n4) Mijoz operator navbatiga kira olmaydi');
  const forbidden = await api('/api/global/sourcing/queue', customer);
  ok(forbidden.status === 403, `status ${forbidden.status}`);

  console.log('\n5) Operator navbatni ko‘radi');
  const queue = await api('/api/global/sourcing/queue', admin);
  ok(queue.status === 200, `status ${queue.status}, ${queue.body?.data?.items?.length} ta so‘rov`);

  console.log('\n6) Operator narx taklif qiladi');
  const quoted = await api(`/api/global/sourcing/${req.id}/quote`, admin, {
    method: 'POST',
    body: JSON.stringify({ priceCny: 130, weightKg: 1.3, operatorNote: 'e2e test' }),
  });
  ok(quoted.status === 200, `status ${quoted.status}`);
  ok(quoted.body?.data?.status === 'QUOTED', `status = ${quoted.body?.data?.status}`);
  ok(quoted.body?.data?.quotedTotal > 0, `narx = ${quoted.body?.data?.quotedTotal}`);
  ok(quoted.body?.data?.leadTimeMinDays === 15, `muddat = ${quoted.body?.data?.leadTimeMinDays}`);
  console.log(
    `       hisob: ${quoted.body?.data?.quotedTotal} so'm, ` +
      `${quoted.body?.data?.quotedWeightKg} kg, donasi ${quoted.body?.data?.quotedUnit}`,
  );

  console.log('\n7) Boshqa mijoz bu so‘rovni ko‘ra olmaydi');
  const other = await login('seller@test.uz');
  const stolen = await api(`/api/global/sourcing/${req.id}`, other);
  ok(stolen.status === 404, `status ${stolen.status}`);

  console.log('\n8) Mijoz taklifni qabul qiladi');
  const accepted = await api(`/api/global/sourcing/${req.id}`, customer, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'ACCEPT' }),
  });
  ok(accepted.body?.data?.status === 'ACCEPTED', `status = ${accepted.body?.data?.status}`);

  console.log('\n9) Ikkinchi marta javob berib bo‘lmaydi');
  const again = await api(`/api/global/sourcing/${req.id}`, customer, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'REJECT' }),
  });
  ok(again.status === 409, `status ${again.status} — ${again.body?.error?.code}`);

  console.log('\n10) Tozalash');
  const del = await prisma.sourcingRequest.deleteMany({
    where: { normalizedUrl: 'https://item.taobao.com/item.htm?id=999888777666' },
  });
  ok(del.count > 0, `${del.count} ta test yozuvi o‘chirildi`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
