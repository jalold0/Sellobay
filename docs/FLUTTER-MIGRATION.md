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

## Katalog

### Javob shakli BOSHQACHA — `{success,data}` yo'q

Katalog route'lari auth route'laridan oldin yozilgan va foydali yukni
to'g'ridan-to'g'ri qaytaradi:

```
GET /api/products   -> { items, total, page, limit, hasMore }
GET /api/products/{slug} -> { ...mahsulot }
GET /api/categories -> { items }
GET /api/brands     -> { items }
xato               -> { "error": "..." }   (404 / 500)
```

Shuning uchun Dart tomonida `ApiClient.getRaw()` ishlatiladi. `get()` bilan
chaqirsangiz muvaffaqiyatli javob ham xato deb qabul qilinadi (`success`
maydoni yo'q) va tushunarsiz `UNKNOWN` chiqadi — testi bor.

### `name` ko'p tilli, `brand.name` esa ODDIY SATR

`Product.name` va `Category.name` bazada `Json` (`{ uz, ru, en }`),
`Brand.name` esa `String`. Ularni aralashtirib yubormang.

Ko'p tilli matnni har doim `LocalizedText.pick(locale)` orqali o'qing.
Zaxira zanjiri `@ecom/i18n` dagi `pickLocalized()` bilan bir xil, shu
jumladan **bo'sh satr ham qiymat** hisoblanadi: aks holda bitta mahsulot
saytda bo'sh, telefonda to'ldirilgan bo'lib ko'rinardi.

### Pul — satr

`price` va `oldPrice` `Decimal(14,2)` dan satr bo'lib keladi
(`"990000"`). `double` ga o'tkazmang — `parseMoney()` bilan `Decimal`
qiling, ko'rsatish uchun `formatMoney()`.

### Rasm manzili XOM holda keladi

`imageUrl` bazadagi qiymat va u ko'pincha
`picsum.photos/seed/<seed>/...` bo'ladi — bu seed ma'lumotidan qolgan
TASODIFIY rasm xizmati, mahsulotga aloqasi yo'q. Ko'rsatishdan oldin
`resolveProductImageUrl()` dan o'tkazing: u seed'dan
`<base>/products/<seed>.jpg` quradi.

TS tomonidagi `LOCAL_PRODUCT_IMAGE_SEEDS` ro'yxati ATAYLAB
ko'chirilmagan — u repodagi fayllar ro'yxati va o'z izohida
"vaqtinchalik" deb belgilangan. Ikki tilda qo'lda yuritilsa ajralib
ketardi. O'rniga manzil quriladi, fayl topilmasa `ProductThumbnail`
mahalliy belgini chizadi.

### `scope` standart **LOCAL**

Global tovar (Xitoy, 15-17 kun) lokal ro'yxatga tushmasligi kerak:
mijoz "ertaga keladi" deb o'ylab buyurtma bermasin. Global kerak bo'lsa
`?scope=GLOBAL` yoki `ALL` deb aniq so'raladi.

### `/api/categories` BO'SH kategoriyalarni ham qaytaradi

U `fetchTopCategories()` ni beradi — admin bo'sh kategoriyani ko'rishi
kerak. Mijoz ekranida `productCount > 0` bo'yicha filtrlang
(`CatalogRepository.fetchStorefrontCategories()`), aks holda chip bosilib
bo'sh ro'yxat chiqadi. Web'da bu qoida `fetchStorefrontCategories()` da.

### Flutter WEB build API'ga ulana olmaydi

Backend'da CORS sarlavhalari **umuman yo'q**. Native ilova (Android/iOS)
uchun bu muammo emas — brauzerning same-origin qoidasi faqat web'da
ishlaydi. Ya'ni `flutter run -d chrome` bilan katalog bo'sh qoladi.
Sinash uchun Android emulyatori yoki haqiqiy qurilma kerak.

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

## Checkout

### `Idempotency-Key` CHECKOUT BOSHIDA bir marta

Kalit ekran ochilganda hosil qilinadi va qayta urinishlarda
**o'zgarmaydi**. Har yuborishda yangilansa ma'nosi yo'qoladi: tarmoq
uzilib qayta urinilganda server ikkinchi buyurtma yaratardi (zaxira ikki
marta kamayardi, Sello Coins ikki marta sarflanardi).

Server ayni kalitni ikkinchi marta ko'rsa yangi buyurtma yaratmaydi —
birinchisini `replayed: true` bilan qaytaradi. **Bu xato emas**, uni
muvaffaqiyat deb qabul qiling.

### To'lov usullari ro'yxatini KLIENTDA yozmang

```
GET /api/payment-cards -> { cards: [...], providers: ["CASH_ON_DELIVERY", ...] }
```

`providers` — hozir ISHLAYDIGAN usullar. Sozlanmagan provayder (env
kalitlari yo'q) ro'yxatga tushmaydi: kalitsiz `buildClickUrl` baribir
manzil quradi, lekin `service_id` bo'sh bo'lib, mijoz buzuq to'lov
sahifasiga tushadi.

Bu maydon `/api/config` da EMAS va bu ataylab: `/api/config` prerender
qilinadi (build vaqtida statik), ya'ni `process.env` undan deploy
muhitidagi emas, BUILD muhitidagi qiymatni olardi. `/api/payment-cards`
esa `force-dynamic`.

**`UZCARD` (qo'lda karta) Flutter'da qo'llanmaydi:** u chek rasmini
yuklashni talab qiladi (`paymentReceipt` majburiy), aks holda server
`400 RECEIPT_REQUIRED` beradi.

### Mehmon onlayn to'lay olmaydi

`POST /api/orders` auth TALAB QILMAYDI — mehmon buyurtma bera oladi.
Lekin `POST /api/payments/create` auth talab qiladi (401). Shuning uchun
kirmagan foydalanuvchiga faqat naqd pul taklif qilinadi.

### Yakuniy summani SERVER hisoblaydi

Mijozdagi xulosa — taxmin. Buyurtma yaratilgach ekranda serverning
`grandTotal` i ko'rsatiladi: chegirma, yetkazish va coin serverda qayta
hisoblanadi va ikkisi farq qilishi mumkin.

`POST /api/promo/validate` ham faqat OLDINDAN KO'RSATISH — hech narsa
saqlanmaydi, yakuniy chegirma buyurtmada qayta hisoblanadi.

### Yetkazish hududini server tekshiradi

`HOME_DELIVERY` va `EXPRESS` faqat Toshkent shahar uchun. Koordinata
berilsa bbox bo'yicha, bo'lmasa `region`/`city` MATNI bo'yicha
tekshiriladi. Bu mantiqni Dart'ga ko'chirmang — server
`400 DELIVERY_OUT_OF_ZONE` bilan tayyor o'zbekcha xabar qaytaradi.

### Topshirish punktining nomi KO'P TILLI

```json
{
  "name": { "uz": "Andijon markaz", "ru": "ПВЗ Андижан" },
  "region": "Andijon",
  "city": "Andijon",
  "street": "Navoiy 22"
}
```

`name` — `LocalizedText`, `region`/`city`/`street` esa oddiy satr.
Nomni `String` deb o'qisangiz `null` chiqadi va punkt nomsiz ko'rinadi.

### Kutish mumkin bo'lgan biznes xatolari

| Kod                                    | Qachon                              |
| -------------------------------------- | ----------------------------------- |
| `STOCK_INSUFFICIENT`                   | omborda yetarli emas (409)          |
| `DELIVERY_OUT_OF_ZONE`                 | Toshkentdan tashqari uyga yetkazish |
| `PICKUP_REQUIRED` / `PICKUP_NOT_FOUND` | punkt tanlanmagan yoki faol emas    |
| `VARIANT_NOT_FOUND`                    | variant o'chirilgan                 |
| `PRODUCT_NOT_FOUND`                    | mahsulot faol emas                  |
| `DUPLICATE_REQUEST`                    | ayni kalit bilan parallel so'rov    |

Hammasida `message` — foydalanuvchiga ko'rsatishga tayyor matn.

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

Flutter tomonida bu `CartSync` da bajarilgan, testi bor ("FAQAT serverda
bor satr tiklanadi"). Quyidagilar ham shu qatlamning qoidalari:

- **Satr kaliti `productId|variantId`** — serverning o'zi biladigan
  juftlik. Mahalliy kalitni kengaytirib (masalan rangni qo'shib) bo'lmaydi:
  sinxrondan keyin bitta server satri ikkita mahalliy satrga tushib,
  sonlar ikki barobar bo'lardi.
- **`fetchProductsByIds` `scope` YUBORMAYDI.** Server shunday yozilgan:
  id bo'yicha so'ralganda qamrov filtri qo'llanmaydi, lekin `?scope=`
  aniq berilsa hurmat qilinadi. `scope=LOCAL` qo'shilsa, savatdagi
  GLOBAL tovar javobga tushmaydi va sinxron uni savatdan o'chirib
  tashlaydi. `limit` ham beriladi — standart 24 ta uzun savatni qirqadi.
- **Chegaralar:** bitta satrda ko'pi bilan **999** dona, savatda ko'pi
  bilan **100** satr (`z.array(...).max(100)`).
- **Serverda yo'q satr mahalliy savatdan ham o'chadi** — boshqa
  qurilmada o'chirilgan tovar `replace` bilan tirilib chiqmasin.
- **Narx — serverdagi snapshot.** `CartItem.unitPrice` tovar savatga
  qo'shilgan paytdagi narx; katalogdagi joriy narx emas.
- Savat `SharedPreferences` da saqlanadi, `flutter_secure_storage` da
  EMAS: savat maxfiy emas, iOS keychain esa ilova o'chirilganda ham
  saqlanib qoladi — qayta o'rnatilgan ilovada eski savat tirilib
  chiqardi.
- Tizimga kirilmagan bo'lsa `/api/cart` UMUMAN chaqirilmaydi (u 401
  beradi). Mehmon savati faqat telefonda yashaydi.

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

Yana ikkita tuzoq:

- **`pumpAndSettle` + spinner = osilib qolish.** `CircularProgressIndicator`
  cheksiz animatsiya rejalashtiradi, `pumpAndSettle` esa animatsiya
  tugashini kutadi. Yuklanish holatini sinayotganda belgilangan sondagi
  `pump()` chaqiring.
- **Standart test ekrani 800x600** — planshetga o'xshaydi. To'rdagi
  kartochkalar ekrandan chiqib ketadi va `tap` nishonga tegmaydi.
  Telefon o'lchamini qo'ying (`tester.view.physicalSize`) — bu bir
  vaqtning o'zida tor ekrandagi joylashuv xatolarini ham ushlaydi.
- **`ScaffoldMessenger` SnackBar'ni ro'yxatdagi HAR BIR `Scaffold` da
  ko'rsatadi.** Ekran boshqasi ustida turganda bir xil matn ikki marta
  topiladi. `findsWidgets` yoki `.first` ishlating.
- **Marshrut o'tishi 300 ms.** Tugamaguncha pastdagi ekran ham daraxtda
  ko'rinadi. Navigatsiyadan keyin yetarlicha `pump()` qiling, yoki
  tekshiruvni ekranga bog'lang:
  `find.descendant(of: find.byType(CartScreen), matching: ...)`.
- **`ListView` faqat EKRANDAGI bolalarini quradi.** Pastdagi bo'limlar
  (to'lov, promokod, xulosa) suraklanmaguncha daraxtda umuman bo'lmaydi
  va `find` ularni topmaydi — avval `tester.drag` bilan suring.
- **`testWidgets` tanasida tarmoqni KUTMANG.** Soat faqat `pump()` bilan
  suriladi; `pumpWidget` dan oldin `await auth.restore()` qilsangiz test
  osilib qoladi. Bunday tayyorgarlikni `tester.runAsync(() async { ... })`
  ichida bajaring.
- **Fon taymerlari testni yiqitadi** ("A Timer is still pending").
  `CartSync` savat o'zgarganda 800 ms kutadi; `buildRuntime` ga qisqa
  `cartDebounce` bering va yuborishdan keyin yetarlicha `pump()` qiling.
