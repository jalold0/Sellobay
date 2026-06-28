# Sellobay — Master Roadmap & Progress

> **Yagona haqiqat manbai (single source of truth).** Barcha rejalar shu yerda — bajarilganlar
> belgilangan. Maqsad: **bitta ishni ikki marta qilmaslik.** Boshqa kompyuter/dasturda
> `git pull` qilib shu fayldan davom eting.
>
> **Oxirgi yangilanish:** 2026-06-28 · **MVP launch:** 2026-07-13
>
> **2026-06-28:** Vercel deploy + CI yashil · huquqiy sahifalar · Verified Seller backend · profil i18n · Group Buy (web UI) · to'lov skeleti (Click/Payme) · React 19 birlashtirildi (web+mobil) · mobil checkout auth-gate · **Admin real DB:** buyurtmalar/mijozlar/mahsulotlar · **Seller real DB:** dashboard/buyurtmalar/mahsulotlar
>
> **Qolgan sync:** admin dashboard+detail([id]), seller inventory/finance/analytics/returns, mahsulot qo'shish (Cloudinary kerak)
>
> **Belgilar:** `[x]` bajarilgan · `[ ]` qilinmagan · `[~]` qisman · 🔒 bloklangan (tashqi narsa kerak)

---

## 0. Asos (Foundation) — TAYYOR

- [x] Turborepo monorepo (9 app + 8 paket), pnpm, TypeScript strict
- [x] Backend: NestJS + Prisma + Neon PostgreSQL (jonli)
- [x] Auth: custom JWT + argon2 + OTP (end-to-end ishlaydi)
- [x] Web (Next.js 14): 40+ sahifa, Zustand cart/wishlist, SSR-safe formatter, SEO
- [x] Mobile (Expo SDK 54): 11 ekran, NativeWind, Zustand+MMKV, EAS APK
- [x] Admin / Seller panellar foundation (mock-first)
- [x] Domain qoidalari: Decimal pul, Asia/Tashkent, +998, slugify, i18n pickLocalized

---

## 1. Brending & Logo — TAYYOR (2026-06-19)

- [x] SellobayMark rasmiy "S" logo (reference rasm asosida, v8-official-s)
- [x] Web/Admin/Seller favicon (icon.png 32 + apple-icon.png 180) yangilandi
- [x] Mobile assets (icon, adaptive-icon, favicon) yangilandi
- [ ] 🔒 Mobile APK'da yangi logo ko'rinishi — **yangi EAS build kerak** (sizning amaliyotingiz)

---

## 2. i18n — 3 til (uz / ru / en) — WEB TAYYOR (2026-06-19)

- [x] Locale switcher tuzatildi (Radix dropdown portal, "uz UZ" takror bartaraf)
- [x] Header (top bar, kategoriyalar, nav), auth-menu
- [x] Hero, trust strip
- [x] Home: category-grid, sale-section, seller-banner, testimonials, featured-collection
- [x] Footer, newsletter, skip-link, animated-search, mobile-nav
- [x] Catalog (filtr/sort), product detail, cart, checkout
- [x] Login, register, sale, search sahifalari
- [x] Profile-shell (nav, sign-out) + product-card toast'lari
- [x] Profil sub-sahifa BODY'lari (orders/addresses/settings/payment formlari) i18n — uz/ru/en (2026-06-28)
- [ ] Mobile i18n (hozircha hardcoded uz; expo-localization + pickLocalized kerak)

---

## 3. Performance & DB — TAYYOR (2026-06-19)

- [x] N+1 fix: `relationLoadStrategy: 'join'` (5 query → 1 LATERAL JOIN)
- [x] `unstable_cache` — catalog 120s kesh, tag='products'
- [x] Composite indexlar (status+deletedAt+sort) — Neon'ga push qilindi
- [ ] Redis (Upstash) — hozir `unstable_cache` yetarli; trafik o'sganda
- [ ] Neon `-pooler` connection (Vercel serverless scale uchun) — env o'zgarishi
- [ ] 🔒 Sentry crash tracking — **DSN kerak** (sentry.io bepul account)

