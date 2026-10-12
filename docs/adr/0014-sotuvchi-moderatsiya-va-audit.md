# ADR 0014 — Sotuvchi va tovar moderatsiyasi, audit jurnali, daromad ta'rifi

- **Sana:** 2026-10-12
- **Holat:** Qabul qilingan
- **Kontekst:** 2026-09 auditi (Y1–Y4, Y13–Y15, O2, O8, P1, P4) seller va admin panellarida
  moderatsiya qoidalari yo'qligini ko'rsatdi. Bloklangan sotuvchining tovarlari sotuvda qolardi,
  rad etish sababi saqlanmasdi, `AuditLog` jadvaliga hech kim yozmasdi va daromad to'rt joyda
  to'rt xil hisoblanardi. Sxemani o'zgartirmasdan (prod Neon'da migratsiya alohida qaror)
  tuzatish kerak edi.

## Qaror

1. **Sotuvchi holatlari** (`SellerStatus`, mavjud enum):
   - `PENDING` — ariza; panelga kirmaydi;
   - `ACTIVE` — to'liq ruxsat; tovarlari vitrinada;
   - `SUSPENDED` — admin to'xtatgan; panelda faqat ko'radi, tovarlari vitrinadan yo'qoladi;
   - `BLOCKED` — ariza rad etilgan; panelga kirmaydi va rad etish sababini ko'radi.

   O'tishlar: tasdiqlash va rad etish faqat `PENDING` dan, to'xtatish `ACTIVE ↔ SUSPENDED`.
   Ariza STIR'siz tasdiqlanmaydi (KYC maydonlari `Seller` da allaqachon bor edi).

2. **Vitrina:** tovar `ACTIVE` bo'lishi va sotuvchisi (bo'lsa) `ACTIVE` bo'lishi shart —
   `apps/web/src/lib/product-visibility.ts` (`SELLER_IS_ACTIVE`) katalog, qidiruv, savat,
   sevimlilar, checkout va guruh xaridida bir xil.
3. **Sabablar `AuditLog.meta` da.** Rad etish, sotuvdan olish va to'xtatish sababi alohida
   ustunda emas, jurnal yozuvida saqlanadi. Sotuvchiga tovar bo'yicha ENG OXIRGI yozuv rad
   etish yoki sotuvdan olish bo'lsagina ko'rsatiladi (keyin tahrirlab qayta yuborsa, eski
   sabab yo'qoladi). Yozuv holat o'zgarishi bilan bir tranzaksiyada (`apps/admin/src/lib/audit.ts`).
   Agar keyinchalik sabablar bo'yicha qidiruv yoki hisobot kerak bo'lsa, alohida ustun
   migratsiyasi bilan ko'chiriladi.
4. **Daromad ta'rifi** (`@ecom/core-domain` `revenue`): pul tushgan (`paidAt`) va
   `CANCELLED/RETURNED/REFUNDED` bo'lmagan buyurtma, sanasi `paidAt`, kunlar Toshkent vaqti
   bo'yicha (`tashkent-time`). Admin bosh sahifasi, admin analitikasi, seller dashboard va
   seller analitikasi shundan foydalanadi.
5. **Umumiy yordamchilar:** login cheklovi `@ecom/auth` (`checkRateLimit`), xavfsiz redirect
   `@ecom/utils` (`safeInternalPath`), `pickLocalized` — `@ecom/i18n/pick` (til JSON'larisiz,
   panel bundle'i kattalashmasin), pul kiritish — `@ecom/core-domain` (`parseMoneyInput`,
   natija o'nlik satr).
6. **Panel sessiyasi:** admin va seller'da `/api/auth/refresh` (GET — middleware sahifa uchun,
   POST — client `api()` 401'da bir marta takrorlaydi). Ilgari access token 15 daqiqada tugab,
   xodim login'ga uloqtirilardi.

## Oqibatlar

- Admin to'xtatgan sotuvchining tovarlari bir so'rovda vitrinadan yo'qoladi; qayta yoqilsa
  qaytadi — tovarlar holatiga tegilmaydi.
- `AuditLog` endi haqiqiy iz: kim, qachon, nimani, qaysi IP'dan, nima sababdan.
- Admin huquqlari hali qo'pol (ADMIN = SUPER_ADMIN); alohida rollar keyingi bosqichda.
