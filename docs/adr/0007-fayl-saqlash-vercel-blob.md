# ADR 0007 — Fayl saqlash: Vercel Blob (ochiq + yopiq)

**Sana:** 2026-08-31
**Holat:** Qabul qilindi

## Kontekst

Loyihada obyekt saqlash umuman yo'q edi. Bu ikki joyda ko'rinardi:

**1. Sotuvchi mahsulot rasmini yuklay olmasdi.** Mahsulot formasida 4 ta URL
maydoni bor edi va koddagi izoh buni ochiq tan olardi: _"To'liq fayl yuklash
(Cloudinary/S3) keyingi bosqichda"_. Ya'ni sotuvchi rasmni avval boshqa saytga
joylab, havolasini nusxalashi kerak edi. Real sotuvchi buni qilmaydi — bu
marketpleysga tovar kirishini to'sadigan to'siq.

**2. To'lov cheki bazaga base64 bo'lib yozilardi.** Chek rasmi brauzerda
kichraytirilib `data:image/jpeg;base64,...` matni sifatida `Payment.rawPayload`
ichiga tushardi, bitta chek ~3.5 MB gacha. Oqibatlari:

- Har bir buyurtma qatori megabaytlarga o'sadi; baza rezerv nusxasi va tiklash
  vaqti keraksiz uzayadi
- Chekni ko'rsatish uchun butun qator o'qiladi — CDN yo'q, kesh yo'q
- Postgres ma'lumot bazasi, fayl ombori emas: bu qatlamlarni aralashtirish

## Qaror

**Vercel Blob** tanlandi. Sabab: loyiha allaqachon Vercel'da deploy qilinadi,
token loyihaga avtomatik ulanadi, alohida hisob/kalit boshqarish shart emas va
bepul kvota MVP uchun yetarli. S3/R2 kuchliroq, lekin ular hozir yechilishi
kerak bo'lgan muammoga qo'shimcha infratuzilma qo'shadi.

Umumiy `@ecom/storage` paketi yaratildi — web, sotuvchi va admin bir xil
qatlamdan foydalanadi.

### Ikki xil kirish darajasi

| Fayl           | Kirish    | Bazada saqlanadi | Sabab                                                                              |
| -------------- | --------- | ---------------- | ---------------------------------------------------------------------------------- |
| Mahsulot rasmi | `public`  | to'liq manzil    | Saytda, mobil ilovada va qidiruvda ko'rinishi kerak                                |
| To'lov cheki   | `private` | faqat ichki yo'l | Chek — karta o'tkazmasi hujjati; summa, vaqt va karta raqamining bir qismi bo'ladi |

Chek Blob'da yopiq turadi va uning to'g'ridan-to'g'ri internet manzili yo'q.
Admin uni `GET /api/orders/receipt-image?p=...` orqali ko'radi — bu route har
so'rovda admin sessiyasini tekshiradi. Shu sababli chek havolasi tasodifan
tarqalsa ham (skrinshot, log, brauzer tarixi) begona odam uni ocha olmaydi.

### Fayl turi baytlar bo'yicha tekshiriladi

Yuklangan faylning turi `Content-Type` header'iga qarab emas, **fayl boshidagi
baytlarga** qarab aniqlanadi. Header'ni yuboruvchi tomon xohlagancha yozadi:
HTML yoki SVG faylni `image/jpeg` deb yuborish mumkin. Agar shunga ishonib
saqlasak, keyin uni brauzer HTML sifatida ochishi va ichidagi skript ishga
tushishi mumkin. SVG ataylab qabul qilinmaydi — u XML va ichida `<script>`
bo'lishi mumkin. Saqlashda yoziladigan `Content-Type` ham aniqlangan haqiqiy
turdan olinadi, fayl nomi esa umuman ishlatilmaydi.

### Sozlanmaganda kod jim qolmaydi

Vercel ikki xil autentifikatsiyani qo'llaydi: do'kon loyihaga Vercel ichida
ulanganda `BLOB_STORE_ID` qo'yiladi va kalit env'ga umuman tushmaydi (SDK
ishlash paytida OIDC token oladi); `BLOB_READ_WRITE_TOKEN` esa faqat
Vercel'dan tashqarida ishlaganda kerak. Shu sababli tekshiruv **ikkalasini**
ham hisobga oladi — faqat tokenni kutish ulangan loyihada noto'g'ri "sozlanmagan"
xatosini berardi (bu preview'da aynan shunday bo'ldi va tuzatildi).

Ikkalasi ham yo'q bo'lsa `StorageNotConfiguredError` tashlanadi:
API 503 va aniq xabar qaytaradi, web'da xato Sentry'ga ham boradi. Bu ataylab —
jim ishlaydigan integratsiya ishlayotgandek ko'rinadi, lekin hech narsa
saqlanmaydi va buni faqat mijoz yo'qolgan chek orqali bilib qoladi.

## Oqibatlar

**Yaxshi tomoni:**

- Sotuvchi telefondan to'g'ridan-to'g'ri rasm yuklaydi (4 tagacha, birinchisi asosiy)
- Baza faqat ma'lumot saqlaydi; rasmlar CDN'dan uzatiladi
- Chek endi ochiq internetda emas
- Rasm mijoz tomonida kichraytiriladi — mobil internetda tez va arzon

**Narxi:**

- Vercel'ga qo'shimcha bog'liqlik. `@ecom/storage` shu sababli alohida paket:
  provayder almashtirilsa, o'zgarish bitta fayl ichida qoladi
- Bepul kvota cheklangan; o'sish bilan tarif yoki S3/R2 ga o'tish kerak bo'ladi

## Eski cheklar

Bazada base64 bo'lib yotgan cheklar **o'zgartirilmadi**. Admin interfeysi
ikkalasini ham ko'rsatadi (`receiptPath` — yangi, `receipt` — eski), shuning
uchun eski buyurtmalarning cheki yo'qolmaydi. Yangi chek esa hech qachon
bazaga base64 bo'lib tushmaydi: eski mobil ilova data-URL yuborsa ham, server
uni o'zi Blob'ga ko'chirib, baribir yo'lni saqlaydi.
