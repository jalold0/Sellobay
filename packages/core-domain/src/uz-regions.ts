// O'zbekiston hududlari — checkout'da mijoz avval shuni tanlaydi.
//
// Qoida (ADR 0015 va zone.ts): uygacha yetkazish FAQAT Toshkent shahri;
// boshqa hududlarda — olib ketish punkti (filial). Web va mobil bir xil
// ro'yxatdan foydalanadi; nomlar `@ecom/i18n` da (`regions.<slug>`).
//
// Bazadagi matnlar (PickupPoint.region/city, eski manzillar) har xil
// yozilgan: "Toshkent", "Tashkent", "Farg'ona", "Фергана"... Shuning
// uchun hududni matndan aniqlash `regionSlugFromText` orqali.

export const UZ_REGIONS = [
  { slug: 'toshkent-shahri', uz: 'Toshkent shahri', aliases: [] as string[] },
  { slug: 'toshkent-viloyati', uz: 'Toshkent viloyati', aliases: [] as string[] },
  { slug: 'andijon', uz: 'Andijon viloyati', aliases: ['andijon', 'andijan', 'андижан'] },
  { slug: 'buxoro', uz: 'Buxoro viloyati', aliases: ['buxoro', 'bukhara', 'buxara', 'бухар'] },
  {
    slug: 'fargona',
    uz: "Farg'ona viloyati",
    aliases: ['fargona', 'fergana', 'ferghana', 'фергана', 'фаргона'],
  },
  { slug: 'jizzax', uz: 'Jizzax viloyati', aliases: ['jizzax', 'jizzakh', 'jizax', 'джизак'] },
  {
    slug: 'xorazm',
    uz: 'Xorazm viloyati',
    aliases: ['xorazm', 'khorezm', 'urganch', 'urgench', 'хорезм', 'ургенч'],
  },
  { slug: 'namangan', uz: 'Namangan viloyati', aliases: ['namangan', 'наманган'] },
  { slug: 'navoiy', uz: 'Navoiy viloyati', aliases: ['navoiy', 'navoi', 'навои'] },
  {
    slug: 'qashqadaryo',
    uz: 'Qashqadaryo viloyati',
    aliases: ['qashqadaryo', 'kashkadarya', 'qarshi', 'karshi', 'кашкадар', 'карши'],
  },
  {
    slug: 'qoraqalpogiston',
    uz: "Qoraqalpog'iston Respublikasi",
    aliases: ['qoraqalpog', 'karakalpak', 'nukus', 'каракалпак', 'нукус'],
  },
  { slug: 'samarqand', uz: 'Samarqand viloyati', aliases: ['samarqand', 'samarkand', 'самарканд'] },
  {
    slug: 'sirdaryo',
    uz: 'Sirdaryo viloyati',
    aliases: ['sirdaryo', 'syrdarya', 'guliston', 'gulistan', 'сырдар', 'гулистан'],
  },
  {
    slug: 'surxondaryo',
    uz: 'Surxondaryo viloyati',
    aliases: ['surxondaryo', 'surkhandarya', 'termiz', 'termez', 'сурхандар', 'термез'],
  },
] as const;

export type UzRegionSlug = (typeof UZ_REGIONS)[number]['slug'];

export const TASHKENT_CITY_REGION: UzRegionSlug = 'toshkent-shahri';

export function isUzRegionSlug(v: unknown): v is UzRegionSlug {
  return typeof v === 'string' && UZ_REGIONS.some((r) => r.slug === v);
}

/** Uygacha yetkazish mumkinmi (faqat Toshkent shahri). */
export function regionAllowsHomeDelivery(slug: UzRegionSlug): boolean {
  return slug === TASHKENT_CITY_REGION;
}

/** Buyurtmaga yoziladigan hudud nomi (o'zbekcha, bazadagi boshqa yozuvlar bilan bir xil uslub). */
export function regionName(slug: UzRegionSlug): string {
  return UZ_REGIONS.find((r) => r.slug === slug)?.uz ?? slug;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ʻʼ'`’‘]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const TASHKENT_WORDS = ['toshkent', 'tashkent', 'ташкент'];
const PROVINCE_WORDS = ['viloyat', 'oblast', 'област', 'region', 'вилоят'];

/**
 * Bazadagi hudud/shahar matnidan hudud slug'i. Aniqlab bo'lmasa `null`.
 *
 * Toshkent alohida: "Toshkent viloyati" / "Ташкентская область" —
 * viloyat; "Toshkent" (yoki shahar nomi Toshkent) — shahar.
 */
export function regionSlugFromText(region: string, city = ''): UzRegionSlug | null {
  const r = normalize(region);
  const c = normalize(city);
  const both = `${r} ${c}`;

  if (TASHKENT_WORDS.some((w) => both.includes(w))) {
    const regionIsProvince = PROVINCE_WORDS.some((w) => r.includes(w));
    const cityIsTashkent = TASHKENT_WORDS.some((w) => c.includes(w));
    if (regionIsProvince && !cityIsTashkent) return 'toshkent-viloyati';
    if (regionIsProvince && cityIsTashkent && !PROVINCE_WORDS.some((w) => c.includes(w))) {
      // "Toshkent viloyati, Toshkent" — shahar nomi aniq yozilgan.
      return 'toshkent-shahri';
    }
    return regionIsProvince ? 'toshkent-viloyati' : 'toshkent-shahri';
  }

  for (const reg of UZ_REGIONS) {
    if (reg.aliases.some((a) => both.includes(a))) return reg.slug;
  }
  return null;
}
