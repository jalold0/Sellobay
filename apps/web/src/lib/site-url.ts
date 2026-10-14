// Saytning ommaviy manzili — sitemap, robots, canonical/OG havolalar va to'lovdan qaytish
// (return_url) uchun BITTA manba.
//
// Ilgari har joy `NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'` yozardi. Vercel'da o'zgaruvchi
// qo'yilmagani uchun prod sitemap'da `http://localhost:3000/...` manzillar chiqib turardi.
//
// Tartib: aniq qo'yilgan qiymat → Vercel'ning loyiha prod domeni (tizim o'zgaruvchisi, domen
// ulangach o'zi `sellobay.uz` bo'ladi) → lokal ishlab chiqish.

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelDomain) return `https://${vercelDomain}`;
  return 'http://localhost:3000';
}
