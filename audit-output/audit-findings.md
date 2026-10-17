# Sellobay — mijoz qismi auditi: topilmalar reyestri

Audit sanasi: 2026-10-15 · Kod: `main` @ `a184323` · Prod: https://www.sellobay.uz
Qamrov: mijoz web sayti (`apps/web`, Next.js 14) va Flutter mijoz ilovasi (`apps/flutter/customer` + `apps/flutter/shared`).

## Belgilar

- **Jiddiylik**
  - **P0:** darhol, asosiy vazifani buzadi yoki kritik xavf.
  - **P1:** yuqori, tez hal qilish kerak.
  - **P2:** o'rta.
  - **P3:** past, sayqal.
- **Ishonch**
  - **Yuqori:** bevosita tasdiqlangan.
  - **O'rta:** kuchli dalil bor, ammo ba'zi shartlar tekshirilmagan.
  - **Past:** ehtimoliy, qo'shimcha tekshiruv kerak.
- **Holat**
  - **Tasdiqlangan:** kodda yoki prod'da ko'rilgan.
  - **Kodda tasdiqlangan:** mantiq kodda aniq ko'rinadi, ishlayotgan tizimda sinalmagan.
  - **Ehtimoliy xavf.**
  - **Tekshirilmagan.**

Barcha yo'llar repo ildiziga nisbatan (`apps/web/src/...`). P0 topilma yo'q.

---

## P1 — yuqori

### SEC-01 · Mahsulot sahifasida saqlanadigan XSS (JSON-LD)

