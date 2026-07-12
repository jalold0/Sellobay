# Sellobay — Launch Plan (avtomatik ish navbati)

> **Maqsad:** MVP launch **2026-07-13** gacha kritik oqimlarni mustahkamlash (hardening) va
> kichik launch-quality polish. **Yangi katta funksiya YO'Q.**
>
> Bu fayl — avtomatik ish jarayonining **yagona haqiqat manbai**. Har ertalab `/launch-continue`
> buyrug'i shu fayldan keyingi bajarilmagan vazifani oladi, bajaradi, tekshiradi, branch'ga commit
> qiladi va bu yerni yangilaydi. Yuqori darajali reja — [ROADMAP.md](./ROADMAP.md).
>
> **Branch:** `feat/seller-golive-payments` · **Belgilar:** `[ ]` navbatda · `[~]` boshlangan ·
> `[x]` tugallangan · 🔒 bloklangan (sizdan/tashqi narsa kerak)

---

## ⚙️ Guardrails (avtomatik ish qoidalari — QAT'IY)

1. **Faqat `feat/seller-golive-payments` branch'ida ishla.** `main`'ga HECH QACHON merge/push qilma.
2. Har vazifani tugatgach: `pnpm typecheck` yashil bo'lishi shart. Web'da kuzatiladigan o'zgarish
   bo'lsa — preview'da tekshir (console error yo'q, kutilgan natija ko'rinadi).
3. Tekshiruv o'tsa — **conventional commit** qil (Co-Authored-By bilan), vazifani `[x]` belgila,
   commit hash + sanani yoz, "Kunlik jurnal"ga bir qator qo'sh. Keyin **keyingi vazifaga o't**.
4. Bir vazifa 2 marta muvaffaqiyatsiz bo'lsa (typecheck/verify tushmasa) — commit QILMA,
   jurnaliga sababini yoz, `[~]` qoldir va **to'xta** (odam ko'rsin).
5. Vazifa tashqi resurs / sizning qaroringiz kerak bo'lsa — uni **🔒 Bloklangan**ga ko'chir,
   sababni yoz, o'zi bajarishga urinma.
6. Migratsiya/`.env`/schema o'zgarishi — faqat zarur bo'lsa va jurnalда aniq belgilab.
   Hech qanday vaqtinchalik workaround qoldirma (CLAUDE.md).
7. Hardcode matn qo'shma — har doim `pickLocalized()` / `t()` (CLAUDE.md). Pul — Decimal/string.
8. Bitta sessiyada bir nechta vazifani ketma-ket bajar; to'xtash sharti (navbat bo'sh / bloklangan /
   ikki marta muvaffaqiyatsiz) yetguncha davom et.

---

## P0 — Launch-kritik hardening (avtomatik smoke/e2e)

> Test skriptlari repo root'dan: `npx tsx scripts/<nom>.ts` (jonli DB, hammasi `$transaction`
> ichida ATAYIN rollback — hech narsa saqlanmaydi). Namuna: `scripts/inventory-test.ts`,
> `scripts/fulfillment-test.ts`.

- [x] **H1 — Buyurtma hayotiy sikli (COD) e2e smoke.** ✅ 2026-07-12: 9/9 PASS. Bitta skript: buyurtma yaratish → stock
      kamayadi (`deductStockForOrder`) → admin status DELIVERED → COD `Payment` PAID + `paidAt` + `soldCount++` (`fulfillment-server.updateOrderStatus`). **Qabul:** skript yashil, har qadam
      assert bilan, oxirida rollback. Fayl: `scripts/order-lifecycle-test.ts`.
- [x] **H2 — Qaytarish/bekor restock + reversal smoke.** ✅ 2026-07-12: 9/9 PASS. Buyurtma → return → stock tiklanadi
      (`restockOrder`) + Sello Coins cashback revoke + ishlatilgan coin refund + promokod
      usedCount/UserCoupon tiklanadi. **Qabul:** har reversal assert bilan, rollback. Fayl:
      `scripts/return-reversal-test.ts`.
- [x] **H3 — Oversell concurrency test.** ✅ 2026-07-12: 4/4 PASS. stock=1 da N ta parallel buyurtma → aynan 1 tasi o'tadi,
      qolganlari `InsufficientStockError`. **Qabul:** parallel `Promise.allSettled`, aynan 1
      fulfilled, rollback. Fayl: `scripts/oversell-concurrency-test.ts`.
- [~] **H4 — To'lov simulyatsiyalari qayta yashil.** ⚠️ 2026-07-12: PAUSA — bu skriptlar launch DB'ga
  doimiy "Test Xaridor" buyurtmalarини yozadi (POST /api/orders, rollback emas). Launch arafasida
  DB'ni ifloslantirmaslik uchun SIZNING qaroringiz kerak: (a) scratch/local DB'da yurgizamizmi,
  yoki (b) yozib keyin test buyurtmalarни tozalaymizmi. To'lov webhook kodi oxirgi commitlarда
  o'zgarmagan → regressiya xavfi past. `apps/web/scripts/payments/` (Click/Payme/COD)
  skriptlarini ishga tushirib, oxirgi o'zgarishlardan keyin ham 6/6, 15/15, 2/2 o'tishini
  tasdiqla. **Qabul:** hammasi PASS; tushsa — sababni topib tuzat yoki jurnalда belgila.

