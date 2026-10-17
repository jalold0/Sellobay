# Audit qamrovi

## Holat belgilari

| Belgi          | Ma'nosi                                                                 |
| -------------- | ----------------------------------------------------------------------- |
| **PASS**       | Tekshirildi, jiddiy muammo topilmadi (yuzaki ko'rinish emas, dalil bor) |
| **FAIL**       | Tekshirildi, P1 yoki bir nechta P2 topildi                              |
| **PARTIAL**    | Bir qismi tekshirildi yoki aralash natija                               |
| **NOT TESTED** | Muhit, kirish huquqi yoki vaqt yetmadi                                  |
| **N/A**        | Bu ilovaga taalluqli emas                                               |

## Ilovalar

| Ilova                                    | Qamrov                                                           |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `apps/web` (Next.js 14, mijoz sayti)     | To'liq: kod + prod brauzer + Lighthouse                          |
| `apps/flutter/customer` + `shared`       | Kod + analyzer va testlar. Qurilmada qo'lda sinov o'tkazilmagan. |
| admin, seller, telegram-mini-app, kuryer | Qamrovdan tashqarida (foydalanuvchi qarori)                      |

## Web sahifalari (`apps/web/src/app/[locale]`)

Jami: ~45 ta yo'l topildi va hammasining kodi inventarizatsiya qilindi.

**Prod'da brauzerda ochilgan sahifalar (8 ta):** `/uz`, `/uz/catalog`, `/uz/product/puma-rs-x-sneakers`, `/uz/product/nike-air-max-270`, `/uz/cart`, `/uz/orders`, `/uz/login`, `/uz/help`.

**Lokal muhitda sinalgan (`localhost`, seed test hisoblari bilan):** `/uz/orders` (topshirish kodi kartasi), admin `/labels`.

| Yo'l                                                         | Kod        | Brauzer                          | Holat                            |
| ------------------------------------------------------------ | ---------- | -------------------------------- | -------------------------------- |
| `/` bosh sahifa                                              | ✓          | prod: telefon + kompyuter        | PARTIAL (PERF-01, TRU-02, UX-03) |
| `/catalog`                                                   | ✓          | prod: telefon                    | PARTIAL (FUN-08)                 |
| `/product/[slug]`                                            | ✓          | prod: telefon                    | FAIL (UX-01, FUN-02, SEC-01)     |
| `/cart`                                                      | ✓          | prod: telefon                    | PARTIAL (SEO-01)                 |
| `/checkout`                                                  | ✓          | faqat Lighthouse (bo'sh savat)   | PARTIAL (FUN-06, A11Y-01, UX-02) |
| `/orders` (kuzatish)                                         | ✓          | prod + lokal                     | PASS                             |
| `/orders/success`                                            | ✓          | —                                | PARTIAL (FUN-06)                 |
| `/login`, `/register`                                        | ✓          | prod: telefon + kompyuter        | FAIL (FUN-01, SEC-03, UX-02)     |
| `/forgot-password`                                           | ✓          | prod: 200                        | FAIL (FUN-03)                    |
| `/profile/*` (8 ta sahifa)                                   | ✓          | NOT TESTED (prod'da kirish yo'q) | PARTIAL (FUN-04, FUN-05, UX-04)  |
| `/brand/[slug]`, `/sale`, `/search`, `/group-buy`, `/global` | ✓ (yuzaki) | —                                | PARTIAL                          |
| Statik sahifalar (19 ta)                                     | ✓          | `/help` prod                     | FAIL (TRU-01, SEO-02)            |

## Asosiy oqimlar

| Oqim                                            | Kod | Ishlayotgan tizimda                                                     | Natija                               |
| ----------------------------------------------- | --- | ----------------------------------------------------------------------- | ------------------------------------ |
| Bosh sahifa → katalog → mahsulot                | ✓   | prod (ko'rish)                                                          | Ishlaydi, kamchiliklari bilan        |
| Savat → checkout → buyurtma                     | ✓   | lokal (5-bosqichda), prod'da NOT TESTED (buyurtma yaratish taqiqlangan) | Ishlaydi (kod)                       |
| Onlayn to'lov (Click/Payme)                     | ✓   | NOT TESTED                                                              | Qisman (FUN-06)                      |
| Kirish: email + parol                           | ✓   | lokal                                                                   | Ishlaydi                             |
| Kirish: telefon OTP                             | ✓   | prod'da kod kelmaydi                                                    | Buzilgan (FUN-01)                    |
| Parolni tiklash                                 | ✓   | —                                                                       | Soxta (FUN-03)                       |
| Buyurtmani kuzatish (mehmon)                    | ✓   | prod + lokal                                                            | Ishlaydi                             |
| Qaytarish (web)                                 | ✓   | —                                                                       | Yo'q (FUN-07)                        |
| Sharh qoldirish                                 | ✓   | NOT TESTED                                                              | Ishlaydi (kod)                       |
| Flutter: kirish, katalog, checkout, buyurtmalar | ✓   | avtomatik testlar bilan                                                 | Ishlaydi, MOB-\* kamchiliklari bilan |

## Yo'nalishlar bo'yicha holat

| Yo'nalish                    | Holat                     | Asos                                                                                    |
| ---------------------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| Funksional to'liqlik         | FAIL                      | FUN-01…06 (soxta oqimlar prod'da)                                                       |
| Xavfsizlik va maxfiylik      | FAIL                      | SEC-01, SEC-02 (P1, kodda)                                                              |
| UI/UX                        | PARTIAL                   | UX-01…04, TRU-01, TRU-02                                                                |
| Responsive                   | FAIL                      | UX-01 (mahsulot sahifasi, telefon)                                                      |
| Tezlik                       | PARTIAL                   | Lighthouse mobil 37–65; prod'dagi real foydalanuvchilar ma'lumoti yo'q                  |
| Accessibility                | PARTIAL                   | Lighthouse 90–96, kontrast va yorliq xatolari                                           |
| Arxitektura va kod sifati    | PASS (kamchiliklar bilan) | typecheck toza, domen qatlami aniq; MNT-01/02                                           |
| API integratsiyasi           | PARTIAL                   | UX-04, timeout yo'q                                                                     |
| SEO                          | PARTIAL                   | Lighthouse SEO 100, lekin SEO-01/02                                                     |
| Testlar va relizga tayyorlik | PARTIAL                   | web 119 test o'tdi; Flutter release imzosi (MOB-03), crash monitoring yo'q              |
| i18n                         | PARTIAL                   | kalitlar 3 tilda teng (1274), lekin statik sahifalar va server xatolari faqat o'zbekcha |

## Cheklovlar

- Prod'da hech narsa yaratilmadi va o'zgartirilmadi (buyurtma, to'lov, akkaunt). Shu sabab to'lov va profil oqimlari prod'da sinalmagan.
- XSS (SEC-01) va OTP (SEC-02) prod'da ataylab sinalmadi, ular kodda tasdiqlangan.
- `pnpm audit` Node fatal xatosi bilan yiqildi, bog'liqliklarning zaifliklari tekshirilmadi (`audit-methodology.md`).
- Lighthouse bitta o'lchov, laboratoriya sharoitida o'tkazildi. Haqiqiy foydalanuvchi ma'lumotlari (CrUX) yo'q.
- Flutter ilovasi qurilmada qo'lda sinalmadi (o'rnatilgani 5-bosqichda tekshirilgan). iOS build qilinmagan.
- Ekranni o'qish dasturi va klaviatura bilan qo'lda sinov o'tkazilmagan. Accessibility xulosasi Lighthouse va kod tekshiruviga asoslangan.
