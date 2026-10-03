# ADR 0009 — Mobil ilovalar Flutter'ga o'tkaziladi; biznes qoidalari Dart'ga NUSXALANMAYDI

- **Sana:** 2026-10-03
- **Holat:** Qabul qilingan
- **Kontekst:** `apps/mobile` (Expo/React Native, ~15 000 satr) va `apps/courier`
  (amalda bo'sh skelet) Flutter'da qayta yoziladi

## Qaror

Mijoz va kuryer mobil ilovalari Flutter'da yoziladi. Ular **shu monorepo
ichida** — `apps/flutter/` — turadi va pnpm workspace'dan chiqariladi.

Eng muhim qism esa boshqa narsa: **biznes qoidalari Dart'ga ko'chirilmaydi.**

## Muammo

Hozirgi Expo ilovasi to'rtta umumiy TypeScript paketidan foydalanadi:

| Paket               | Nima olinadi                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `@ecom/core-domain` | `SHIPPING_FEE`, `EXPRESS_FEE`, `FREE_SHIPPING_THRESHOLD`, `coinsForOrder`, `coinsToSom`, `TIERS`, `TASHKENT_CITY_BBOX` |
| `@ecom/utils`       | `formatMoney`, `isUuid`, rasm URL yordamchilari                                                                        |
| `@ecom/i18n`        | `translate`, `locales`                                                                                                 |
| `@ecom/types`       | umumiy tiplar                                                                                                          |

Dart bu paketlarni import qila olmaydi. Eng oson yo'l — qiymatlarni Dart
konstantalariga ko'chirish. **Bu yo'l rad etildi.**

Sabab tajribadan: `docs/AUDIT-2026-09-04.html` da qayd etilgan nuqsonlarning
eng katta toifasi aynan shu — klient serverdan mustaqil hisoblagan qiymat
vaqt o'tib haqiqatdan uzoqlashadi:

- promokod chegirmasi klientda qotib yozilgan edi (`WELCOME10` = 10%) va
  checkout payload'iga umuman qo'shilmasdi — mijoz chegirmani ko'rib, to'liq
  narx to'lardi;
- «Faqat N ta qoldi» ogohlantirishi massiv indeksidan yasalardi;
- kategoriya sanoqlari kodda qotib yozilgan edi («1 280+ mahsulot»), bazada
  esa sanoqli mahsulot bor edi.

Bitta tilda ham shunday bo'lgan. Ikki tilda — TypeScript va Dart — bu
muqarrar: konstantani bir joyda o'zgartirib, ikkinchisini unutish uchun
bitta shoshilinch tuzatish yetarli.

## Yechim

Qoida **bitta joyda** — `@ecom/core-domain` da — qoladi. TypeScript
bo'lmagan klient uni `GET /api/config` orqali oladi:

```
shipping: { currency, standardFee, expressFee, freeThreshold }
loyalty:  { coinPerSom, coinValueSom, tiers[] }
returns:  { windowDays }
geo:      { tashkentCityBbox }
locales:  ["uz","ru","en"]
```

`apps/web/src/app/api/config/route.test.ts` har bir qiymat `core-domain`
bilan **aynan** bir xilligini tekshiradi. Kimdir konstantani o'zgartirib
endpointni yangilashni unutsa — test yiqiladi.

Tarjimalar ham nusxalanmaydi: `packages/i18n/src/locales/*.json` AYNAN
o'sha holida `pnpm flutter:i18n` bilan Flutter assetlariga ko'chiriladi,
Dart tomoni next-intl kabi nuqtali kalit bo'yicha qidiradi (`t('cart.title')`).
ARB formatiga o'girish ataylab QILINMADI — u ikkinchi manba yaratardi.

## Muhim chegara

`GET /api/config` **faqat ko'rsatish uchun.** Yakuniy pul hisobi baribir
serverda, buyurtma yaratishda qayta hisoblanadi (`apps/web/src/lib/orders-server.ts`)
— klient nimani ko'rsatganidan qat'i nazar. Ya'ni bu endpoint buzilgan yoki
eskirgan bo'lsa ham noto'g'ri summa bilan buyurtma o'tib ketmaydi.

## Nega monorepo ichida

- API shartnomasi va backend shu yerda: endpoint o'zgarsa Flutter klienti
  **bir commitda** yangilanadi;
- tarjimalar bir manbadan sinxronlanadi;
- hozirgi Expo ilovasi ko'chish tugaguncha yonida ishlab turadi.

Flutter'ning o'z toolchain'i bor (pub, Gradle, Xcode), shuning uchun
`apps/flutter/**` pnpm workspace'dan chiqarildi va CI'da alohida job bo'ladi.

## Oqibatlari

**Yaxshi tomoni:** narx, coin va hudud qoidalari bitta joyda qoladi; Flutter
klienti ularni bilishi shart emas. Tarjima ham shunday.

**Narxi:** har bir yangi klient qoidasi uchun `/api/config` ni kengaytirish
kerak — bu ataylab, chunki shu ishqalanish qoidani ikkinchi joyga
ko'chirishdan arzonroq.

**Hali hal qilinmagan:** Expo ilovasi ham `/api/config` ga o'tkazilsa,
`@ecom/core-domain` ga bevosita bog'liqlik butunlay yo'qoladi. Hozircha u
eski yo'lda qoldi — ikkala yo'l ham bir xil manbadan oziqlanadi, shuning
uchun shoshilinch emas.
