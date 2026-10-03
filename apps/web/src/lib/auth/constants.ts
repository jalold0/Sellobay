// Auth konfiguratsiyasi. Sirlar env'dan keladi.

/**
 * HS256 uchun eng qisqa maqbul kalit uzunligi. 32 bayt (256 bit) — algoritmning
 * chiqish uzunligi; bundan qisqa kalit brute-force uchun ochiq qoladi.
 */
const MIN_SECRET_LENGTH = 32;

/**
 * Access token kalitini QAT'IY talab qiladi.
 *
 * Ilgari bu yerda `ACCESS_SECRET = process.env.JWT_SECRET ?? ''` turardi va
 * uni tekshirish uchun yozilgan `assertAuthEnv()` HECH QAYERDA chaqirilmasdi
 * (o'lik kod). jose esa BO'SH kalit bilan HS256 tokenini ham imzolaydi, ham
 * tasdiqlaydi — ya'ni JWT_SECRET qo'yilmagan muhitda ilova "ishlab" turardi,
 * lekin imzo kaliti hammaga ma'lum (bo'sh satr) bo'lgani uchun istalgan odam
 * `roles: ['ADMIN']` tokenini o'zi yasab, admin sifatida kirishi mumkin edi.
 * Xato jim edi: hech qanday ogohlantirish chiqmasdi.
 *
 * Modul yuklanganda emas, ISHLATILGANDA tashlanadi — Next build vaqtida
 * (CI'da JWT_SECRET yo'q) modullar import qilinadi, lekin token imzolanmaydi.
 */
export function requireAccessSecret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error(
      'JWT_SECRET muhit o`zgaruvchisi qo`yilmagan. Auth ishlamaydi — ' +
        'bo`sh kalit bilan token imzolash butun avtorizatsiyani ochib qo`yadi.',
    );
  }
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET juda qisqa (${value.length} belgi). Kamida ${MIN_SECRET_LENGTH} belgi kerak.`,
    );
  }
  return value;
}

/**
 * Middleware uchun: kalit yaroqli bo'lsa qaytaradi, aks holda `null`.
 * Middleware har so'rovda ishlaydi — throw qilsak butun sayt 500 beradi.
 * Shuning uchun u YOPIQ tomonga yiqiladi: kalit yo'q → token yaroqsiz →
 * foydalanuvchi login'ga yuboriladi (ochiq qolib ketmaydi).
 */
export function accessSecretOrNull(): string | null {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < MIN_SECRET_LENGTH) return null;
  return value;
}

export const ACCESS_TTL = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
export const REFRESH_TTL_DAYS = 30;

export const COOKIE_ACCESS = 'sb_at';
export const COOKIE_REFRESH = 'sb_rt';

export const OTP_TTL_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;

/**
 * Ikki SMS orasidagi eng kam vaqt (soniya).
 *
 * Bu qoidani `/api/auth/otp/send` qo'llaydi, lekin uni BILISHI kerak
 * bo'lgan tomon — klient: "Qayta yuborish (NNs)" hisoblagichi shunga
 * qarab ishlaydi. Ilgari raqam uch joyda qo'lda yozilgan edi (route,
 * web login-flow, mobil) va ular bir-biridan ajralib ketishi mumkin
 * edi. Endi javobda `resendAfterSec` bo'lib qaytadi.
 */
export const OTP_RESEND_COOLDOWN_SEC = 60;
