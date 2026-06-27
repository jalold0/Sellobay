# Sellobay — Launch Checklist (MVP)

> **Maqsad:** 2026-07-13 ishga tushirish. Bu ro'yxat — nimasiz launch qilib bo'lmaydi (BLOCKER),
> nima yaxshi bo'ladi (SHOULD), nimani keyinga qoldiramiz (POST-LAUNCH).
> Belgilar: `[ ]` qilinmagan · `[x]` tayyor · 🔒 sizdan hisob/harakat kerak · 👤 kim

---

## 🔴 BLOCKER — bularsiz LAUNCH yo'q

### To'lov
- [ ] 🔒👤 **Click merchant hisob** ochish (eng sekin — bugun boshlang!)
- [ ] 🔒👤 **Payme merchant hisob** ochish
- [ ] To'lov provider'larni jonli web checkout'ga ulash (kod tayyor — `apps/api` provider'lar bor)
- [ ] To'lov e2e test: buyurtma → to'lov → tasdiq → status

### SMS (telefon OTP)
- [ ] 🔒👤 **Eskiz.uz hisob** + API kalit
- [ ] Eskiz SMS provayderini ulash (hozir email login ishlaydi, telefon OTP yo'q)

### Rasm yuklash
- [ ] 🔒👤 **Cloudinary hisob** (bepul tier) + kalitlar
- [ ] Sotuvchi mahsulot rasmini yuklashi (hozir mock/URL)

### Prod muhit
- [ ] 🔒👤 **Domen** (masalan sellobay.uz) — Vercel'ga ulash
- [ ] Neon `-pooler` connection string (serverless scale uchun) — env o'zgarishi
- [ ] Vercel environment variables: DATABASE_URL, JWT, Eskiz, Cloudinary, Click/Payme
- [ ] Prod smoke test: ro'yxatdan o'tish → mahsulot → savat → buyurtma → to'lov (3 til)

### Mobil
- [ ] 🔒👤 **EAS rebuild**: `eas build --platform android --profile preview --clear-cache`
      (yangi logo + haptics + Sello Coins)

### Huquqiy (O'zbekiston bozori uchun zarur)
- [ ] Ommaviy oferta (terms) sahifasi
- [ ] Maxfiylik siyosati (privacy) sahifasi
- [ ] Qaytarish/kafolat shartlari

---

## 🟡 SHOULD — launch'da bo'lsa yaxshi (lekin bloklamaydi)

- [ ] 🔒👤 **Sentry DSN** (sentry.io bepul) — crash tracking (kod ulashga tayyor)
- [ ] 5-10 beta tester (do'st/oila) — real qurilmada sinov
- [ ] Verified Seller backend (hozir chip mock)
- [ ] Profil sub-sahifa form'lari i18n (orders/addresses/settings — hali UZ)
- [ ] Bo'sh holatlar (empty states) polish
- [ ] Onboarding ekranlari (mobile, 3-4 ekran)

---

## 🟢 POST-LAUNCH — launch'dan keyin (v1.1+)

**Differensiatorlar:**
- [ ] Group buy (Pinduoduo uslubi — 5 kishi → chegirma)
- [ ] Wishlist sharing (viral sovg'a ro'yxati)
- [ ] AI mahsulot tavsifi (sotuvchi UZ → AI RU/EN)

**To'liq qilinadigan app'lar (hozir foundation):**
- [ ] courier (kuryer ilovasi)
- [ ] wms (ombor)
- [ ] telegram-bot + telegram-mini-app

**Polish & innovatsiya:**
- [ ] Dark mode, Lottie, microinteractions (mobile)
- [ ] Redis (Upstash) — trafik o'sganda
- [ ] Sello AI Stylist, Live savdo, AR Try-On
- [ ] Sellobay Global (Xitoy→O'zbekiston) — `docs/SELLOBAY_GLOBAL.md`

---

## ⚠️ Asosiy xavf

**Click/Payme merchant tasdig'i** O'zbekistonda bir necha kun-hafta cho'zilishi mumkin (byurokratiya).
Bu deadline'ga yagona jiddiy tahdid — **bugundan boshlang.** Tasdiq kutilayotганda kod
tomonidan hamma narsa tayyor turadi.

> Oxirgi yangilanish: 2026-06-28
