# Sellobay — joriy holat (operatsion)

> **Bu fayl — istalgan kompyuter va istalgan akkauntdan topiladigan holat.** `git pull` qiling va
> shu yerdan boshlang. claude.ai'dagi «Sellobay holati» sahifasi faqat bitta akkauntda ochiladi;
> repo'dagi shu fayl esa hammaga ochiq manba.
>
> **Oxirgi yangilanish:** 2026-10-17 · `main` = `ce254c2` (!77 gacha hammasi merge qilingan).
> Uzoq muddatli reja: [`ROADMAP.md`](ROADMAP.md). Qarorlar: [`adr/`](adr/).

## 1. Prod qayerda va qanday

| Narsa          | Qiymat                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| Sayt           | https://www.sellobay.uz (apex `sellobay.uz` → 308 → www)                                                          |
| Admin / Seller | https://admin.sellobay.uz · https://seller.sellobay.uz                                                            |
| Hosting        | Vercel, team `sifat-nazorati-s-projects` (Hobby): `sellobay-web`, `-admin`, `-seller`, `-telegram-app`            |
| Kod            | GitLab `gitlab.com/jalold0/Sellobay` (asosiy). GitHub — avtomatik ko'zgu, unga to'g'ridan-to'g'ri push qilinmaydi |
| Deploy         | `main`ga merge → Vercel avtomatik. ENV o'zgarsa → **Redeploy** shart                                              |
| Baza           | Neon PostgreSQL (`ep-falling-star-…eu-central-1`, `neondb`)                                                       |
| DNS            | Cloudflare (Free), DNS-only                                                                                       |
| Telegram bot   | **@sellobay26Bot** (ko'rinadigan nomi `sellobay_help`), webhook `apps/web`da                                      |

**Ish tartibi:** `main`ga to'g'ridan-to'g'ri push qilinmaydi — branch → MR → foydalanuvchi merge
qiladi. **Prod migratsiyalarni foydalanuvchi o'zi, merge'dan OLDIN qo'llaydi** (8-bo'limga qarang).

## 2. 2026-10-14 … 10-17 da qilinganlar (hammasi prod'da)

| MR       | Nima                                                                                                                        | Izoh                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| !55–!58  | Mobil yangilash: bosh sahifa, kategoriya guruhlari, tovar sahifasi, manzil tanlash, kuryer skaneri (ADR 0016, 0017)         | kuryerlar yangi APK o'rnatishi kerak                 |
| !59, !60 | Frontend audit tuzatishlari («darhol» va «qisqa muddat»)                                                                    | `audit-output/`                                      |
| !63      | Mobil tezlik 1: client tarjimalar qisqardi, Sentry kechiktirildi                                                            |                                                      |
| !65      | Footer: barcha ijtimoiy tarmoq ikonkalari                                                                                   |                                                      |
| !66      | Kirill shrift preload'dan olib tashlandi                                                                                    |                                                      |
| !67      | Ekrandan pastdagi bo'limlar `render-lazy` (content-visibility)                                                              |                                                      |
| !68      | Client tarjimalari route bo'yicha (`IntlScope`)                                                                             | import grafi testi                                   |
| !69      | Cookie banner server HTML'ida — LCP aybdori edi                                                                             |                                                      |
| !70      | Sentry bo'lagidan Session Replay chiqarildi (~140 KB)                                                                       |                                                      |
| !71      | Header menyulari birinchi bosishda yuklanadi; TooltipProvider olib tashlandi                                                |                                                      |
| !72      | **SEC-04/05**: SMS/telefon kirish xavfsizligi (tasdiqlanmagan raqam, atomar urinishlar, raqam bo'yicha chegaralar)          | Postgres integratsiya testlari                       |
| !73, !74 | **Accessibility**: kontrast, yorliqlar, sarlavhalar; Flutter xato rangi `#B81E2B`; karta nomi bosish maydoni                | Flutter rangi keyingi APK'da                         |
| !75      | **Telegram orqali kirish** (ADR 0018) — telefon raqami bepul tasdiqlanadi                                                   | migratsiya `20261017065723_telegram_login`           |
| !76      | Webhook'ni prod server o'zi o'rnatadi (qo'lda `setWebhook` kerak emas)                                                      |                                                      |
| !77      | Telegram: ism/familiya tasdiqlash, parolli eski hisobga qaytish, ro'yxatdan o'tishda tugma, checkout profildan to'ldiriladi | migratsiya `20261017161246_telegram_login_name_link` |
| !78      | Shu fayl (HOLAT.md) va `audit-output/` repo'da                                                                              |                                                      |
| !79      | **FUN-07**: web'da qaytarishni so'rash (buyurtma sahifasida panel, ixtiyoriy sabab)                                         |                                                      |

