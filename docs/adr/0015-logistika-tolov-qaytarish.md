# ADR 0015 — Logistika (bitta 3PL), sotuvchiga to'lov, qaytarish, fulfillment modellari

- **Sana:** 2026-10-12
- **Holat:** Qabul qilingan (egasi tasdiqladi)
- **Kontekst:** 2026-09 auditining oxirgi uch bandi (Y5, Y12, O9) mahsulot qarorini talab qilardi.
  Egasi quyidagilarni tanladi; bu ADR ularni texnik qarorga aylantiradi.

## Qarorlar

### 1. Qaytarish — joyida tekshirish + 10 kun (qonun minimumi)

- Asosiy yo'l: mijoz tovarni **topshirish paytida** tekshiradi (Toshkentda kuryer oldida,
  viloyatda punkt/filialda) va yoqmasa o'sha yerda qaytaradi — qaytarish logistikasi yo'q.
- Topshirilgandan keyin: **10 kun** (14 emas) — ishlatilmagan, qadog'i butun sifatli tovar uchun.
  Asos: «Iste'molchilarning huquqlarini himoya qilish to'g'risida»gi qonun, 18-modda (sifatli
  nooziq-ovqat tovari — 10 kun). 13-modda (nuqsonli tovar — kafolat yoki 6 oy) alohida ariza
  bilan; 28-1-modda (masofadan savdo) — qabul qilishda tekshirish huquqi, qaytarish xarajati
  sotuvchida. «Faqat joyida» varianti 18-moddaga zid bo'lgani uchun tanlanmadi.
- `RETURN_WINDOW_DAYS = 10` (`@ecom/core-domain`) — hamma joy shu yerdan o'qiydi.

### 2. Sotuvchiga to'lov (Y12)

- Komissiya va xizmat haqi **yetkazilgan paytda** hisoblanadi (hisob daftariga yoziladi).
- Pul qaytarish muddati (10 kun) tugagach «yechish mumkin» bo'ladi — Uzum ham faqat 10 kundan
  oldin topshirilgan tovar uchun to'laydi.
- To'lov **oyiga 2 marta** (1 va 16-sana): o'sha kungacha «yechish mumkin» bo'lgan qoldiq bitta
  to'lovga yig'iladi, admin bank o'tkazmasini qilib, raqamini kiritadi.
- Qaytarilgan tovar — teskari yozuvlar (sotuv, komissiya, xizmat haqi qaytariladi).
- Hisob daftari — o'zgarmas yozuvlar (`SellerLedgerEntry`), balans = yig'indi; har yozuvda
  idempotentlik kaliti (`reference @unique`).

### 3. Fulfillment modellari (Y5)

- **FBS** — sotuvchi buyurtmani tasdiqlab, o'zi qadoqlaydi va belgilangan muddatda omborga
  olib keladi. **FBO** — tovar bizning omborda, biz yig'amiz va qadoqlaymiz.
- Komissiya va har dona uchun xizmat haqi modelga qarab farq qiladi — `GlobalSetting`
  (`id = 'marketplace'`) da, deploy'siz admin'dan o'zgaradi.
- Bitta buyurtmada bir necha sotuvchi bo'lsa — har biri uchun **sotuvchi jo'natmasi**
  (`SellerShipment`); hammasi omborga kelgach buyurtma **bitta** yetkazish bo'lib jo'naydi.

### 4. Logistika — barcha yuk bitta 3PL orqali (O9)

- Mahalliy va global — oxirgi masofa bitta logistika kompaniyasi (3PL) orqali. Global: kargo
  omborimizgacha, keyin 3PL.
