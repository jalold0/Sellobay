// Tarjimalarni Flutter ilovalariga sinxronlaydi.
//
// NEGA NUSXA KO'CHIRAMIZ, QAYTA YOZMAYMIZ:
// Tarjima matni YAGONA manbada — `packages/i18n/src/locales/*.json`.
// Flutter uchun alohida ARB fayllar yuritish ikkinchi manba yaratardi va
// ular vaqt o'tib bir-biridan uzoqlashardi (auditda aynan shu toifadagi
// nuqsonlar ko'p chiqqan edi). Shuning uchun JSON AYNAN o'sha holida
// ko'chiriladi, Dart tomoni esa next-intl kabi nuqtali kalit bo'yicha
// qidiradi: t('cart.title').
//
// Fayllar generatsiya qilinadi — ularni QO'LDA TAHRIRLAMANG.
//
// Ishga tushirish (repo root'dan):
//   pnpm flutter:i18n

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES = ['uz', 'ru', 'en'] as const;
const SRC = join('packages', 'i18n', 'src', 'locales');
const DEST = join('apps', 'flutter', 'shared', 'assets', 'i18n');

function countKeys(value: unknown): number {
  if (value === null || typeof value !== 'object') return 1;
  return Object.values(value as Record<string, unknown>).reduce<number>(
    (sum, v) => sum + countKeys(v),
    0,
  );
}

mkdirSync(DEST, { recursive: true });

let total = 0;
for (const locale of LOCALES) {
  const from = join(SRC, `${locale}.json`);
  const to = join(DEST, `${locale}.json`);

  // Nusxadan oldin JSON'ligini tekshiramiz — buzuq fayl Flutter'da ishga
  // tushish paytida yiqilishga olib keladi, buni shu yerda ushlaymiz.
  const parsed: unknown = JSON.parse(readFileSync(from, 'utf8'));
  const keys = countKeys(parsed);
  copyFileSync(from, to);
  console.log(`  ${locale}.json -> ${keys} kalit`);
  total = keys;
}

// Dart tomoni kalit yo'qligini ishga tushish paytida bilsin.
writeFileSync(
  join(DEST, 'README.md'),
  [
    '# Generatsiya qilingan — tahrirlamang',
    '',
    'Bu fayllar `packages/i18n/src/locales/` dan `pnpm flutter:i18n` bilan',
    'ko`chiriladi. Tarjimani O`SHA YERDA o`zgartiring, bu yerda emas.',
    '',
    `Oxirgi sinxron: ${total} kalit (uz/ru/en).`,
    '',
  ].join('\n'),
  'utf8',
);

console.log(`\nTayyor: ${DEST}`);