- Kategoriya: Xavfsizlik · Ishonch: Yuqori · Holat: Kodda tasdiqlangan (hujum prod'da sinalmagan, sinash taqiqlangan)
- Dalil:
  - `apps/web/src/components/seo/structured-data.tsx:30, 84, 105` — `dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}`
  - `apps/web/src/app/[locale]/product/[slug]/page.tsx:122-128` — sotuvchi kiritgan `name`, `description` shu yerga uzatiladi.
- Nima bo'ladi: `JSON.stringify` `<` belgisini ekranlamaydi. Sotuvchi mahsulot tavsifiga `</script><script>…` yozsa, skript sahifani ochgan har bir xaridorning brauzerida ishga tushadi. Kontent xavfsizlik siyosati (CSP) yo'q (SEC-06), shuning uchun uni hech narsa to'xtatmaydi.
- Ta'sir: skript xaridor nomidan `/api/*` so'rovlarini yubora oladi (manzillar, profil, buyurtmalar). Cookie'lar httpOnly bo'lgani uchun tokenning o'zi o'g'irlanmaydi.
- Tavsiya: `JSON.stringify(data).replace(/</g, '\\u003c')` (U+2028/2029 ham ekranlansin), keyin CSP qo'shilsin. Murakkablik: juda past.
- Tekshirish kerak: sotuvchi mahsuloti moderatsiyadan o'tadimi (`SELLER_PRODUCT_AUTOAPPROVE`)?
- **Tuzatish (2026-10-15, !59):** JSON-LD `jsonLdHtml` bilan ekranlanadi (`< > & U+2028 U+2029`).

### SEC-02 · OTP orqali kirish bloklangan yoki o'chirilgan akkauntni qayta faollashtiradi

- Kategoriya: Xavfsizlik · Ishonch: Yuqori · Holat: Kodda tasdiqlangan
- Dalil: `apps/web/src/app/api/auth/otp/verify/route.ts`
  - :72 — `select` ichida `phoneVerifiedAt` yo'q.
  - :87 — `!('phoneVerifiedAt' in user)` shuning uchun doim `true`.
  - :88-91 — `status: 'ACTIVE'` yoziladi.
  - :94 — blok tekshiruvi eski (xotiradagi) qiymatga qaraydi.
- Nima bo'ladi: birinchi urinish 403 qaytaradi, lekin bazada akkaunt allaqachon `ACTIVE` bo'lib qoladi. Ikkinchi OTP kirish muvaffaqiyatli o'tadi. Admin bergan bloklash va o'chirish bekor bo'ladi.
- Ta'sir: hozir SMS yetkazilmaydi (FUN-01), shuning uchun amalda ishlamaydi. SMS ulangan kuni ochiladi.
- Tavsiya: avval BLOCKED/DELETED holatini tekshirish, yangilashni faqat `PENDING` holatda qilish. Murakkablik: past. SMS'ni ulashdan **oldin** tuzatilishi shart.
- **Tuzatish (2026-10-15, !59; 2026-10-17, !72):** bloklangan/o‘chirilgan hisob hech narsa yozmasdan rad etiladi; PENDING SMS/Telegram bilan faollashmaydi.

### FUN-01 · Telefon (OTP) bilan kirish prod'da ishlamaydi

- Kategoriya: Funksional · Ishonch: Yuqori · Holat: Tasdiqlangan
- Dalil:
  - `apps/web/src/app/api/auth/otp/send/route.ts:67-71` — SMS provayderi `TODO`, kod faqat dev muhitda log'ga yoziladi.
  - Prod'dagi login sahifasida «Telefon» tabi ko'rinadi (skrinshot `login-mobile.jpg`).
- Ta'sir: mijozga «kod yuborildi» deyiladi, lekin kod kelmaydi. Telefon orqali ro'yxatdan o'tmoqchi bo'lgan mijoz yo'qotiladi. Flutter ilovasi ham shu oqimga tayanadi.
- Tavsiya: Eskiz (yoki boshqa SMS provayder) ulansin. Ulanguncha «Telefon» tabi yashirilsin. Avval SEC-02 va SEC-05 tuzatilsin.
- Bog'liqlik: SMS provayder hisobi (biznes qarori).
- **Tuzatish (2026-10-15, !60; 2026-10-17, !75–!77):** SMS yo‘qligida «Telefon» tabi yashirin, `otp/send` 503. Raqam endi **Telegram orqali bepul tasdiqlanadi** (ADR 0018); SMS kodi Eskiz uchun tayyor.

### FUN-02 · Prod katalogida demo va test mahsulotlar sotuvda turibdi

- Kategoriya: Ma'lumot / ishonch · Ishonch: Yuqori · Holat: Prod'da tasdiqlangan
- **Tuzatish (2026-10-15, !59 merge'dan keyin):** dastlab sabab kodning mock fallback'i deb yozilgan edi. Merge'dan keyingi tekshiruv sahifa keshsiz yasalganda ham ochilishini ko'rsatdi (`X-Vercel-Cache: MISS`). Demak bu mahsulotlar prod **bazasida** bor.
- Dalil:
  - `GET /api/products?limit=100` 11 ta ochiq mahsulot qaytaradi. Ular orasida seed'dan qolgan demo mahsulotlar bor: `nike-air-max-270`, `adidas-ultraboost-22`, `chanel-no5-eau-de-parfum`, `dior-sauvage-edt`, `gucci-marmont-bag` va boshqalar.
  - Test yozuvlari ham bor: `variant-test-futbolka`, `e2e-moderatsiya-f1315062`, `nike99`.
  - Skrinshot: `product-mock-mobile.jpg`.
- Ta'sir: mijozga mavjud bo'lmagan tovarlar (Chanel, Dior, Gucci) haqiqiy narx bilan sotiladi, test mahsulotlar ham ko'rinadi. Brendga ishonch tushadi, buyurtma kelsa uni bajarib bo'lmaydi. Google bu sahifalarni indekslaydi.
- Tavsiya: admin panelda demo va test mahsulotlarni nofaol qilish yoki o'chirish (operatsion ish, kod emas). Test yozuvlari prod'ga tushmasligi uchun e2e testlarni alohida bazada ishlatish kerak.
- Kodga oid qism: `getProductDetail()` mock fallback'i production'da o'chirildi (!59). Bu himoya, lekin prod'dagi ko'rinishning sababi emas edi.

### FUN-03 · «Parolni unutdingizmi?» soxta

- Kategoriya: Funksional · Ishonch: Yuqori · Holat: Kodda tasdiqlangan; havola prod'da ko'rinadi
- Dalil: `apps/web/src/app/[locale]/forgot-password/page.tsx:14-21` — 600 ms kutib, «Email yuborildi» deb ko'rsatadi. Hech qanday API chaqirilmaydi.
- Ta'sir: parolini unutgan mijozga «xat yuborildi» deyiladi, lekin xat yuborilmaydi va mijoz akkauntiga qaytib kira olmaydi. Flutter ilovasida parolni tiklash umuman yo'q.
- Tavsiya: haqiqiy tiklash oqimi (email havolasi yoki SMS kod). Murakkablik: o'rta.
- **Qisman (2026-10-15, !60):** soxta «xat yuborildi» o‘rniga qo‘llab-quvvatlash yo‘li. Haqiqiy parol tiklash (email/SMS) — hali ochiq.

### FUN-04 · Profil «Sozlamalar» sahifasi soxta

- Kategoriya: Funksional · Ishonch: Yuqori · Holat: Kodda tasdiqlangan
- Dalil: `apps/web/src/app/[locale]/profile/settings/page.tsx`
  - :40 — parol o'zgartirish tugmasi faqat «parol yangilandi» xabarini ko'rsatadi.
  - :55 — bildirishnoma kalitlari saqlanmaydi.
  - :66 — «Akkauntni o'chirish» tugmasida handler yo'q.
- Ta'sir: mijoz parolini o'zgartirdim deb o'ylaydi, aslida o'zgarmagan. Bu xavfsizlik nuqtai nazaridan ham chalg'itadi.
- Tavsiya: ishlamaydigan boshqaruvlarni yashirish yoki ularni haqiqiy API'ga ulash. Murakkablik: past (yashirish) / o'rta (ulash).
- **Tuzatish (2026-10-15, !60):** haqiqiy parol almashtirish (`POST /api/auth/password`), saqlanmaydigan kalitlar va ishlamaydigan o‘chirish tugmasi olib tashlandi.

### FUN-05 · Sello Coins sahifasi soxta balans ko'rsatadi

- Kategoriya: Funksional · Ishonch: Yuqori · Holat: Kodda tasdiqlangan
- Dalil: `apps/web/src/app/[locale]/profile/loyalty/page.tsx`
  - :35-37 — boshlang'ich holat `MOCK_LOYALTY` (1240 coin va soxta tarix).
  - :81-90 — API xatosida check-in coin'larni lokal qo'shib, «muvaffaqiyat» deb ko'rsatadi.
- Ta'sir: har bir mijoz bir lahzaga, API ishlamasa esa doimiy ravishda, o'ziga tegishli bo'lmagan balansni ko'radi. Coin'lar haqida noto'g'ri tasavvur paydo bo'ladi.
- Tavsiya: mock boshlang'ich holat skeleton bilan almashtirilsin, xatoda xato ko'rsatilsin. Murakkablik: past.
- **Tuzatish (2026-10-15, !60):** mock boshlang‘ich balans va soxta +5 coin olib tashlandi.

### FUN-06 · Onlayn to'lov boshlanmasa ham «buyurtma qabul qilindi» deb ko'rsatiladi

- Kategoriya: Funksional · Ishonch: O'rta · Holat: Kodda tasdiqlangan (prod'da sinalmagan)
- Dalil:
  - `apps/web/src/components/checkout/checkout-flow.tsx:488-515` — izoh: «to'lov yaratishda xato — buyurtma baribir yaratildi, success'ga o'tamiz».
  - Success sahifasi to'lov holatini tekshirmaydi. Web buyurtma sahifasida «qayta to'lash» tugmasi yo'q.
  - Flutter'da xuddi shu holat: `apps/flutter/customer/lib/src/screens/checkout_screen.dart:551-569`.
- Ta'sir: Click/Payme buyurtmasi to'lanmay qoladi, mijoz esa to'ladim deb o'ylaydi. Buyurtma muddati o'tib bekor bo'ladi, mijoz noroziligi yuzaga keladi.
- Tavsiya: success sahifasida to'lov holati («kutilmoqda — hozir to'lash») ko'rsatilsin, web'ga «to'lash» tugmasi qo'shilsin (Flutter'da bor). Murakkablik: o'rta.
- **Tuzatish (2026-10-15, !60):** `GET /api/orders/[id]/payment-status`; success sahifasi to‘lovni tekshiradi, «To‘lash» tugmasi.

### TRU-01 · Prod'da vaqtinchalik (placeholder) kontaktlar va ishlamaydigan aloqa formasi

- Kategoriya: Ishonch / UX · Ishonch: Yuqori · Holat: Prod'da tasdiqlangan
- Dalil:
  - Prod HTML'da `support@example.uz` (×4), `info@example.uz` (×4), `+998 71 200 00 00`, `@ecom_uz_bot` topildi.
  - Kodda: `components/layout/footer.tsx:139-144`, `app/[locale]/help/page.tsx:24-27`, `app/[locale]/contacts/page.tsx:13-16, 59-81`.
  - Aloqa formasida `onSubmit` va `name` atributlari yo'q, «Live chat» `href="#"`.
- Ta'sir: mijoz yordam so'ray olmaydi. Xabar jimgina yo'qoladi, soxta email va telefon esa brendga bo'lgan ishonchni pasaytiradi.
- Tavsiya: kontaktlar `/api/config` dagi `SUPPORT_*` qiymatlaridan olinsin (u allaqachon mavjud). Forma ulansin yoki olib tashlansin. Murakkablik: past.
- **Tuzatish (2026-10-15, !60, !64, !65):** kontaktlar `lib/support.ts` (rasmiy kanallar + ENV), soxta raqam/forma/«Live chat» olib tashlandi.

### UX-01 · Mahsulot sahifasi telefonda ekrandan kengayib ketadi

- Kategoriya: Responsive · Ishonch: Yuqori · Holat: Prod'da tasdiqlangan (375 px emulyatsiya)
- Dalil:
  - `/uz/product/puma-rs-x-sneakers` sahifasida 375 px telefon kengligida sahifa kengligi 457 px bo'ldi.
  - Sababi — tablar qatori (`Tavsifi / Xususiyatlari / Sharhlar (78) / Savol-javoblar`), kengligi 441 px va qatorga o'ralmaydi.
  - Kodda: `apps/web/src/components/product/product-tabs.tsx:29` va `packages/ui/src/components/tabs.tsx:17` (`inline-flex … whitespace-nowrap`).
- Ta'sir: telefon brauzeri butun mahsulot sahifasini kichraytiradi (matn mayda bo'ladi) yoki gorizontal aylantirish paydo bo'ladi. Bu xaridga eng yaqin sahifa.
- Tavsiya: TabsList'ni `overflow-x-auto` qilish yoki telefonda to'rga o'tkazish. Murakkablik: juda past.

