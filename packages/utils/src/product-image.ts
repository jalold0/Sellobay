// Mahsulot rasmi manzilini hisoblash — BARCHA ilovalar uchun yagona manba.
//
// NEGA bu shu yerda turadi:
// Ilgari har bir ilova rasm manzilini o'zicha hisoblardi va ular BIR-BIRIGA MOS
// EMAS edi — web haqiqiy fayllarni ko'rsatardi, mobil/admin esa picsum.photos'ni.
// Ya'ni bitta mahsulot saytda bir rasm, telefonda butunlay boshqa rasm bilan
// chiqardi. Mantiq bitta joyda bo'lsa, bunday farq umuman paydo bo'lmaydi.
//
// Bazada nima bor:
//   • Blob manzili — sotuvchi yuklagan haqiqiy rasm. To'g'ridan-to'g'ri ishlatiladi.
//   • picsum.photos/seed/<seed>/... — seed ma'lumotidan qolgan TASODIFIY rasm
//     xizmati. U mahsulotga aloqasi yo'q rasm qaytaradi, shuning uchun uni
//     ko'rsatmaymiz: seed'ga qarab repodagi haqiqiy rasmni topamiz.
//   • bo'sh — placeholder.

/**
 * `apps/web/public/products/` da haqiqiy rasmi bor seed'lar.
 *
 * Bu ro'yxat vaqtinchalik: sotuvchilar o'z rasmlarini yuklagani sari seed
 * mahsulotlar almashadi va ro'yxat qisqaradi. Fayl qo'shsangiz shu yerga ham
 * yozing — aks holda placeholder chiqadi.
 */
const LOCAL_PRODUCT_IMAGE_SEEDS = new Set([
  'accessories-1',
  'adidas-tee',
  'adidas-ub',
  'beauty-1',
  'chanel-no5',
  'clothing-1',
  'cosmetics-1',
  'dior-sauvage',
  'e2e-moderatsiya-f1315062',
  'e2e-test-krossovka',
  'gucci-bag',
  'gucci-marmont',
  'la-mer',
  'mac-ruby',
  'nike-air-max',
  'nike-hoodie',
  'nike99',
  'perfume-1',
  'prada-bag',
  'puma-rsx',
  'shoes-1',
  'variant-test-futbolka',
  'zara-blazer',
  'zara-shirt',
]);

/** Rasmi yo'q mahsulot uchun neytral belgi (repoda turadi). */
export const PRODUCT_IMAGE_PLACEHOLDER = '/products/_placeholder.svg';

const PICSUM_SEED_RE = /picsum\.photos\/seed\/([^/]+)\//;

/** picsum manzilidan seed'ni ajratadi. picsum bo'lmasa — null. */
export function picsumSeed(url: string | null | undefined): string | null {
  if (!url) return null;
  return PICSUM_SEED_RE.exec(url)?.[1] ?? null;
}

/** Bu manzil haqiqiy mahsulot rasmimi yoki seed qoldig'imi. */
export function isRealProductImageUrl(url: string | null | undefined): boolean {
  return Boolean(url) && picsumSeed(url) === null;
}

/**
 * Ko'rsatishga tayyor manzil qaytaradi.
 *
 * @param dbUrl   Bazadagi qiymat (Blob manzili, picsum yoki bo'sh)
 * @param slug    Mahsulot slug'i — picsum seed'i topilmasa zaxira kalit
 * @param baseUrl Absolut manzil kerak bo'lsa sayt manzili. Mobil ilova va
 *                boshqa domendagi panellar uchun SHART: ular `/products/x.jpg`
 *                kabi nisbiy yo'lni o'zi hal qila olmaydi.
 */
export function resolveProductImageUrl(
  dbUrl: string | null | undefined,
  slug: string,
  baseUrl = '',
): string {
  // Sotuvchi yuklagan haqiqiy rasm — o'zgartirmasdan ishlatamiz.
  if (isRealProductImageUrl(dbUrl)) return dbUrl as string;

  const seed = picsumSeed(dbUrl) ?? slug;
  const path = LOCAL_PRODUCT_IMAGE_SEEDS.has(seed)
    ? `/products/${seed}.jpg`
    : PRODUCT_IMAGE_PLACEHOLDER;

  return baseUrl ? `${baseUrl.replace(/\/$/, '')}${path}` : path;
}

/** Faqat seed ma'lum bo'lganda (mock ekranlar) ishlatiladi. */
export function productImageBySeed(seed: string, baseUrl = ''): string {
  return resolveProductImageUrl(null, seed, baseUrl);
}
