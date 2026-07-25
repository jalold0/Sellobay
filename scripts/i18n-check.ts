// I2 — i18n kalit pariteti tekshiruvi. uz/ru/en locale JSON'larining CHUQUR (nested) kalitlarini
// solishtiradi va har bir tilда YETISHMAYOTGAN kalitlarni ko'rsatadi. Farq bo'lsa exit code 1.
//
// Ishga tushirish (repo root'dan): npx tsx scripts/i18n-check.ts

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES = ['uz', 'ru', 'en'] as const;
type Locale = (typeof LOCALES)[number];
const DIR = join('packages', 'i18n', 'src', 'locales');

/** Nested obyektni "a.b.c" ko'rinishidagi tekis kalitlar to'plamiga aylantiradi (barg kalitlar). */
function flatten(obj: unknown, prefix = '', out = new Set<string>()): Set<string> {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
      else out.add(key);
    }
  }
  return out;
}

function load(locale: Locale): Set<string> {
  const raw = readFileSync(join(DIR, `${locale}.json`), 'utf8');
  return flatten(JSON.parse(raw));
}

function main() {
  const keys: Record<Locale, Set<string>> = {
    uz: load('uz'),
    ru: load('ru'),
    en: load('en'),
  };
  // Barcha tillardagi kalitlar birlashmasi — referens
  const all = new Set<string>([...keys.uz, ...keys.ru, ...keys.en]);

  let totalMissing = 0;
  console.log('\n=== i18n KALIT PARITETI (uz/ru/en) ===');
  console.log(`Jami noyob kalitlar (birlashma): ${all.size}`);
  for (const loc of LOCALES) {
    const missing = [...all].filter((k) => !keys[loc].has(k)).sort();
    console.log(`\n[${loc}] ${keys[loc].size} kalit · yetishmaydi: ${missing.length}`);
    for (const k of missing) console.log(`   − ${k}`);
    totalMissing += missing.length;
  }
  console.log(
    `\nNatija: ${totalMissing === 0 ? '0 farq ✅' : `${totalMissing} yetishmayotgan kalit ❌`}`,
  );
  process.exitCode = totalMissing === 0 ? 0 : 1;
}

main();
