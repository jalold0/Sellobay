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

### 401 har doim ham "token eskirgan" degani emas

`/api/auth/login` noto'g'ri parolda ham **401** qaytaradi. Agar
interceptor har 401 da yangilashga urinsa, noto'g'ri parol kiritgan
foydalanuvchining **amaldagi** sessiyasi rotatsiya qilinadi: eski refresh
token bekor bo'ladi va odam tizimdan chiqib ketadi. Shuning uchun quyidagi
yo'llar yangilashdan **chetlatilgan**:

```
/api/auth/login   /api/auth/register   /api/auth/refresh
/api/auth/logout  /api/auth/otp/send   /api/auth/otp/verify
```

(`ApiClient.noRefreshPaths`. Testi: `api_client_auth_test.dart` →
"login dagi 401 da YANGILASH urinilmaydi".)

### Rollar faqat `GET /api/auth/me` da bor

`login`, `register` va `otp/verify` javoblaridagi `user` obyektida
**`roles` YO'Q** — ular qisqartirilgan. Rolga qarab qaror qabul qiladigan
ilova (masalan kuryer) kirishdan keyin **darhol** `me()` chaqirishi kerak.

Kuryer ilovasida rol mos kelmasa sessiyani **serverda ham** bekor qiling
(`POST /api/auth/logout`). Faqat mahalliy tozalash yetarli emas: bazada
30 kunlik yaroqli refresh token qolib ketadi.

### `null` yubormang — maydonni UMUMAN qo'shmang

`registerSchema` da `email`, `phone`, `firstName`, `lastName`
`.optional()` — ya'ni **yo'q bo'lishi** mumkin, lekin **`null` bo'lishi
mumkin emas**. `{"email": null}` yuborilsa server `400 VALIDATION` beradi.

Dart tomonida buni `AuthRepository._compact()` qiladi.

### Ro'yxatdan o'tish ikki xil tugaydi

| So'rov             | Javob                                                 |
| ------------------ | ----------------------------------------------------- |
| `role: "customer"` | `{ user, pendingApproval: false, tokens }`            |
| `role: "seller"`   | `{ user, pendingApproval: true }` — **`tokens` YO'Q** |

Sotuvchi admin tasdiqlagunga qadar `status: PENDING` va sessiya olmaydi.
Javobni ko'r-ko'rona `data.tokens` deb o'qisangiz, shu yerda yiqilasiz.

### OTP

```
POST /api/auth/otp/send    { phone }
-> { sent: true, expiresInSec: 300, resendAfterSec: 60 }
```

`resendAfterSec` — "Qayta yuborish (NNs)" hisoblagichi uchun. Raqamni
klientda **yozmang**: qoidani server qo'llaydi (`OTP_RESEND_COOLDOWN_SEC`),
shuning uchun u serverdan keladi.

Cheklovga tushsangiz `429` va `Retry-After` sarlavhasi keladi. IP bo'yicha
cheklovda ham, telefon bo'yicha cheklovda ham.

```
POST /api/auth/otp/verify  { phone, code, firstName? }
```

Bu endpoint **ham kirish, ham ro'yxatdan o'tish**: telefon bazada
bo'lmasa, server foydalanuvchini o'zi yaratadi (`CUSTOMER` roli bilan).
Shuning uchun mijoz ilovasida "telefon bilan ro'yxatdan o'tish" degan
alohida ekran kerak emas — va kuryer ilovasida OTP **berilmaydi**: u
faqat rolsiz hisob yaratib, darhol rad etilishiga olib kelardi.

Telefon har doim E.164 (`+998XXXXXXXXX`) ko'rinishida yuboriladi —
`normalizeUzPhone()` (Dart nusxasi `uz_phone.dart` da, `@ecom/utils`
bilan bir xil, testi bor).

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

Nusxalar **repo'ga kirmaydi** (`.gitignore`). Shu sababli:

- yangi klondan keyin `flutter test` ishlashidan oldin `pnpm flutter:i18n`
  ishga tushirilishi kerak (aks holda `Translations.load` tushunarli
  xabar bilan yiqiladi);
- CI'dagi `flutter-verify` ishi Node'siz image'da ishlagani uchun o'sha
  nusxani `cp` bilan oladi (`.gitlab-ci.yml`).

`apps/flutter/*/build/unit_test_assets/` da eski nusxa qolib ketishi
mumkin: assetlarni o'chirib testni ishlatsangiz, u **baribir o'tadi**.
Haqiqiy CI holatini sinash uchun `build/` ni ham o'chiring.

## Widget testlar — bitta tuzoq

`testWidgets` tanasi **soxta vaqt zonasida** ishlaydi. U yerda asset
o'qish (`rootBundle`) hech qachon tugamaydi va test 10 daqiqalik
timeout'gacha osilib qoladi — xato xabari ham bermaydi.

Tarjimalarni `setUpAll` da yuklang (u oddiy zonada ishlaydi):

```dart
late LocaleController uz;

setUpAll(() async {
  TestWidgetsFlutterBinding.ensureInitialized();
  uz = LocaleController(initialLocale: 'uz');
  await uz.load();
});
```

Soxta backend `package:sellobay_shared/testing.dart` da
(`package:http/testing.dart` naqshi) — ikkala ilova testlari ham o'shandan
foydalanadi.
