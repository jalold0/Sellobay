// Sellobay — Klient konfiguratsiyasi
// GET /api/config — biznes qoidalarining YAGONA manbasi.
//
// NEGA BU ENDPOINT BOR:
// Web va Expo klientlari bu qoidalarni `@ecom/core-domain` paketidan
// to'g'ridan-to'g'ri import qiladi — ular ham TypeScript. Flutter (Dart)
// esa buni qila olmaydi. Qiymatlarni Dart'ga NUSXALASH mumkin edi, lekin
// aynan shu yo'l auditda qayta-qayta nuqson keltirgan: klient o'zi
// hisoblagan narx server bilan vaqt o'tib bir-biridan uzoqlashadi
// (promokod chegirmasi, zaxira soni va h.k.).
//
// Shuning uchun qoida bitta joyda — `@ecom/core-domain` da — qoladi va
// TypeScript bo'lmagan klient uni shu endpoint orqali oladi.
//
// MUHIM: bu endpoint KO'RSATISH uchun. Yakuniy pul hisobi baribir
// serverda, buyurtma yaratishda qayta hisoblanadi (`orders-server.ts`) —
// klient nimani ko'rsatganidan qat'i nazar.

import {
  COIN_PER_SOM,
  COIN_VALUE_SOM,
  EXPRESS_FEE,
  FREE_SHIPPING_THRESHOLD,
  RETURN_WINDOW_DAYS,
  SHIPPING_FEE,
  TASHKENT_CITY_BBOX,
  TIERS,
} from '@ecom/core-domain';
import { locales } from '@ecom/i18n';

import { withApi } from '@/lib/api-handler';

export const runtime = 'nodejs';
// Qoidalar kamdan-kam o'zgaradi — 5 daqiqa kesh yetarli.
export const revalidate = 300;

export const GET = withApi(async () => ({
  shipping: {
    currency: 'UZS',
    standardFee: SHIPPING_FEE,
    expressFee: EXPRESS_FEE,
    /** Shu summadan yuqori buyurtmada yetkazish bepul. */
    freeThreshold: FREE_SHIPPING_THRESHOLD,
  },
  loyalty: {
    /** 1 so'mga nechta coin (1 coin / 1000 so'm). */
    coinPerSom: COIN_PER_SOM,
    /** 1 coin necha so'mga teng (yechishda). */
    coinValueSom: COIN_VALUE_SOM,
    tiers: TIERS,
  },
  returns: {
    /** Yetkazilgandan keyin necha kun ichida qaytarish mumkin. */
    windowDays: RETURN_WINDOW_DAYS,
  },
  geo: {
    /** Toshkent shahri chegarasi — yetkazish hududini tekshirish uchun. */
    tashkentCityBbox: TASHKENT_CITY_BBOX,
  },
  locales,
}));
