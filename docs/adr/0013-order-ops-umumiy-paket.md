# ADR 0013 — Buyurtma yon ta'sirlari umumiy paketda: `@ecom/order-ops`

- **Sana:** 2026-10-12
- **Holat:** Qabul qilingan
- **Kontekst:** Buyurtma holatini bir nechta ilova o'zgartiradi: `apps/web` (mijoz bekor
  qilishi, qaytarish, Click/Payme webhook'lari, kuryer), `apps/admin` (fulfillment, bekor
  qilish, chek tasdig'i, qaytarishni qabul qilish) va endi cron (to'lanmagan buyurtma
  muddati). Har biri zaxira, Sello Coins, promokod va to'lov yozuvlarini o'zicha
  o'zgartirardi. 2026-09 auditi shu nusxalar bir-biridan farq qilganini ko'rsatdi:
  Payme bekor qilganda zaxira qaytmasdi (Y7), kuryer yetkazgan naqd buyurtma
  «to'lanmagan» qolardi (Y10), admin'da bekor qilish umuman yo'q edi (Y9).

## Qaror

1. Tranzaksiya ichidagi buyurtma amallari `packages/order-ops` (`@ecom/order-ops`) da:
   - `deductStockForOrder`, `restockOrder`, `restockReturnDelivery` — zaxira;
   - `settleOrderLoyalty`, `grantOrderEarn`, `reverseOrderLoyalty` — Sello Coins;
   - `releaseCancelledOrder`, `releaseOrderPromo` — bekor qilish yon ta'sirlari;
   - `settleDeliveredOrder` — DELIVERED: naqd to'lov PAID + `soldCount`;
   - `expireUnpaidOrders` — muddati o'tgan to'lanmagan buyurtmalar.
2. Har funksiya `Prisma.TransactionClient` oladi; tranzaksiyani **chaqiruvchi** ochadi va
   holatni atomik o'zgartiradi (`updateMany where status = <oldingi>`). Ichki qadamlar
   baribir idempotent (masalan zaxira `StockMovement.reference` bo'yicha bir marta).
3. Sof qoidalar (qaysi holatdan bekor qilsa bo'ladi, qachon muddati o'tadi) —
   `@ecom/core-domain` da, DB'siz testlanadi. `order-ops` faqat Prisma yozuvlari.
4. `apps/web/src/lib/{inventory,loyalty,order-release}-server.ts` — eski import yo'llari
   buzilmasligi uchun qayta eksport (shim).
5. NestJS servislari (ADR 0012) ham shu paketdan foydalanadi — TypeORM'ga o'tishda mantiq
   qayta yozilmaydi, faqat tranzaksiya adapteri almashadi.

## Oqibatlar

- Yangi bekor qilish/yetkazish yo'li qo'shilganda yon ta'sirlarni unutish qiyinlashadi:
  bitta funksiya chaqiriladi.
- Qaytarishda zaxira endi **tovar omborga kelganda** qaytadi (kuryer RETURN topshirig'ini
  DELIVERED qilganda yoki admin «Qabul qilindi» deganda), so'rov paytida emas (Y6).
- Cron endpoint `GET /api/internal/orders/expire` — `CRON_SECRET` bo'lmasa o'chiq.
  Vercel Hobby'da kuniga bir marta (`apps/web/vercel.json`); tezroq kerak bo'lsa Pro yoki
  tashqi rejalashtiruvchi.

## Yangilanish (2026-10-12): pulni qaytarish (K5)

- Pul gateway'ga avtomatik qaytarilmaydi: admin Click/Payme kabinetida, kartaga yoki naqd
  qaytaradi va `POST /api/orders/[id]/refund` bilan **qayd etadi** (summa, usul, tranzaksiya
  raqami). Qoida `@ecom/core-domain` `refund` da (tiyin bilan, float'siz); yozuv
  `apps/admin/src/lib/refund-server.ts` da, buyurtma bo'yicha advisory lock bilan.
- Qisman qaytarish mumkin: `refundedTotal` oshadi, to'lov `PARTIALLY_REFUNDED`. To'liq qaytsa
  buyurtma `REFUNDED`, to'lov `REFUNDED`, mijozga push.
- Qaytarilgan (yetkazilgan) buyurtma pul oldin qaytarilib `REFUNDED` bo'lsa ham tovar qabul
  qilish oqimida qoladi — zaxira tovar kelganda qaytadi.
- Navbat: admin «Qaytarishlar» sahifasida «Pul qaytarilishi kerak».
- Avtomatik gateway refund (Click/Payme Merchant API) — merchant kalitlari ulangach alohida ish.

## Yangilanish (2026-10-12): cashback pul tushganda (O1)

- Sello Coins cashback buyurtma yaratilganda EMAS, pul haqiqatan tushganda beriladi:
  Click to'lovi, Payme `PerformTransaction`, karta cheki tasdig'i, naqd — yetkazilganda
  (`grantOrderEarnForOrder`, idempotent). Sarflangan coin esa darhol yechiladi (double-spend yo'q).
- Buyurtma javobidagi `coinsEarned` — va'da («+N coin olasiz»), hisobga hali tushmagan.
- Payme perform atomik: to'lov va buyurtma holati shartli yangilanadi, biri o'tmasa ikkalasi
  ham qaytariladi (P6).
