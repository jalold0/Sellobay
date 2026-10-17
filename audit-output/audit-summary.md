# Sellobay mijoz qismi — audit xulosasi

**Sana:** 2026-10-15

**Qamrov:**

- web sayt (`apps/web`, Next.js 14) — kod, prod va Lighthouse;
- Flutter mijoz ilovasi — kod, analyzer va testlar.

**Kod:** `main` @ `a184323`.

## Umumiy baho

**Kod asosi mustahkam, lekin sayt mijozlarga keng ochilishga hali tayyor emas.**

Texnik poydevor yaxshi:

- server tomonda egalik tekshiruvlari bor;
- to'lov webhook'lari to'g'ri ishlaydi;
- tiplar toza, testlar yashil (web 119, Flutter 224).

Ammo prod'da ishlamaydigan yoki o'zini ishlayotgandek ko'rsatadigan joylar bor:

- telefon bilan kirish;
- parolni tiklash;
- sozlamalar;
- Sello Coins balansi;
- demo mahsulotlar;
- soxta kontaktlar.

Mijoz bunday narsani birinchi tashrifdayoq sezadi va ishonch shu yerda yo'qoladi. Bundan tashqari ikkita xavfsizlik xatosi bor, ular kichik kod o'zgarishi bilan tuzatiladi.

P0 topilma yo'q. **P1 — 10 ta**, P2 — 22 ta, P3 — 14 ta.

## Nima yaxshi ishlaydi

- **Buyurtma oqimi:** katalog → mahsulot → savat → checkout → buyurtma kodda to'liq. Buyurtma idempotent, mehmon ham buyurtma bera oladi.
- **Xavfsizlik asoslari:**
  - cookie'lar httpOnly, parollar argon2id bilan saqlanadi;
  - server ma'lumot egasini tekshiradi;
  - Click va Payme imzolari tekshiriladi;
  - HSTS va X-Frame-Options sozlangan.
- **SEO:** mahsulot sahifasining SEO'si yaxshi (Lighthouse SEO 100, JSON-LD, sitemap).
- **Flutter ilova:** tokenlar xavfsiz saqlanadi, kodda mock yo'q, testlar keng.

## Eng muhim xavflar

1. **Soxta oqimlar prod'da** (FUN-01…05, TRU-01). Telefon bilan kirishda kod kelmaydi. «Parolni unutdim», sozlamalar va coin balansi soxta. Demo mahsulot sahifalari ochiladi, kontaktlar `example.uz`.
2. **XSS** (SEC-01). Sotuvchi mahsulot tavsifiga skript yozib, xaridorlar brauzerida ishga tushira oladi. Tuzatish — bitta qator.
3. **Bloklangan akkaunt OTP orqali tiklanadi** (SEC-02). SMS ulanishidan **oldin** tuzatilishi shart.
4. **To'lov boshlanmasa ham «buyurtma qabul qilindi» deyiladi** (FUN-06).
5. **Mahsulot sahifasi telefonda ekrandan kengayib ketadi** (UX-01). Bosh sahifa mobil tezligi 37/100, LCP 6,7 s (PERF-01).

## Birinchi navbatda nima qilish kerak

1. **Bir kunlik ish:**
   - SEC-01: JSON-LD'ni ekranlash;
   - SEC-02: OTP blok tekshiruvi;
   - SEC-03: xavfsiz redirect;
   - FUN-02: demo va test mahsulotlarni admin panelda o'chirish (kod emas, operatsion ish);
   - UX-01: mahsulot tablari;
   - SEO-01: robots.txt;
   - TRU-02: soxta chegirma foizi.
2. **Soxta funksiyalarni yopish yoki ulash:**
   - parolni tiklash;
   - sozlamalar;
   - coin sahifasi;
   - kontaktlar;
   - aloqa formasi.
3. **SMS (Eskiz) ulash.** Undan oldin SEC-02, SEC-04 va SEC-05 tuzatiladi.
4. **To'lov natijasini to'g'ri ko'rsatish va qayta to'lash** (FUN-06), web'da qaytarish so'rovi (FUN-07).
5. **Mobil tezlik va accessibility:**
   - bosh sahifa JS va layout yuki;
   - kontrast;
   - forma yorliqlari;
   - CSP.
6. **Flutter'ni do'konga tayyorlash:**
   - release imzo;
   - crash monitoring;
   - sessiya muddati;
   - iOS sozlamalari.

## Cheklovlar

- Prod'da hech narsa yaratilmadi, shuning uchun to'lov va profil oqimlari prod'da sinalmadi.
- `pnpm audit` ishlamadi, bog'liqliklarning zaifliklari tekshirilmadi.
- Lighthouse har sahifada bitta laboratoriya o'lchovi.
- Flutter ilovasi qurilmada qo'lda sinalmadi.
- Admin, sotuvchi va kuryer ilovalari qamrovdan tashqarida.

## Fayllar

- `frontend-audit-report.html` — rahbariyat uchun taqdimot
- `audit-findings.md` — barcha topilmalar dalillari bilan
- `audit-coverage.md` — nima tekshirildi va nima tekshirilmadi
- `audit-methodology.md` — buyruqlar, o'lchov sharoiti, natijalar
- `screenshots/` — prod skrinshotlari
