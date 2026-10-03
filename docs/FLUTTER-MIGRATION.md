# Flutter mobil ilovalar — API shartnomasi va tuzoqlar

Qaror va sabablar: [`adr/0009-flutter-mobil-ilovalar.md`](adr/0009-flutter-mobil-ilovalar.md).

Bu hujjat **koddan ko'rinmaydigan** narsalarni yozib qo'yadi. Endpointlar
ro'yxatini `apps/mobile/src/lib/api/` dan ham o'qish mumkin, lekin quyidagi
tuzoqlar o'sha yerda aniq yozilmagan va ularning har biri auditda haqiqiy
nuqson bo'lib chiqqan.

## Backend

Yagona backend — `apps/web` ichidagi Next.js API route'lari
(`apps/web/src/app/api/**`). Mobil ham, web ham **ayni o'sha** API'ga
ulanadi. Alohida mobil backend yo'q.

## Birinchi qadam: `GET /api/config`

Ilova ishga tushganda shuni oling va keshlang. Bu yerda yetkazish narxlari,
coin qoidalari, qaytarish muddati va Toshkent chegarasi bor.

**Bu qiymatlarni Dart konstantasiga ko'chirmang.** Sabab ADR 0009 da.

## Autentifikatsiya

Ikki token, va ular **boshqa-boshqa narsalar**:

- **access** — HS256 JWT, **15 daqiqa** yashaydi. Har so'rovda
  `Authorization: Bearer <access>`.
- **refresh** — JWT **EMAS**. Tasodifiy opaque satr; bazada SHA-256 hash
  sifatida saqlanadi, **30 kun** yashaydi. Uni dekod qilishga urinmang.

Tokenlarni xavfsiz joyda saqlang (`flutter_secure_storage`), oddiy
`SharedPreferences` da emas.

### Yangilash

```
POST /api/auth/refresh
body: { "refresh": "<refresh token>" }
-> { success: true, data: { tokens: { access, refresh } } }
```

Web cookie ishlatadi, mobil **body**. Har ikkisi bitta route'da.

Ikki narsa muhim:

1. **Single-flight.** 401 kelganda bir vaqtda o'nta so'rov yangilashga
   urinmasin — bitta yangilash ketsin, qolganlari uni kutsin. Hozirgi Expo
   ilovasida bu `refreshing` promise orqali qilingan
   (`apps/mobile/src/lib/api/core.ts`).
2. **Tarmoq xatosi ≠ sessiya tugadi.** 401 bo'lsa sessiyani tozalang;
   tarmoq uzilgan bo'lsa TOZALAMANG, aks holda metroda internet yo'qolgani
   uchun foydalanuvchi tizimdan chiqib qoladi.

### Chiqish — e'tibor bering

```
POST /api/auth/logout
body: { "refresh": "<refresh token>" }
```

Buni chaqirmasangiz refresh token bazada **30 kun yaroqli qoladi**.
Telefondagi nusxani o'chirish yetarli emas — telefon boshqa qo'lga o'tsa
yoki zaxiradan tiklansa, o'sha token bilan yangi access olish mumkin.

Bu aynan audit topgan nuqson edi: Expo ilovasi faqat mahalliy nusxani
o'chirardi.

