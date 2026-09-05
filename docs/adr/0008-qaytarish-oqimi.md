# ADR 0008 — Qaytarish oqimi: mijoz boshlaydi, operator yakunlaydi

- **Sana:** 2026-09-05
- **Holat:** Qabul qilingan
- **Kontekst:** audit (`docs/AUDIT-2026-09-04.html`) — sotuvchi «Qaytarishlar»
  sahifasi mavjud bo'lmagan oqimni ko'rsatardi

## Muammo

Sotuvchi panelidagi `apps/seller/src/app/returns/page.tsx` sahifasi
`REQUESTED → APPROVED / REJECTED → COMPLETED` bosqichlarini ko'rsatardi va har
bir qatorda «Tasdiqlash» hamda «Rad etish» tugmalari bor edi.

Bu tugmalar faqat `toast` chiqarardi — hech qanday so'rov yubormasdi. Sabab
UI'da emas, chuqurroq edi:

- bazada `Return` (yoki `OrderReturn`) modeli **umuman yo'q**;
- `apps/seller` ostida qaytarish bilan bog'liq bironta route ham yo'q edi;
- ya'ni sahifa **mavjud bo'lmagan tushunchani** modellashtirar edi.

Natijada sotuvchi qaytarishni «tasdiqlaydi», yashil xabarni ko'radi va ish
bajarildi deb hisoblaydi. Aslida hech nima o'zgarmaydi; sahifa yangilanganda
status yana avvalgi holida qoladi.

## Amaldagi haqiqiy oqim

`apps/web/src/app/api/orders/[id]/return/route.ts` da qaytarish shunday
ishlaydi:

1. Mijoz **o'zi** qaytaradi — `DELIVERED` holatida, yetkazilgandan keyin
   14 kun ichida (qonuniy asos).
2. Buyurtma darhol `RETURNED` bo'ladi; **bitta tranzaksiyada** zaxira omborga
   qaytariladi (`restockOrder`) va Sello Coins hamda promokod qaytariladi
   (`reverseOrderLoyalty`).
3. **Pul qaytarish qo'lda**: gateway'ga avto-refund YO'Q. `RETURNED` holati
   operatorlar uchun «refund kutilmoqda» signali bo'lib xizmat qiladi.
4. Operator pulni qaytargach buyurtma `REFUNDED` bo'ladi.

Ya'ni sotuvchi tasdig'i oqimda **yo'q va bo'lishi ham mumkin emas**: sotuvchi
«tasdiqlaydigan» paytga kelib zaxira allaqachon qaytarilgan va coinlar
allaqachon yechilgan bo'ladi.

## Qaror

Sotuvchi tasdig'i bosqichi **qo'shilmaydi**. UI amaldagi domenga
moslashtiriladi:

- yangi `GET /api/returns` (sotuvchi) — faqat **o'qish**: sotuvchining
  qaytarilgan buyurtmalari, ularning satrlari va summasi;
- sahifada `RETURNED` = «pul kutilmoqda», `REFUNDED` = «pul qaytarilgan»;
- «Tasdiqlash» va «Rad etish» tugmalari olib tashlandi;
- sahifa tepasida oqim qanday ishlashi ochiq yozildi — sotuvchi nimani
  kutishini bilishi kerak.

## Nega shunday

Bu yerda ikki yo'l bor edi:

**(a) Sotuvchi tasdig'ini qo'shish.** Bu `Return` domenini loyihalashni talab
qiladi: yangi model va migratsiya, qaysi satrlar qaytarilishi, tasdiqlash
muddati, tasdiqlangunicha zaxira qayerda turishi, rad etilganda tovar kimda
qolishi, pul qaytarishning bunga bog'lanishi. Bundan tashqari mavjud
`/api/orders/[id]/return` oqimini **butunlay o'zgartirish** kerak: hozir u
darhol restock qiladi, tasdiqlash qo'shilsa esa restock kechiktirilishi
kerak — bu mijoz uchun ham, ombor hisobi uchun ham boshqa xatti-harakat.

**(b) UI'ni haqiqatga moslashtirish.** Bu — tanlangan yo'l.

(a) mahsulot qarori, xato tuzatish emas: u mijoz tajribasini o'zgartiradi
(mijoz endi darhol emas, tasdiqdan keyin pul oladi) va sotuvchiga yangi
majburiyat yuklaydi (muddat ichida javob berish). Bunday qaror biznes
tomonidan qabul qilinishi kerak.

**Yolg'on tasdiq berishdan ko'ra funksiyaning yo'qligini ochiq aytish
yaxshiroq** — bu auditning butun bo'yicha tutgan yo'li.

## Oqibatlari

- Sotuvchi qaytarishlarni **ko'radi**, lekin ularga ta'sir qila olmaydi.
  Bahsli holatlar operator orqali hal qilinadi.
- `apps/seller/src/lib/mock.ts` dagi `sellerReturns` endi ishlatilmaydi.
- (a) yo'li tanlansa: yangi ADR yoziladi, `Return` modeli qo'shiladi va
  `/api/orders/[id]/return` qayta ishlanadi.

## Bog'liq

- ADR 0005 — modul tuzilishi (`*-server.ts` qatlami)
- `apps/web/src/app/api/orders/[id]/return/route.ts` — amaldagi oqim
- `docs/AUDIT-2026-09-04.html` — topilma manbai
