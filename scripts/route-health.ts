// Marshrut sog'ligi tekshiruvi — barcha ochiq sahifalarni bosib chiqadi.
//
// NEGA KERAK: /uz/download sahifasi production'da 90 soniya osilib turib 500
// qaytarardi va buni HECH KIM sezmagan. Sentry ulangan, lekin RSC oqimi
// o'rtasida uzilgan xato u yerga tushmagan. Xato faqat marshrutlar qo'lda
// birma-bir bosib chiqilganda topildi.
//
// Sahifalar ro'yxati QO'LDA yozilmaydi — `apps/web/src/app/[locale]` daraxti
// bo'ylab yurib topiladi. Shunda yangi sahifa qo'shilsa u avtomatik
// tekshiruvga tushadi va ro'yxat eskirmaydi.
//
// Ishga tushirish (repo root'dan):
//   npx tsx scripts/route-health.ts                       # production
//   npx tsx scripts/route-health.ts http://localhost:3000 # lokal
//
// Farq bo'lsa exit code 1.

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BASE = (process.argv[2] ?? process.env.SITE_URL ?? 'https://sellobay-web.vercel.app').replace(
  /\/$/,
  '',
);
const LOCALE = process.env.CHECK_LOCALE ?? 'uz';

/**
 * Sekin javob ham nosozlik — /download aynan shunday boshlagan edi.
 *
 * Lokalda o'chirilgan: `next dev` har sahifani BIRINCHI so'rovda kompilyatsiya
 * qiladi va 4-12 soniya oddiy hol. U yerda bu chegara faqat shovqin berardi.
 */
const isLocal = BASE.startsWith('http://localhost') || BASE.startsWith('http://127.0.0.1');
const SLOW_MS = Number(process.env.SLOW_MS ?? (isLocal ? 0 : 8_000));
const TIMEOUT_MS = 30_000;

/** Auth talab qiladigan bo'limlar — anonim tekshiruvda 307 kutiladi, sinov emas. */
const AUTH_PREFIXES = ['/profile'];

const APP_DIR = join('apps', 'web', 'src', 'app', '[locale]');

interface Found {
  route: string;
  dynamic: boolean;
}

function collectRoutes(dir: string, prefix = ''): Found[] {
  const out: Found[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    // (group) papkalari URL'ga kirmaydi
    const segment = entry.startsWith('(') && entry.endsWith(')') ? '' : `/${entry}`;
    const nextPrefix = `${prefix}${segment}`;
    if (readdirSync(full).includes('page.tsx')) {
      out.push({ route: nextPrefix || '/', dynamic: nextPrefix.includes('[') });
    }
    out.push(...collectRoutes(full, nextPrefix));
  }
  return out;
}

async function check(path: string): Promise<{ status: number; ms: number; err?: string }> {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, { signal: ctrl.signal, redirect: 'manual' });
    return { status: res.status, ms: Date.now() - started };
  } catch (e) {
    return { status: 0, ms: Date.now() - started, err: (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

async function main(): Promise<void> {
  const found = collectRoutes(APP_DIR).sort((a, b) => a.route.localeCompare(b.route));
  const root: Found[] = [{ route: '/', dynamic: false }];
  const all = [...root, ...found.filter((f) => f.route !== '/')];

  const dynamic = all.filter((f) => f.dynamic);
  const testable = all.filter((f) => !f.dynamic);

  console.log(`Manzil: ${BASE}  (locale: ${LOCALE})`);
  console.log(`Topildi: ${all.length} sahifa — ${testable.length} tekshiriladi\n`);

  const failures: string[] = [];

  for (const { route } of testable) {
    const path = `/${LOCALE}${route === '/' ? '' : route}`;
    const needsAuth = AUTH_PREFIXES.some((p) => route === p || route.startsWith(`${p}/`));
    const { status, ms, err } = await check(path);

    const ok = needsAuth
      ? status === 307 || status === 302 || (status >= 200 && status < 300)
      : status >= 200 && status < 300;
    const slow = SLOW_MS > 0 && ms > SLOW_MS;

    const mark = !ok ? 'XATO' : slow ? 'SEKIN' : ' ok ';
    console.log(`  ${mark}  ${String(status).padStart(3)}  ${String(ms).padStart(6)}ms  ${path}`);

    if (!ok) failures.push(`${path} -> ${status}${err ? ` (${err})` : ''}`);
    else if (slow) failures.push(`${path} -> ${ms}ms (${SLOW_MS}ms dan sekin)`);
  }

  // Dinamik marshrutlar jim o'tkazib yuborilmaydi — nima tekshirilmagani ko'rinsin
  if (dynamic.length) {
    console.log(`\nTekshirilmadi (dinamik segment, namuna kerak): ${dynamic.length} ta`);
    for (const d of dynamic) console.log(`        ${d.route}`);
  }

  if (failures.length) {
    console.error(`\n${failures.length} ta nosozlik:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('\nHammasi joyida.');
}

void main();
