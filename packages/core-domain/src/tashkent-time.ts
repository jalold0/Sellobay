// Toshkent vaqti (UTC+5) bo'yicha kun chegaralari.
//
// Server (Vercel) UTC'da ishlaydi: `toISOString().slice(0, 10)` yoki `setHours(0)` UTC kunini
// beradi va kechki 19:00 dan keyingi buyurtmalar ertangi kunga tushardi (audit P4).
// O'zbekistonda 2005 yildan beri yozgi vaqt yo'q — qat'iy siljish to'g'ri.

export const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Toshkent kunining boshlanishi (UTC `Date` sifatida). */
export function tashkentDayStart(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + TASHKENT_OFFSET_MS);
  const midnightUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
  return new Date(midnightUtc - TASHKENT_OFFSET_MS);
}

/** Toshkent bo'yicha sana kaliti `YYYY-MM-DD` (grafik kunlari uchun). */
export function tashkentDateKey(date: Date | string): string {
  return new Date(new Date(date).getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

/** Oxirgi `days` Toshkent kunining kalitlari, eskisidan bugungacha. */
export function lastTashkentDays(days: number, now: Date = new Date()): string[] {
  const today = tashkentDayStart(now).getTime();
  return Array.from({ length: days }, (_, i) =>
    tashkentDateKey(new Date(today - (days - 1 - i) * DAY_MS)),
  );
}