---

## 4. Conversion (Savdoni oshirish) — TAYYOR (2026-06-19)

- [x] Sticky "Savatga qo'shish" bar (product detail, scroll'da paydo bo'ladi)
- [x] Guest checkout (login majburiy emas, faqat telefon)
- [x] Trust/social-proof chiplari (Tasdiqlangan sotuvchi / Mashhur / Yuqori baholangan)
- [x] Checkout'da Sello Coins earn hint
- [ ] Onboarding (3-4 ekran, mobile, birinchi ochilishda)
- [ ] Bottom sheet filtrlar (mobile)
- [ ] Recently viewed strip
- [ ] Bo'sh holatlar (empty states) polish

---

## 5. Mobile premium polish — TAYYOR (2026-06-19)

- [x] expo-image (AppImage wrapper) — kesh + fade, barcha rasm
- [x] expo-haptics — add/wishlist/qty/tab/sort/shipping/payment/checkout
- [x] Skeleton screens — home, catalog, product detail loading
- [ ] 🔒 APK'da ishlashi uchun yangi EAS build kerak (haptics yangi native dep)
- [ ] Microinteractions (like animation, savatga 3D effekt)
- [ ] Dark mode
- [ ] Lottie animatsiyalar (bo'sh savatcha, buyurtma yetkazildi)

---

## 6. Sello Coins (Sodiqlik tizimi) — ASOSIY QISM TAYYOR (2026-06-19)

> Differensiator: earn + redeem cashback loop (Uzum/OLX'da yo'q). Iqtisod: 1 coin/1000 so'm,
> 1 coin = 10 so'm → 1% cashback. Tafsilot: `docs/`'da emas, kod: `apps/web/src/lib/loyalty*.ts`.

- [x] Loyalty hub (`/profile/loyalty`): balans, tier+progress, kunlik check-in, earn yo'llari, redeem, tarix
- [x] Earn-on-purchase BACKEND (orders API atomik $transaction + LoyaltyTransaction + loyaltyPoints)
- [x] `GET /api/loyalty` — real balans + spent (aggregate) + tarix
- [x] Redeem (coin → chegirma) checkout'da — atomik settle (spend+earn), balans validatsiya
- [x] 3 til (uz/ru/en)
- [x] **Mobile Sello Coins UI** (2026-06-20): loyalty ekran, balans/tier/check-in(haptics)/earn/redeem/history
- [x] **Mobile real balans + checkout redeem** (2026-06-20): auth ulangach loyalty real fetch +
      checkout redeem toggle (Bearer-only verified: 509→763, redeem 50, discount 500)
- [x] **Kunlik check-in BACKEND** (2026-06-20): `POST /api/loyalty/checkin`, kuniga 1 marta +5,
      idempotent (Asia/Tashkent kun), atomik. GET `checkedInToday` qaytaradi. Web+mobile ulangan.
      Verified: 1-chi +5 (763→768), 2-chi alreadyClaimed (768).
- [ ] Boshqa earn triggerlari: review / referral / birthday (backend — review/referral flow kerak)
- [x] Mobile real balans — mobile auth → API ulandi (11-bo'lim) ✅

> **Sello Coins endi web + mobile'da to'liq parity: earn + redeem + kunlik check-in + real balans.** ✅

---

## 7. Phase 1 — Differensiatsiya (launch atrofida)

- [x] Sello Coins (yuqorida) ✅
- [~] Group buy (Pinduoduo mexanizmi): web UI to'liq — /group-buy sahifa, progress, countdown, join, share, 3 til, footer havola, mock-first (2026-06-28). Qoldiq: real backend (Prisma GroupBuy/GroupBuyMember + API + Neon migratsiya) va checkout ulanishi
- [ ] Wishlist sharing (link orqali "sovg'a ro'yxati", viral)
- [ ] Multi-language smart description (sotuvchi UZ yozadi → AI RU/EN)
- [~] Verified Seller: backend to'liq (admin approve/reject + sotuvchilar ro'yxati real DB, 2026-06-28); mahsulotdagi "Tasdiqlangan" chip hali har doim ko'rinadi (kosmetik qoldiq)

---

## 8. Phase 2 — Scale & Innovatsiya (post-launch)

- [ ] **Sello AI Stylist** — rasmga ol → AI o'xshash mahsulot topadi (Claude vision)
- [ ] **Live Marketplace** — jonli efir savdo (TikTok Shop uslubi)
- [ ] **1-soatlik yetkazish** (Toshkent Express zona)
- [ ] AR Try-On (ko'zoynak/etik/labbo'yoq)
- [ ] Image search (Pinterest Lens uslubi)
- [ ] Seller real-time order push (WebSocket)
- [ ] Merchant analytics dashboard (top mahsulot, konversiya, demografiya)
- [ ] Bulk upload (Excel/CSV), promo creator, seller wallet

---

## 9. Sellobay Global — Chegaralararo (post-launch)

> To'liq reja: **`docs/SELLOBAY_GLOBAL.md`**

- [x] Strategik reja hujjati yaratildi
- [ ] Faza 0: bozor + huquqiy tadqiqot, PoC (100 mahsulot tarjima)
- [ ] Faza 1: **Xitoy** (AliExpress → 1688/Taobao) integratsiya
- [ ] Faza 2: **Turkiya** (Trendyol) + **Koreya** (Coupang/Olive Young)
- [ ] Faza 3: AQSh / Yevropa / Rossiya
- [ ] Texnik: `packages/sourcing` adapterlar, `apps/integration-worker`, AI tarjima pipeline, narxlash

---

## 10. 🔒 Bloklangan (sizdan harakat kerak)

- [ ] **Sentry DSN** — sentry.io'da bepul account → project → DSN (men kodni ulayman)
- [ ] **Mobile EAS rebuild** — `eas build --platform android --profile preview --clear-cache`
      (yangi logo + haptics + kelajakda Sello Coins mobile uchun)

---

## 11. Mobile auth → API (Bearer token) — TAYYOR (2026-06-20)

> Avval web auth 100% cookie-based edi → mobile API'ga autentifikatsiya qila olmasdi.
> Endi Bearer token qo'llab-quvvatlanadi. End-to-end verified (curl: Bearer-only → real data, cookie → real data, auth'siz → 401).

- [x] `getCurrentUser` — `Authorization: Bearer <token>` + cookie ikkalasini qabul qiladi
- [x] Login/register/OTP-verify API'lar token'ni response body'da qaytaradi (`createSession` ajratildi)
- [x] Mobile login ekrani real API'ga ulanadi (email + telefon OTP) → `session.signIn`
- [x] Mobile `api.ts` — `Authorization: Bearer` yuboradi (createOrder, loyalty); `loginWithPassword/sendOtp/verifyOtp/fetchLoyalty` qo'shildi
- [x] Mobile session user'ni MMKV'da saqlaydi/tiklaydi (hydrate real)
- [x] Mobile loyalty ekran real balans fetch (mock fallback)
- [x] Web cookie auth regression yo'q (tasdiqlandi)
- [ ] 🔒 Telefon OTP SMS provayder (dev'da kod yuborilmaydi — email login to'liq ishlaydi)

---

## Qanday yangilash

Ish tugaganda shu faylda `[ ]` → `[x]` qiling va sanani yozing. Yangi reja paydo bo'lsa
tegishli bo'limga qo'shing. Bu faylni **har doim eng so'nggi holatda** saqlang — jamoa va
boshqa kompyuterlar shundan foydalanadi.
