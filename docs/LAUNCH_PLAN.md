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

- [x] **I1 — product-card hardcoded matnlar (`@ecom/ui`).** ✅ 2026-07-13 · `4a12614`. ProductCard
      endi majburiy `labels` prop oladi (quickView/outOfStock/addToCart/onlyLeft/wishlist),
      ProductCardClient `t()` bilan uzatadi. Yangi kalitlar: `product.quickView`,
      `product.onlyLeft` (uz/ru/en). Typecheck yashil, i18n paritet 806/806, preview'da 3 tilda
      tekshirildi (uz/ru/en — addToCart, onlyLeft, console xatosiz).
- [x] **I2 — i18n kalit pariteti tekshiruvi.** ✅ 2026-07-12: 804 kalit, 0 farq (uz/ru/en). `scripts/i18n-check.ts`. uz/ru/en o'rtasida yetishmayotgan kalitlarni topuvchi
      kichik skript (`scripts/i18n-check.ts`) — chuqur obyekt kalitlarini solishtiradi. Topilgan
      farqlarni to'ldir. **Qabul:** skript "0 farq" chiqaradi.
- [x] **I3 — Kritik oqimlarda qolgan hardcoded matnlar.** ✅ 2026-07-13 · `7204c51`. Skaner natijasi:
      cart/checkout/catalog komponentlari allaqachon toza edi; qarz orders tracker, orders/success,
      profile personal, brand sahifasi va metadata title'larda edi — hammasi `t()`ga o'tdi (yangi
      `tracking`/`orderSuccess`/`brand` ns + profile kengaytmasi, paritet 836/836). Bonus fix:
      `[locale]/layout`da locale validatsiyasi — /favicon.ico invalid locale bilan SSR bo'lib har
      sahifada Intl RangeError log qilardi. Preview: brand/success/cart/checkout/PDP-404 3 tilda
      yashil, console/server xatosiz. Eslatma: /orders va /profile auth ortida — kalitlar parity
      skript bilan tasdiqlangan, vizual smoke login talab qiladi (statik sahifalar faq/terms/offer
      I3 doirasiga kirmadi — kritik oqim emas).

## P2 — Kichik polish (xavfsiz, vaqt qolsa)

- [x] **S1 — Toshkent bbox vs viloyat yetkazish siyosati polish** ✅ 2026-07-13 · `e016fd0`.
      Umumiy `looksLikeTashkentCityText` heuristika `@ecom/utils/geo`ga ko'chdi; `/api/orders`
      endi koordinatasiz (web) so'rovlarda ham region/city matni bo'yicha DELIVERY_OUT_OF_ZONE
      qaytaradi; checkout'da viloyat manzili submit'ni bloklaydi (avval faqat warning edi).
      Preview'da ikkala yo'nalish tekshirildi, DB'ga yozilmadi.
- [x] **S2 — Bo'sh holatlar qayta ko'rish (mobil).** ✅ 2026-07-13 · `5c9d7ef`. EmptyState ikon
      doirasi crimson-chip + serif sarlavha; 7 ta empty-state ikonkasi slate/kulrangdan
      crimson-bright'ga o'tdi (cart/orders/checkout/addresses/payment). Bonus: mobil wishlist +
      cart + checkout-empty hardcoded matnlari va web wishlist sahifasi t()ga o'tdi (yangi
      `wishlist` ns, paritet 841/841). Typecheck yashil. ⚠️ RN qurilmada vizual smoke qolgan
      (bu muhitda Expo preview yo'q).

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
- **2026-07-13** · I1 (product-card labels prop) · `4a12614` · ProductCard'dagi 5 hardcoded matn
  (`Tez ko'rish`, `Mavjud emas`, `Savatga qo'shish`, `Faqat X ta qoldi!`, wishlist aria) labels
  prop'ga ko'chdi, 2 yangi kalit qo'shildi — paritet 806/806, preview 3 tilda yashil. Keyingi: I3.
- **2026-07-13** · I3 (kritik oqim hardcode skaneri) · `7204c51` · orders tracker + success +
  profile + brand + metadata title'lar t()ga o'tdi (30 yangi kalit, paritet 836/836). Muhim topilma:
  /favicon.ico `[locale]` segmentiga tushib invalid locale bilan SSR bo'lar, har sahifa yuklashda
  server logda IntlError RangeError to'planardi — layout'da locale validatsiyasi (notFound) bilan
  tuzatildi. Keyingi: S1 (Toshkent bbox yetkazish siyosati).
- **2026-07-13** · S1 (yetkazish zonasi validatsiyasi) · `e016fd0` · Klient: viloyat + uyga
  yetkazish → submit blok + punktga o'tish taklifi. Server: matn-heuristika bilan
  DELIVERY_OUT_OF_ZONE (koordinatasiz web so'rovlar ham qamraldi). Preview'da real oqim bilan
  tekshirildi (savat→checkout→blok; API 400; Toshkent o'tadi). Keyingi: S2 (mobil bo'sh holatlar).
- **2026-07-13** · S2 (mobil bo'sh holatlar) · `5c9d7ef` · EmptyState crimson uslub (chip fon,
  serif sarlavha, crimson ikonlar) + wishlist/cart/checkout-empty i18n qarzi yopildi (mobil+web,
  paritet 841/841). NAVBAT BO'SH: P0/P1/P2 barcha ochiq vazifalar tugadi. Qolganlar: H4 (sizning
  qaroringiz) + 🔒 bloklanganlar. RN vizual smoke qurilmada tekshirilsin.