Mahalliy tozalashdan **oldin** yuboring (token hali qo'lda), qisqa timeout
bilan, va xato bo'lsa chiqishni baribir davom ettiring.

## Buyurtma yaratish — `Idempotency-Key`

```
POST /api/orders
header: Idempotency-Key: <har bir urinish uchun BIR XIL uuid>
```

Tarmoq uzilib qayta urinilganda shu sarlavha ikkinchi buyurtma
yaratilishining oldini oladi. Kalitni **foydalanuvchi savatni
o'zgartirgandagina** yangilang, har so'rovda emas — aks holda ma'nosi
yo'qoladi.

Server kalitni xom holda saqlamaydi: buyurtma egasi bilan birga hash
qiladi. Ya'ni ikki mijozning bir xil kaliti to'qnashmaydi.

## Variant (rang/o'lcham) — `variantId` SHART

Savatga qo'shganda va buyurtma berganda `variantId` yuboring. Yubormasangiz
server standart variantni oladi va **boshqa variantning zaxirasi kamayadi**.

Rang/o'lcham ro'yxatini kodga yozmang — `GET /api/products/{slug}` javobidagi
`variants[]` dan oling. Eski Expo ilovasida ular qotib yozilgan edi va
bazadagi variantlarga aloqasi yo'q edi.

## Mock bo'lmagan ID — UUID tekshiruvi

Serverga yuboriladigan `productId` **UUID** bo'lishi shart
(`z.string().uuid()`). Ro'yxatda bitta yaroqsiz id bo'lsa **butun so'rov**
rad etiladi — ya'ni bitta demo element haqiqiy elementlarning sinxronini
ham buzadi.

Savat/sevimlilarni serverga yuborishdan oldin filtrlang.

## Mehmon (login'siz) xarid

Checkout login **talab qilmaydi** — telefon raqami yetarli. Shu sababli:

- `/orders` kuzatuv sahifasi **ataylab ochiq**;
- buyurtma `userId: null`, `guestPhone` bilan yaratiladi;
- kuzatish uchun buyurtma raqami **va** telefon mos kelishi kerak.

Flutter'da ham login'ni majburiy qilmang.

## Savat va sevimlilar sinxroni

```
PUT /api/cart      body: { items: [...], strategy: "merge" | "replace" }
PUT /api/wishlist  body: { productIds: [...] }
```

- Kirishda bir marta `merge` — mahalliy va serverdagi birlashadi.
- Keyingi o'zgarishlarda debounced (~800ms) `replace`.

**Tuzoq:** `merge` dan keyin faqat serverda bor elementlar ro'yxatga
tushmasa, keyingi `replace` ularni serverdan **o'chirib** tashlaydi — ya'ni
boshqa qurilmada qo'shilgan tovar yo'qoladi. Server javobida faqat id va son
bo'ladi, shuning uchun yetishmagan mahsulotlarni
`GET /api/products?ids=a,b,c` bilan olib, ro'yxatga qo'shing.

## Pul

Javoblarda pul **satr** sifatida keladi (`Decimal` → string). Dart'da
`double` ga o'girmang — `Decimal` paketi yoki butun tiyin ishlating.
Ko'rsatishda `/api/config` dagi `currency` bilan formatlang.

## Endpointlar

Hozirgi mobil ilova ishlatadigan to'liq ro'yxat:

| Endpoint                                        | Izoh                                                                    |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| `GET /api/config`                               | **yangi** — biznes qoidalari                                            |
| `GET /api/products`                             | `?ids=`, `?category=`, `?brand=`, `?q=`, `?sort=`, `?limit=`, `?scope=` |
| `GET /api/products/{slug}`                      | detal + `variants[]`                                                    |
| `GET /api/categories`, `GET /api/brands`        | navigatsiya                                                             |
| `POST /api/auth/...`                            | `login`, `register`, `otp`, `refresh`, `logout`, `me`                   |
| `GET/PUT /api/cart`                             | sinxron                                                                 |
| `GET/PUT/POST/DELETE /api/wishlist`             | sinxron                                                                 |
| `GET/POST /api/orders`, `GET /api/orders/{id}`  | buyurtmalar                                                             |
| `POST /api/orders/{id}/cancel`, `/return`       | bekor qilish, qaytarish                                                 |
| `GET/POST/PATCH/DELETE /api/addresses`          | manzillar                                                               |
| `GET /api/payment-methods`                      | saqlangan kartalar                                                      |
| `POST /api/payments/create`                     | onlayn to'lov (Click/Payme)                                             |
| `GET /api/promo`, `POST /api/promo/validate`    | promokod                                                                |
| `GET /api/loyalty`, `POST /api/loyalty/checkin` | coin                                                                    |
| `GET /api/pickup-points`                        | topshirish punktlari                                                    |
| `GET /api/group-buy`                            | guruh xaridi (mobilda hali yo'q)                                        |

Javob shakli hamma joyda bir xil:

```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

`message` — foydalanuvchiga ko'rsatish uchun tayyor o'zbekcha matn.

## Tarjimalar

`pnpm flutter:i18n` — `packages/i18n/src/locales/*.json` ni
`apps/flutter/shared/assets/i18n/` ga ko'chiradi (1029 kalit × 3 til).

Dart tomoni next-intl kabi nuqtali kalit bilan qidiradi: `t('cart.title')`.
ARB formatiga o'girmang — u ikkinchi manba yaratadi.

Tarjimani **har doim** `packages/i18n` da o'zgartiring. Paritetni
`npx tsx scripts/i18n-check.ts` tekshiradi (CI'da ham).