---

## P2 — o'rta

- **Tuzatish (2026-10-15, !59):** mahsulot tablari o‘z ichida aylanadi (sahifa 457 → 375 px).

### SEC-03 · Kirishdan keyin tashqi saytga yo'naltirish (open redirect)

- Dalil:
  - `apps/web/src/app/[locale]/login/page.tsx:21` va `components/auth/login-flow.tsx:20-21` — `next.startsWith('/')` tekshiruvi `//evil.com` manzilini o'tkazib yuboradi.
  - Xavfsiz yordamchi `packages/utils/src/safe-redirect.ts` (`safeInternalPath`) mavjud, lekin bu joylarda ishlatilmagan.
- Ta'sir: fishing havolalari uchun qulay. Ishonch: Yuqori. Murakkablik: juda past.
- **Tuzatish (2026-10-15, !59):** `?next=` uchun `safeInternalPath`.

### SEC-04 · Telefon yoki emailni tasdiqlamasdan o'zgartirish mumkin

- Dalil: `apps/web/src/app/api/auth/me/route.ts:54-79` — PATCH yangi raqamni tasdiqlamasdan yozadi. `otp/verify` esa raqam bo'yicha akkaunt topadi.
- Ssenariy: hujumchi o'z akkauntiga qurbonning raqamini yozib qo'yadi. Qurbon keyin OTP bilan kirganda hujumchining akkauntiga tushib qoladi.
- Ishonch: Yuqori (mantiq). SMS ulanganda dolzarb bo'ladi. Tavsiya: yangi raqamga OTP yuborib tasdiqlash. Murakkablik: o'rta.
- **Tuzatish (2026-10-17, !72):** OTP kirish faqat raqami tasdiqlangan hisobga kiritadi. Raqam tasdiqlanmagan hisobda bo'lsa, u bo'shatiladi (AuditLog `PHONE_RELEASED_UNVERIFIED`) va kod egasiga yangi hisob ochiladi. Register orqali yozilgan raqam ham shu qoida bilan qoplanadi. Qo'shimcha: `PENDING` hisob SMS kod bilan faollashmaydi. Profilda raqamni SMS bilan tasdiqlash oqimi SMS provayder ulangach qo'shiladi.

