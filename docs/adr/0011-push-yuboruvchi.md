# ADR 0011 — Push yuboruvchi: umumiy paket `@ecom/push`, FCM HTTP v1

- **Sana:** 2026-10-08
- **Holat:** Qabul qilingan
- **Kontekst:** Mijoz va kuryer Flutter ilovalari qurilma tokenini
  `POST /api/push/token` orqali yuboradi (`PushToken` jadvali). Buyurtma
  holatini esa ikki xil ilova o'zgartiradi: `apps/web` (kuryer yetkazishi)
  va `apps/admin` (xodim PATCH `/api/orders/[id]/status`).

## Qaror

1. Yuboruvchi `packages/push` (`@ecom/push`) paketida — web ham, admin ham
   bir xil kodni ishlatadi, nusxa ko'chirilmaydi.
2. **FCM HTTP v1** to'g'ridan-to'g'ri `fetch` bilan; Firebase Admin SDK
   qo'shilmadi (og'ir, serverless bundle'ni kattalashtiradi). OAuth tokeni
   service account'dan `jose` bilan imzolanadi va 1 soat keshlanadi.
3. Service account `FIREBASE_SERVICE_ACCOUNT` env'ida. **Sozlanmagan bo'lsa
   hamma narsa jimgina o'chiq** (lokal, preview, CI).
4. **Push hech qachon xato tashlamaydi** va buyurtma oqimini to'xtatmaydi:
   chaqiruvlar tranzaksiya COMMIT'IDAN KEYIN, har fetch 4 soniya bilan
   cheklangan.
5. Matn qo'lda yozilmaydi: `@ecom/i18n` dan foydalanuvchi tilida.

## Qaysi o'zgarishlarga xabar ketadi

Faqat mijozning hayotiga ta'sir qiladigan holatlarga: `CONFIRMED`,
`SHIPPED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `RETURNED`,
`REFUNDED`. `PAID`/`PACKED` kabilar shovqin. **Mijozning o'zi qilgan
amalga** (bekor qilish, qaytarish) xabar ketmaydi — u buni biladi.
Xabar faqat `customer` ilovasi tokenlariga boradi.

## Oqibatlar

- O'lik tokenlar (`UNREGISTERED`) jo'natish paytida bazadan o'chiriladi;
  vaqtinchalik xatolar tokenga tegmaydi.
- Mehmon buyurtmasi (`userId: null`)ga qurilma yo'q — xabar ketmaydi.
- Hali yo'q: ilova ichida xabarni ochganda tegishli buyurtmaga o'tish,
  kuryerga yangi topshiriq haqida xabar, `REFUNDED` ni o'zgartiruvchi admin
  oqimiga ulash.
