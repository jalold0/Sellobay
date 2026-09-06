import type { Metadata } from 'next';

/**
 * Topilmagan sahifa uchun metadata.
 *
 * NEGA KERAK: `[locale]/layout.tsx` global `robots: { index: true, follow: true }`
 * qo'yadi va uni barcha sahifalar meros oladi — jumladan `notFound()` chaqirilgan
 * sahifalar ham. Ya'ni "Mahsulot topilmadi" sahifasi Google'ga "meni indeksla"
 * deb aytardi.
 *
 * Buning ustiga Next.js `[locale]` dinamik segmenti bilan sahifa ICHIDAGI
 * `notFound()` uchun HTTP 200 qaytaradi (marshrutning o'zi topilgan; 404 faqat
 * hech qanday marshrut mos kelmaganda beriladi — bu tekshirildi, prod build'da
 * ham shunday). Statusni to'g'rilash uchun ilova ildizini qayta qurish kerak
 * (`app/layout.tsx` + `app/not-found.tsx`), ya'ni tilga bog'liq bo'lmagan
 * ildiz layout — bu alohida ish.
 *
 * `noindex` esa zararning O'ZINI to'xtatadi: status 200 bo'lsa ham Google
 * bunday sahifani indeksga qo'shmaydi.
 */
export function notFoundMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false },
  };
}