### SEC-05 · OTP urinishlari hisoblagichi atomar emas, cheklov faqat IP bo'yicha

- Dalil:
  - `otp/verify/route.ts:45, 56` — o'qish va yozish alohida bajariladi.
  - `packages/auth/src/rate-limit.ts:74-92` — Redis bo'lmasa xotiradagi hisoblagich ishlatiladi, xatoda esa cheklov ochiq qoladi.
- Ishonch: O'rta. Tekshirish kerak: prod'da Upstash sozlanganmi.
- **Tuzatish (2026-10-17, !72):** urinish atomar band qilinadi, kod iste'moli shartli, raqam bo'yicha yuborish chegarasi DB'da (soatiga 5, kuniga 10), verify'ga raqam bo'yicha limiter. OTP himoyasi endi Redis'ga bog'liq emas. Boshqa endpointlarning IP cheklovi uchun prod'da `UPSTASH_REDIS_REST_URL/TOKEN` borligini tekshirish hali ochiq.

### SEC-06 · Kontent xavfsizlik siyosati (CSP) yo'q

- Dalil:
  - Prod javob sarlavhalarida HSTS, X-Frame-Options DENY, Referrer-Policy va Permissions-Policy bor, lekin `Content-Security-Policy` yo'q.
  - `apps/web/next.config.mjs:7-17` izohida CSP ataylab keyinga qoldirilgan.
