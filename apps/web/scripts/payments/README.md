# To'lov webhook simulyatsiyasi

Click/Payme **merchant kassa/kalitisiz** to'lov webhook mantiqini lokal tekshirish uchun.
O'zimiz belgilagan TEST secret bilan `/api/payments/*` endpointlariga real gateway
yuboradigan so'rovlarni yuboradi va DB holat o'zgarishini tekshiradi.

> Bu haqiqiy sertifikatsiya emas — u merchant kabinet ochilganda Payme/Click sandbox'ida
> yakunlanadi. Bu skriptlar mantiq (imzo, state-machine, atomiklik) to'g'riligini isbotlaydi.

## Ishga tushirish

1. Web dev serverni TEST secret'lar bilan ishga tushiring (alohida portda, .env'dagi
   bo'sh kalitlarni buzmaslik uchun):

   ```bash
   cd apps/web
   CLICK_SECRET_KEY=test_click_secret PAYME_KEY=test_payme_key PORT=3100 pnpm dev
   ```

2. Boshqa terminalda skriptlarni **bir xil** secret va `BASE_URL` bilan ishlating:

   ```bash
   cd apps/web
   BASE_URL=http://localhost:3100 CLICK_SECRET_KEY=test_click_secret node scripts/payments/simulate-click.mjs
   BASE_URL=http://localhost:3100 PAYME_KEY=test_payme_key node scripts/payments/simulate-payme.mjs
   ```

Har bir qadam `✅`/`❌` bilan chiqadi; oxirida umumiy natija. Skript guest buyurtma
yaratadi (loyalty'ga tegmaydi), shuning uchun DB'da bir nechta "Test Xaridor" buyurtmasi
paydo bo'ladi.

## Nima tekshiriladi

**Click:** Prepare→Complete (PAID), takroriy Complete → already paid (-4), noto'g'ri imzo
(-1), noto'g'ri summa (-2), mavjud bo'lmagan order (-5).

**Payme:** CheckPerform→Create→Perform (PAID)→Check, idempotentlik, noto'g'ri summa (-31001),
mavjud bo'lmagan order (-31050), noto'g'ri auth (-32504), noma'lum metod (-32601), to'langan
orderga takroriy tx (-31052), Cancel perform'gacha (-1) va perform'dan keyin (-2, refund +
Sello Coins qaytarish), GetStatement.