- Kod provayderdan mustaqil: `ShippingProvider` interfeysi (jo'natma yaratish, bekor qilish,
  holat webhook'i). Shartnoma va API hujjati kelguncha **«qo'lda» provayder**: admin trek
  raqamini kiritadi va holatni belgilaydi. Fargo/BTS API'lari ochiq e'lon qilinmagan.
- `Delivery` ga 3PL maydonlari qo'shiladi (provayder, tashqi id, trek, yorliq, xom holat).
- Joyida rad etish — `Delivery.status = RETURNED` (jo'natuvchiga qaytdi), zaxira omborga
  qaytganda tiklanadi.
- O'z kuryer ilovamiz zaxira sifatida qoladi, asosiy yo'l emas.

### 5. Narx taklifi → to'lov sahifasi

- Mijoz taklifni qabul qilsa, ko'rinmaydigan global tovar (`GlobalSource.sourcingRequestId`)
  yaratiladi va mijoz to'lov sahifasiga o'tadi (manzil + oldindan to'lov). To'langach so'rov
  `ORDERED`, buyurtma bilan bog'lanadi. Avtomatik to'lovsiz buyurtma tanlanmadi.

## Migratsiya

Hamma sxema o'zgarishi **bitta qo'shimcha migratsiyada** (faqat yangi jadval/ustun, standart
qiymat bilan) — eski kod bilan mos. Prod Neon'ga merge'dan OLDIN qo'llanadi:
`pnpm db:migrate:deploy` (prod `DATABASE_URL` bilan). Vercel build migratsiya qilmaydi.

## Amalga oshirishdagi aniqliklar (F3a — sotuvchi jo'natmalari)

- **Jo'natma qachon ochiladi:** pul tushganda (Click, Payme, karta cheki tasdig'i); naqd
  buyurtmada — buyurtma berilganda. To'lanmagan buyurtmani sotuvchi qadoqlamaydi. Bekor
  qilinganda ochiq jo'natmalar yopiladi. Global (Xitoy) buyurtmalarda jo'natma ochilmaydi.
- **Modelni admin belgilaydi** (sotuvchi uchun standart + mavjud tovarlariga qo'llash). FBO —
  tovar avval omborga topshiriladi, faqat bayroq bilan bo'lmaydi. FBO tovar zaxirasini ombor
  yuritadi — sotuvchi panelda o'zgartira olmaydi. Platformaning o'z tovari — doim FBO.
- **Ombor qabuli** (admin `/inbound`): sotuvchi panelda «qadoqladim» demagan bo'lsa ham, tovar
  qo'lda kelgan bo'lsa qabul qilinadi — jismoniy qabul hal qiluvchi (aks holda buyurtma tugma
  bosilmagani uchun qotadi). Hamma jo'natma kelgach buyurtma avtomatik `PACKED`.
- **Kuryer/3PL** buyurtmani faqat hamma jo'natma omborda bo'lganda oladi. Admin ham FBS tovari
  kelmaguncha buyurtmani `PACKED` va undan keyinga o'tkaza olmaydi (409); FBO qismlari shu
  o'tishda «yig'ildi» deb belgilanadi.
- **Muddat:** FBS 48 soat, FBO 24 soat (tariflarda). Kechikkani qizil ko'rsatiladi; avtomatik
  bekor qilish yo'q — operator sotuvchiga qo'ng'iroq qiladi yoki buyurtmani bekor qiladi.
- **Shaxsiy ma'lumot:** sotuvchiga mijozning telefoni va manzili ko'rsatilmaydi — yetkazishni
  biz qilamiz.
- **Komissiya manbai** — tariflar (`GlobalSetting` `marketplace`, modelga qarab). Eski
  `Seller.commissionRate` hisob daftari (F3b) ishga tushgach ishlatilmaydi va keyingi
  migratsiyada olib tashlanadi.

## Amalga oshirishdagi aniqliklar (F3b — hisob daftari va to'lovlar)

- **Yetkazilganda** har satr bo'yicha: sotuv (+), komissiya (−), xizmat haqi (−). Model —
  jo'natma ochilgandagisi. «Yechish mumkin» sanasi — yetkazilgan + 10 kun. Promokod chegirmasi
  platforma hisobidan: sotuvchiga tovarning to'liq narxi yoziladi.
- **Qaytarilganda** teskari yozuvlar; hali to'lanmagan sotuv bilan bir sanada yechiladi (bir-
  birini yopadi). To'langandan keyin qaytsa — qoldiq manfiy bo'ladi va keyingi savdolardan
  ushlanadi; manfiy qoldiqqa to'lov yaratilmaydi.
- **To'lov hisoblash** — Vercel Cron har kuni 02:00 UTC, lekin ish faqat to'lov kunlarida
  (Toshkent sanasi bo'yicha). Admin «Hozir hisoblash» bilan istalgan kun hisoblay oladi.
  Sotuvchi bo'yicha advisory lock — ikki marta yig'ilmaydi.
- **To'lov holati:** PENDING (bank o'tkazmasi kutilmoqda) → PAID (admin topshiriqnoma raqamini
  kiritadi, daftarga to'lov (−) yoziladi) yoki CANCELLED (masalan rekvizit noto'g'ri — savdolar
  keyingi hisoblashga qaytadi). To'lov paytidagi rekvizitlar nusxalanadi.
- Sotuvchi panelida hisob raqamining faqat oxirgi 4 raqami ko'rinadi.
- `Seller.commissionRate` endi hech qayerda ishlatilmaydi (eskirgan); keyingi sxema
  migratsiyasida olib tashlanadi.

## Amalga oshirishdagi aniqliklar (F4 — 3PL, «qo'lda» provayder)

- `ShippingProvider` (`@ecom/order-ops` `carrier.ts`) — jo'natmani provayderda ro'yxatdan
  o'tkazish; hozir yagona provayder `MANUAL`: admin kompaniya nomi va trek raqamini kiritadi.
  Hodisalar qoidasi bitta jadvalda (`@ecom/core-domain` `CARRIER_EVENT_RULES`): admin tugmalari
  ham, provayder API'si ulangach webhook ham shu orqali o'tadi. Webhook endpoint provayder
  hujjati kelganda qo'shiladi (hozir yozilmadi — ishlatilmaydigan kod qoldirmaslik uchun).
- 3PL'ga faqat hamma tovar omborda yig'ilgan (`PACKED`) buyurtma topshiriladi → `SHIPPED`.
  O'z kuryerimiz olgan yetkazishni 3PL'ga berib bo'lmaydi va aksincha: 3PL'ga berilgan
  yetkazish kuryerlar ro'yxatiga chiqmaydi.
- **Joyida rad etish:** buyurtma `RETURNED`, yetkazish `FAILED` (sabab bilan), naqd to'lov
  yopiladi, coin va promokod qaytariladi, sotuvchiga sotuv yozilmaydi. Tovar omborga qaytgach
  admin «Qaytarishlar»da qabul qiladi — zaxira shunda tiklanadi. Oldindan to'langan bo'lsa
  «Pul qaytarish» navbatiga tushadi. Ombordan chiqqan (`shippedAt`) buyurtma pul oldin
  qaytarilsa ham qabul ro'yxatida qoladi.
- Mijozga (web va ilova) kompaniya nomi va trek raqami ko'rsatiladi.

## Amalga oshirishdagi aniqliklar (F5 — narx taklifi → to'lov sahifasi)

- Mijoz taklifni qabul qilganda taklif narxida **shaxsiy global tovar** yaratiladi (nomi
  `@ecom/i18n` `global.quoteProduct.name`, `GlobalSource.sourcingRequestId`). U ommaviy
  katalogda (ro'yxat, qidiruv, tovar sahifasi, sevimlilar, guruh xaridi) ko'rinmaydi —
  `PUBLIC_CATALOG`.
- Mijoz shu zahoti to'lov sahifasiga o'tadi — faqat shu tovar bilan (`/checkout?only=`).
  Buyurtma qoidalari: faqat so'rov egasi, taklifdagi son, taklif muddati (48 soat) ichida,
  alohida buyurtma, faqat oldindan to'lov. Buyurtma so'rovga atomik bog'lanadi — ikkinchi
  buyurtma bo'lmaydi.
- To'langanda so'rov `ORDERED` (Click, Payme, karta cheki — hammasi `onOrderPaid` orqali).
  To'lanmagan buyurtma bekor bo'lsa — so'rov yana to'lovni kutadi (muddat ichida); to'langani
  bekor bo'lsa — so'rov ham `CANCELLED`.