- Ta'sir: SEC-01 kabi xatolarning oqibati kattaroq bo'ladi. Tavsiya: nonce asosidagi CSP, avval report-only rejimida.

### SEO-01 · `robots.txt` qoidalari haqiqiy URL'larga mos kelmaydi

- Dalil:
  - Prod `robots.txt`: `Disallow: /cart`, `/checkout`, `/profile`. Haqiqiy URL'lar esa `/uz/cart`, `/ru/cart` ko'rinishida.
  - `/uz/cart` sahifasida `<meta name="robots" content="index, follow">` turibdi.
  - Kodda: `apps/web/src/app/robots.ts:13`, `app/[locale]/layout.tsx:79`.
- Ta'sir: savat, checkout va profil sahifalari qidiruvda indekslanishi mumkin. Murakkablik: juda past.
- **Tuzatish (2026-10-15, !59):** robots til prefiksi bilan; savat/checkout/profil/buyurtmalar `noindex`.

### SEO-02 · Metadata va statik sahifalar tarjima qilinmagan

- Dalil:
  - Bosh sahifa va katalogda `generateMetadata` yo'q.
  - 19 ta statik sahifa (about, help, terms, offer, faq va boshqalar) next-intl'ni ishlatmaydi va /ru, /en manzillarida o'zbekcha matn ko'rsatadi.
  - Web kodida ~260 ta qattiq yozilgan qator bor (agent hisobi, evristik grep).
- Ta'sir: rus va ingliz tilidagi mijozlar sahifani tushunmaydi. Bundan tashqari takroriy kontent paydo bo'ladi va `lang` noto'g'ri belgilanadi (WCAG 3.1.1).

### A11Y-01 · Forma maydonlari dasturiy yorliqsiz

- Dalil:
  - `components/checkout/checkout-ui.tsx:55-62` — `<label>` `htmlFor`siz.
  - `components/auth/login-flow.tsx:186-211, 301-343`.
  - Miqdor kiritish maydonlari ham yorliqsiz.
  - Lighthouse mahsulot sahifasida `label` va `target-size` tekshiruvlaridan o'tmadi.
- Ta'sir: ekranni o'qish dasturlari checkout maydonlarini nomlay olmaydi.
- **Tuzatish (2026-10-17, !73):** login (email, parol, telefon, SMS kod) va checkout maydonlari `<label htmlFor>`/`id` bilan bog'landi. Mahsulot miqdori, header qidiruvi va obuna email'iga `aria-label` qo'shildi. Til tugmasi nomi ko'rinadigan matnni o'z ichiga oladi.

### A11Y-02 · Rang kontrasti yetarli emas

- Dalil:
  - Lighthouse `color-contrast` xatolari: bosh sahifa 29, katalog 21, mahsulot 7, checkout 7 ta element.
  - `text-[#9a9aa2]` oq fonda ≈ 2,8:1 (talab 4,5:1). U eski narx, breadcrumb va checkout bosqichlarida ishlatiladi.
  - Statik sahifa sarlavhalarining gradientlarida oq matn ≈ 2,2–2,8:1.
  - Flutter'da: `destructive #EF4444` oq fonda ≈ 3,8:1.