## P1 — i18n / to'g'rilik qarzi (launch oqimlarida)

- [ ] **I1 — product-card hardcoded matnlar (`@ecom/ui`).** "Mavjud emas", "Faqat X ta qoldi!",
      hover "tez ko'rish" — `packages/ui/src/components/product-card.tsx`. UI paketi i18n
      kontekstiga ega emas → matnlarni **prop orqali** uzat (masalan `labels?: {...}`), default
      ingliz/uz emas, chaqiruvchi (`apps/web` ProductCardClient) `t()` bilan beradi. **Qabul:**
      typecheck yashil, katalog/PDP kartalarida 3 tilda to'g'ri matn (preview).
- [x] **I2 — i18n kalit pariteti tekshiruvi.** ✅ 2026-07-12: 804 kalit, 0 farq (uz/ru/en). `scripts/i18n-check.ts`. uz/ru/en o'rtasida yetishmayotgan kalitlarni topuvchi
      kichik skript (`scripts/i18n-check.ts`) — chuqur obyekt kalitlarini solishtiradi. Topilgan
      farqlarni to'ldir. **Qabul:** skript "0 farq" chiqaradi.
- [ ] **I3 — Kritik oqimlarda qolgan hardcoded matnlar.** catalog/PDP/cart/checkout/orders/profile
      da qolgan user-facing hardcoded satrlarni skaner qilib (grep) `t()`/`pickLocalized`ga o'tkaz.
      **Qabul:** ro'yxatdagi fayllarda hardcoded user-string qolmaydi; typecheck+preview yashil.

## P2 — Kichik polish (xavfsiz, vaqt qolsa)

- [ ] **S1 — Toshkent bbox vs viloyat yetkazish siyosati polish** (ROADMAP §12): uyga yetkazish
      faqat Toshkent bbox ichida, viloyatlarga punkt majburiy — checkout validatsiyasi.
- [ ] **S2 — Bo'sh holatlar qayta ko'rish (mobil).** Web tugadi; mobil bo'sh holatlar (savat/
      wishlist/orders) yangi crimson uslubga mosligini tekshir.

---

## 🔒 Bloklangan (SIZDAN / tashqi narsa kerak — avtomatik BAJARILMAYDI)

- 🔒 **Merchant kassa kalitlari** (Click/Payme shartnoma) → Vercel env + Payme sandbox sertifikatsiya
- 🔒 **SMS OTP provayder** (hozir dev'da kod yuborilmaydi; email login ishlaydi)
- 🔒 **Mobile EAS rebuild** (`eas build --platform android --profile preview`) — yangi native deps
- 🔒 **Sentry DSN** (sentry.io bepul account) — men kodni ulayman
- 🔒 **Neon `-pooler` connection** (Vercel serverless scale) — env o'zgarishi

---

## 📓 Kunlik jurnal

> Har bajarilgan vazifa/sessiya bu yerga bir-ikki qator: sana · vazifa · commit · natija/eslatma.

- **2026-07-12** · H1 (order lifecycle COD e2e) · `scripts/order-lifecycle-test.ts` · **9/9 PASS**
  (stock 100→98, DISPATCH yozildi, DELIVERED, COD Payment PAID + paidAt, soldCount +2, yetkazishда
  qayta restock yo'q — hammasi rollback). Loop birinchi marta ishga tushdi, ishlaydi. Keyingi: H2.
- **2026-07-12** · H2 (return reversal) · `scripts/return-reversal-test.ts` · **9/9 PASS** (restock
  98→100 + RETURN movement, loyalty refunded 30/revoked 50, ballar 1000→980, promokod usedCount 1→0,
  UserCoupon redeemedAt bekor — rollback). Keyingi: H3 (oversell concurrency).
- **2026-07-12** · H3 (oversell concurrency) · `scripts/oversell-concurrency-test.ts` · **4/4 PASS**
  (stock=1, 5 parallel alohida tx → aynan 1 o'tdi, 4 InsufficientStock, yakuniy 0, 1 DISPATCH).
  Real DB'ga tegdi (throwaway variant+inventar), ortidan 0 qoldiq — tozalandi. Keyingi: H4 (to'lov sim).
- **2026-07-12** · H4 (to'lov sim) · ⏸️ PAUSA — launch DB'ga doimiy test buyurtma yozadi, sizning
  qaroringiz kerak (yuqoriga qarang). Skip qilindi.
- **2026-07-12** · I2 (i18n parity) · `scripts/i18n-check.ts` · **0 farq** (804 kalit, uz/ru/en toza).
  Keyingi: I1 (product-card hardcoded matn → prop) — kod refaktori, ertaga davom.
