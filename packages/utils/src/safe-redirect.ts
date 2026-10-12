// Ichki qayta yo'naltirish manzilini tekshirish — sof yordamchi.
//
// Foydalanuvchidan kelgan `next` parametri to'g'ridan-to'g'ri redirect'ga
// berilsa, saytimiz begona manzilga olib boruvchi vositaga aylanadi
// (open redirect): hujumchi `?next=https://evil.com` havolasini tarqatib,
// qurbon bizning domendan chiqib ketganini sezmasligi mumkin.

/**
 * Faqat AYNI sayt ichidagi yo'lni qaytaradi. Har qanday shubhali qiymat
 * uchun bosh sahifa (`/`) beriladi.
 *
 * Rad etiladi:
 *   • `https://evil.com` — mutlaq manzil;
 *   • `//evil.com` — protokol-nisbiy manzil (brauzer uni tashqi deb oladi);
 *   • backslash bo'lgan qiymatlar — ba'zi brauzerlar `\` ni `/` deb talqin
 *     qiladi, ya'ni `/\evil.com` `//evil.com` kabi ishlashi mumkin.
 */
export function safeInternalPath(raw: string | null | undefined): string {
  if (!raw) return '/';
  if (!raw.startsWith('/')) return '/';
  if (raw.startsWith('//')) return '/';
  if (raw.includes('\\')) return '/';
  return raw;
}