- **Tuzatish (2026-10-17, !73, web):** `#9a9aa2` → `text-muted-foreground` (5,3:1). Mahsulot sahifasi nishonlari brend ranglariga o'tkazildi, footer to'lov nishonlari white/70 qilindi. «Sotuvda yo'q» kartada endi faqat rasm xiralashadi. Lokal Lighthouse: 6 sahifa 100, bosh sahifa 96 (qolgani overlay yopgan target-size). Flutter'dagi `destructive` ham tuzatildi (!74): `#EF4444` → `#B81E2B` (6,44:1), web tokeni bilan bir xil. Karta nomi havolasining bosish maydoni 26 px qilindi (!74).

### UX-02 · Kompyuterda login va checkout sahifasida gorizontal aylantirish

- Dalil:
  - Prod'da 1280 px: login sahifasi `scrollWidth` 1273 > `clientWidth` 1265.
  - Sababi `-mx-[50vw] w-screen` (`components/auth/login-flow.tsx:44`, `components/checkout/checkout-flow.tsx:520`).
  - Checkout'da sayt sarlavhasi ham, checkout'ning o'z sarlavhasi ham ko'rinadi (kod bo'yicha).
- Ishonch: Yuqori (login), O'rta (checkout — mahsulotsiz sinab bo'lmadi).

### UX-03 · Telefonda pastki qatlamlar ekranni yopadi

- Dalil:
  - Prod'da 375×812 o'lchamda cookie banneri 210 px balandlikda (ekranning ~26 foizi; skrinshot `home-mobile.jpg`).
  - Kodda yana ikki pastki qatlam bor, ular bir-biri bilan muvofiqlashtirilmagan: PWA o'rnatish taklifi va sticky bar (`components/pwa/install-prompt.tsx:61`, `sticky-install-bar.tsx:73`).
- Ishonch: Yuqori (banner), O'rta (qatlamlarning ustma-ust tushishi).

### UX-04 · Xatolar «bo'sh ro'yxat» bo'lib ko'rinadi

- Dalil: `app/[locale]/profile/orders/page.tsx:90-96`, `profile/reviews/page.tsx:46`, `profile/wishlist/page.tsx:40` — `.catch(()=>{})`.
- Ta'sir: tarmoq xatosida mijoz «buyurtmalaringiz yo'q» degan yozuvni ko'radi va tashvishga tushadi.

### FUN-07 · Web'da qaytarish so'rovini yuborib bo'lmaydi

- Dalil: `/api/orders/[id]/return` mavjud, lekin web kodida u hech qayerda chaqirilmaydi. `returns` sahifasi faqat matndan iborat. Flutter'da bu funksiya bor.
- **Tuzatish (2026-10-17, !79):** buyurtma sahifasida «Qaytarishni so‘rash» paneli (nima bo‘lishi, ixtiyoriy sabab); oynani server hisoblaydi (`returnable`), muddat o‘tgan bo‘lsa sababi ko‘rsatiladi.

### FUN-08 · Katalogda sahifalash yo'q (48 tadan ko'p mahsulot ko'rinmaydi)

- Dalil: `apps/web/src/lib/catalog.ts:178` (`limit = 48`), `catalog/page.tsx:131` («natijalar» soni `list.length`).
- Hozirgi ta'sir: kichik, prod'da ~18 mahsulot bor. Mahsulotlar ko'payganda muhim bo'ladi.

### FUN-09 · Uzum logotipi ko'rsatilgan, lekin u bilan to'lab bo'lmaydi

- Dalil: `components/layout/footer.tsx:75` (logotip), `lib/payments.ts:113-114` (faqat CLICK, PAYME, COD).
- **Tuzatish (2026-10-15, !60):** Uzum footer va FAQ’dan olib tashlandi.

### TRU-02 · Bosh sahifadagi «chegirma» foizi o'ylab topilgan

