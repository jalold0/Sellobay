/**
 * Telefon (SMS kod) bilan kirish hozir ishlaydimi.
 *
 * SMS provayder (Eskiz/PlayMobile) hali ulanmagan: lokal muhitda kod server log'iga
 * yoziladi, production'da esa umuman yuborilmaydi. Ilgari production'da ham «kod
 * yuborildi» deb javob berilar va login'da «Telefon» tabi ko'rinardi — mijoz kodni
 * kutib, kira olmasdi (audit FUN-01).
 *
 * Provayder ulanganda bu funksiya uning sozlanganini tekshiradigan bo'ladi.
 */
export function phoneLoginAvailable(): boolean {
  return process.env.NODE_ENV !== 'production';
}
