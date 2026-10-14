// Kategoriya daraxtini (Ayollar, Erkaklar, Bolalar, ...) bazaga qo'llaydi.
//
// Nima qilishi va nega — `prisma/kategoriya-daraxti.ts` izohida.
// Avval HAR DOIM tekshiruv rejimida ko'ring:
//
//   pnpm --filter @ecom/database categories:tree --tekshir   (faqat ko'rsatadi)
//   pnpm --filter @ecom/database categories:tree             (yozadi)
//
// DATABASE_URL qaysi bazaga qarasa — o'shanga yozadi. Prod uchun prod
// URL bilan ishga tushiring.

import { PrismaClient } from '@prisma/client';

import { applyCategoryTree } from '../prisma/kategoriya-daraxti';

const dryRun = process.argv.includes('--tekshir');
const prisma = new PrismaClient();

async function main() {
  const host = (process.env.DATABASE_URL ?? '').replace(/^.*@/, '').replace(/\/.*$/, '');
  console.info(
    `Baza: ${host || '(DATABASE_URL yo‘q)'}${dryRun ? ' — TEKSHIRUV, hech narsa yozilmaydi' : ''}`,
  );

  const r = await applyCategoryTree(prisma, dryRun);
  const show = (title: string, list: string[]) =>
    console.info(`\n${title} (${list.length}):${list.length ? '\n  ' + list.join('\n  ') : ' —'}`);
  show('Yaratiladi', r.created);
  show('Bo‘lim ichiga ko‘chiriladi', r.reparented);
  show('Tartib beriladi', r.positioned);
  show('Nofaol qilinadi (bog‘lanishlar saqlanadi)', r.retired);
  console.info(`\nMahsulot yangi turlarga bog‘lanadi: ${r.linked} ta bog‘lanish`);
  if (dryRun) console.info('\nYozish uchun --tekshir siz qayta ishga tushiring.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