**Natijalar (prod, Lighthouse mobil):** bosh sahifa 33 → **79**, mahsulot 58 → **79**; LCP 7,4 → ~3,0 s;
TBT 2,1 → ~0,5 s; CLS 0. Accessibility: katalog, mahsulot, checkout, login, savatcha, «biz haqimizda»
— **100**; bosh sahifa 96 (qolgani — pastdagi cookie/o'rnatish paneli kartani yopgan, haqiqiy xato emas).

## 3. Telegram orqali kirish — qanday ishlaydi (ADR 0018)

1. Login yoki «Ro'yxatdan o'tish» → «Telegram bilan kirish». Saytda 4 xonali kod chiqadi.
2. «Telegram'ni ochish» → @sellobay26Bot → Start → bot shu kodni ko'rsatadi → «Raqamni ulashish».
3. Natija:
   - raqam yangi → hisob ochiladi → **ism va familiyani tasdiqlash** (Telegram'dagi bilan to'ldirilgan, ikkalasi majburiy);
   - raqami tasdiqlangan hisob bor → o'sha hisobga kiradi;
   - forma orqali ochilgan, raqami tasdiqlanmagan parolli hisob bor → «Bu raqam bilan hisobingiz bor (a\*\*\*@…)»
     → parol bilan o'sha hisobga (5 urinish) yoki «yangi hisob ochish».
4. Manzil, tug'ilgan sana — mijoz profildan o'zi qo'shadi. Checkout ism/familiya/telefonni profildan to'ldiradi.

Kod: `apps/web/src/lib/telegram/*`, `apps/web/src/lib/auth/phone-login.ts`,
`apps/web/src/app/api/auth/telegram/{start,poll,link}`, `apps/web/src/app/api/telegram/webhook`,
`apps/web/src/components/auth/telegram-login.tsx`. SMS kodi (`otp/*`) tayyor turibdi — Eskiz ulanganda
faqat yuboruvchi qo'shiladi.

## 4. ENV (faqat nomlar — qiymatlar Vercel'da, «Sensitive»)

`sellobay-web` → Production: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CRON_SECRET`,
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` (faqat `A-Z a-z 0-9 _ -`),
`NEXT_PUBLIC_SENTRY_DSN` va boshqalar (`.env.example` — to'liq shablon).

**Hech qachon:** token, parol, `DATABASE_URL` chatga, kodga yoki commit'ga yozilmaydi.

## 5. Audit (2026-10-14) bo'yicha qolgan ishlar

Har topilmaning holati [`audit-output/audit-findings.md`](../audit-output/audit-findings.md) da
(«Tuzatish» qaydlari). Audit ustuvorligi bo'yicha qolganlari:

- [ ] **SEC-06** — CSP (nonce, avval report-only).
- [ ] **MOB-01…05** — Flutter'ni do'konga tayyorlash: sessiya muddati, chiqishda savat, release imzo, iOS sozlamalari, crash monitoring.
- [ ] **FUN-08** — katalogda sahifalash (48 tadan ko'p mahsulot ko'rinmaydi).
- [ ] **SEO-02** — metadata va statik sahifalar tarjimasi.
- [ ] **UX-02, UX-03, UX-04** — gorizontal aylantirish, pastki qatlamlar, xato «bo'sh ro'yxat» bo'lib ko'rinishi.
- [ ] **I18N-01** — server xatolari, valyuta, oy nomlari faqat o'zbekcha.
- [ ] **FUN-03** (qisman) — haqiqiy parol tiklash.

## 6. Ochiq vazifalar — foydalanuvchida

- [ ] Vercel'da `UPSTASH_REDIS_REST_URL` va `UPSTASH_REDIS_REST_TOKEN` bormi — tekshirish (yo'q bo'lsa login/register IP cheklovi har server nusxasida alohida, zaif). OTP/Telegram himoyasi bunga bog'liq emas.
- [ ] GitLab'da !61 ni yopish (eskirgan, !60 bilan to'qnashadi).
- [ ] Prod katalogidagi demo/test mahsulotlarni nofaol qilish — ro'yxat: [`audit-output/demo-mahsulotlar.md`](../audit-output/demo-mahsulotlar.md).
- [ ] Kuryerlar yangi kuryer APK'ni o'rnatishi (eski ilova «Yetkazildi»ni yubora olmaydi).
- [ ] Mijoz APK'ni qayta yig'ish (Flutter xato rangi va boshqa o'zgarishlar).

## 7. Keyingi rejalar (navbat bo'yicha)

1. **Flutter mijoz ilovasiga Telegram orqali kirish** — o'sha endpointlar (`start` → deep link `t.me/…` → `poll`), ism tasdiqlash oynasi.
2. **OneID orqali kirish** (davlat identifikatsiyasi — xavfsizlikni oshirish uchun). Foydalanuvchi qarori 2026-10-17. Kerak: OneID integratsiya shartnomasi/kalitlari; ADR yoziladi; `UserIdentity` provider qo'shiladi.
3. **SMS (Eskiz)** — buyurtmalar ko'paygach. Kod tayyor; profilda raqamni SMS bilan tasdiqlash oqimi shunda qo'shiladi.
4. Email tasdiqlash va haqiqiy parol tiklash (hozir «Parolni unutdingizmi?» halol sahifa, xat yuborilmaydi).
5. Sentry'ni faqat xatoda yuklash — **qilinmaydi** (breadcrumb'lar kerak, foyda kichik).

## 8. Muhim ish usullari va tuzoqlar

- **Prod migratsiya** (PowerShell; `set` emas!):
  ```powershell
  cd <repo, main yoki migratsiyali branch>
  $env:DATABASE_URL = "postgresql://USER:PAROL@ep-falling-star-…neon.tech/neondb?sslmode=require"
  pnpm --filter @ecom/database migrate:deploy
  ```
  Natijadagi `Datasource … at "…"` — `neon.tech` bo'lishi kerak, `localhost` emas. Manzil Neon → Connect
  (pooling **o'chiq**, to'liq satr, parol bilan). `P1000` = login/parol noto'g'ri yoki satr to'liq emas.
- **Migratsiya faqat Prisma bilan yaratiladi** (`prisma migrate dev --create-only` test bazaga qarshi), qo'lda yozilmaydi.
- **ENV qo'shilgach Redeploy** — aks holda prod eski build'da ishlayveradi.
- Ikki MR'ni soniyalar ichida merge qilsangiz, Vercel ikkinchisini o'tkazib yuborishi mumkin — deploy'ni tekshiring.
- **Integratsiya testlari** (haqiqiy Postgres, Docker):
  ```bash
  docker run -d --rm --name sb-test -e POSTGRES_PASSWORD=t -p 55433:5432 postgres:16-alpine
  DATABASE_URL=postgresql://postgres:t@localhost:55433/postgres pnpm --filter @ecom/database migrate:deploy
  TEST_DATABASE_URL=postgresql://postgres:t@localhost:55433/postgres pnpm --filter @ecom/web exec vitest run
  ```
  Docker Desktop engine to'xtab qolsa: `docker desktop restart`.
- Lokal Windows build'da `next/font` preload chiqmaydi (manifest bo'sh) — shrift ta'sirini faqat prod'da o'lchang.
- `prettier`ni papka bo'yicha ishga tushirmang — CRLF fayllarni LF qilib, ko'p begona faylni «o'zgartiradi».
- Flutter: `flutter test tool/screens.dart --update-goldens` (skrinshotlar `tool/shots/`, git'da emas).

## 9. Hujjatlar

- Audit (2026-10-14): [`audit-output/`](../audit-output/) — `audit-findings.md` (har topilmada tuzatish qaydi), `frontend-audit-report.html`.
- ADR: 0016 manzil/hudud, 0017 posilka yorlig'i, **0018 Telegram orqali kirish**.
- Deploy: [`DEPLOYMENT.md`](DEPLOYMENT.md) (Telegram bot bo'limi).