- Dalil: `components/layout/sale-section.tsx:128` — eski narx bo'lmasa `price*1.3` deb hisoblab «−23%» ko'rsatadi. `lib/catalog.ts:511-516` — chegirmasiz mahsulotlar ham «SALE» ro'yxatiga qo'shiladi.
- Ta'sir: noto'g'ri reklama, iste'molchi huquqlari bo'yicha xavf. Murakkablik: juda past.
- **Tuzatish (2026-10-15, !59):** «Aksiya» faqat haqiqiy chegirmada, foiz eski narxdan.

### PERF-01 · Bosh sahifa telefonda sekin

- Dalil (Lighthouse 12.2.1, mobil, simulyatsiya qilingan sekin 4G + 4× CPU, bitta o'lchov):

  | Sahifa   | Tezlik | LCP   | TBT      |
  | -------- | ------ | ----- | -------- |
  | Bosh     | 37     | 6,7 s | 1 860 ms |
  | Katalog  | 48     | 4,8 s | 970 ms   |
  | Mahsulot | 65     | 3,2 s | 1 220 ms |
  | Checkout | 54     | 5,8 s | 680 ms   |

  Bosh sahifada asosiy oqim (main thread) 9,9 s band: Style & Layout 4,2 s, skript 3,3 s. Eng og'ir chunk `3710-*.js` — 2,3 s.

- Ta'sir: sekin mobil internetda xaridor sahifa ochilishini kutmay chiqib ketishi mumkin.
- Tavsiya: bosh sahifadagi animatsiyalar va client komponentlarni profillash, og'ir chunk tarkibini aniqlash (bundle analyzer). Bir nechta o'lchov bilan solishtirish.
- **Tuzatish (2026-10-16…17, !63, !66–!71):** bosh sahifa Lighthouse mobil 33 → 79 (LCP 7,4 → ~3,0 s, TBT 2,1 → ~0,5 s), mahsulot 58 → 79.

### MOB-01 · Flutter: sessiya muddati tugaganini ilova sezmaydi

- Dalil: `apps/flutter/shared/lib/src/api/api_client.dart:96-99` — refresh 401 bo'lsa saqlangan sessiya tozalanadi, lekin `AuthController`ga xabar berilmaydi.
- Ta'sir: ilova «kirgan» holatda ko'rinadi, lekin har bir so'rov xato beradi va bu ilova qayta ochilguncha davom etadi.

### MOB-02 · Flutter: chiqishda savat tozalanmaydi

- Dalil: `apps/flutter/customer/lib/src/.../cart_sync.dart:53-59`. Oldingi foydalanuvchining savati keyingi akkauntga qo'shilib ketadi.

### MOB-03 · Flutter: release build debug kalit bilan imzolangan

- Dalil: `apps/flutter/customer/android/app/build.gradle.kts:33-37`.
- Ta'sir: ilovani Play Store'ga chiqarib bo'lmaydi, imzo barqaror emas. Versiya hali `1.0.0+1`.

### MOB-04 · iOS: URL sxemasi va joylashuv ruxsati matni yo'q

- Dalil: `apps/flutter/customer/ios/Runner/Info.plist` — `CFBundleURLTypes` ham, `NSLocationWhenInUseUsageDescription` ham yo'q.
- Ta'sir: iOS chiqarilganda to'lovdan keyin ilovaga qaytish va xaritada «mening joylashuvim» ishlamaydi. App Store ko'rigidan o'tmaydi. Hozircha iOS chiqarilmagan.

### MOB-05 · Flutter: crash monitoring yo'q

- Dalil: Sentry, Crashlytics yoki `FlutterError.onError` topilmadi. Web'da Sentry bor.

### I18N-01 · Server xatolari, valyuta va oy nomlari faqat o'zbekcha

- Dalil:
  - API xato matnlari o'zbekcha (masalan `api/auth/otp/send/route.ts:29`).
  - Flutter `Accept-Language` yubormaydi.
  - `"so'm"` qattiq yozilgan (`shared/lib/src/utils/money.dart:48`), oy nomlari faqat o'zbekcha (`dates.dart:13-26`).

---

## P3 — past (qisqacha)

| ID     | Topilma                                                                                                                   | Dalil                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| SEC-07 | Refresh token qayta ishlatilishi aniqlanmaydi; logout'dan keyin access JWT 15 daqiqa amal qiladi; rollar JWT'dan o'qiladi | `lib/auth/session.ts:144-166, 221`                                               |
| SEC-08 | Akkaunt mavjudligini bilib olish mumkin (login/register javoblari va javob vaqti)                                         | `api/auth/login/route.ts:44-47`, `register/route.ts:38-42`                       |
| SEC-09 | Sharh rasmlari uchun ruxsat ro'yxati istalgan Vercel Blob do'konini qabul qiladi                                          | `packages/storage/src/public-url.ts`                                             |
| SEC-10 | Promo validate va claim endpoint'larida rate limit yo'q                                                                   | `api/promo/route.ts`, `api/promo/validate`                                       |
| SEC-11 | Ochiq sharhlar ichki `userId`ni ko'rsatadi                                                                                | `lib/reviews-server.ts:75`                                                       |
| SEC-12 | Mehmon kuzatish sahifasida topshirish kodi ko'rinadi (ataylab, raqam + telefon bilan)                                     | `api/orders/track/route.ts`                                                      |
| DEP-01 | Next 14 (yangilanish faqat 14.x), React 19 bilan rasman qo'llab-quvvatlanmagan juftlik, ESLint 8 EOL                      | `apps/web/package.json`                                                          |
| UX-05  | Ishlamaydigan «o'lcham jadvali» tugmasi; til almashganda filtrlar yo'qoladi; «Tez orada» sahifalari ochiq                 | `product-detail.tsx:276`, `locale-switcher.tsx:27`, `careers/press/seller-guide` |
| UX-06  | Profil statistikasi qattiq yozilgan (0 buyurtma, bronza daraja)                                                           | `profile/page.tsx:81-91`                                                         |
| UX-07  | Bir nechta sahifada h1 yo'q, `EmptyState` h3 bilan sarlavha darajalarini sakrab o'tadi                                    | `brand/[slug]/page.tsx:48`, `packages/ui/.../empty-state.tsx:32`                 |
| MOB-06 | Flutter: kichik bosish nishonlari (34 dp), yorliqsiz yulduzcha tugmalari; config faqat bir marta yuklanadi                | `cart_screen.dart:365`, `review_form_screen.dart:135`, `bootstrap.dart:106`      |
| MOB-07 | Flutter: buyurtmalar 50 ta bilan cheklangan, bildirishnoma bosilganda buyurtmaning o'zi ochilmaydi                        | `orders_repository.dart:10`, `notifications_screen.dart:100`                     |
| MNT-01 | Web'da umumiy fetch qatlami yo'q (~40 joyda inline fetch), timeout va abort yo'q                                          | `apps/web/src/components/**`                                                     |
| MNT-02 | Flutter'da katta fayllar (checkout 937 qator) va kuchsiz analyzer sozlamalari                                             | `checkout_screen.dart`, `analysis_options.yaml`                                  |

## Tasdiqlangan kuchli tomonlar

- **Cookie'lar va parollar:** cookie'lar httpOnly, Secure va SameSite=Lax; parollar argon2id bilan saqlanadi; OTP salted HMAC ko'rinishida saqlanadi.
- **Ma'lumotga egalik tekshiruvi:** buyurtma, manzil, sharh va kuryer API'larida server tomonda tekshiriladi.
- **To'lov webhook'lari:** Click va Payme imzolari timing-safe usulda tekshiriladi, to'lov idempotent.
- **Fayl yuklash:** fayl turi magic-byte bo'yicha aniqlanadi, hajm cheklangan; cheklar maxfiy (private) saqlanadi.
- **Xavfsizlik sarlavhalari:** HSTS, X-Frame-Options, Referrer-Policy va Permissions-Policy prod'da bor.
- **SEO:** mahsulot sahifalarida canonical, hreflang, OpenGraph va JSON-LD bor; sitemap bazadan quriladi; Lighthouse SEO balli 100.
- **Ishlash:** keshlash (`unstable_cache`, ISR), next/font, next/image, maplibre dinamik yuklanadi.
- **Flutter:**
  - tokenlar `FlutterSecureStorage`'da;
  - token yangilanishi bir vaqtda faqat bitta (single-flight);
  - buyurtma idempotent;
  - deep link'lar qat'iy tekshiriladi;
  - kodda TODO yoki mock yo'q.
- **Testlar:** web'da 119 ta vitest o'tdi, Flutter mijoz testlari ham o'tdi (`audit-methodology.md`); typecheck toza.
