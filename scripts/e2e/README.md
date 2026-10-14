# E2E ssenariylar (lokal)

Har bir audit/F-bosqich MR'i shu skriptlar bilan haqiqiy API va lokal Docker Postgres ustida
tekshirilgan. Ilgari ular faqat bitta kompyuterdagi vaqtinchalik papkada turardi; endi repoda.

CI'da ishlamaydi — lokal serverlar va test akkauntlar kerak.

## Tayyorgarlik

1. `pnpm docker:up`, `pnpm db:migrate && pnpm db:seed`, so'ng test akkauntlar:
   `packages/database/prisma/seed-test-accounts.ts` (parolni skriptlar o'sha fayldan o'qiydi).
2. Serverlar: web `:3000`, admin `:3001`, seller `:3002` (`pnpm dev` yoki har birini alohida).
   Web test sirlari bilan ishga tushadi (`.env.local` yoki muhit o'zgaruvchisi):
   `CRON_SECRET=test_cron_secret`, `CLICK_SECRET_KEY=test_click_secret`, `CLICK_SERVICE_ID=svc`,
   `PAYME_KEY=test_payme_key` (har skriptning bosh izohida aniq ro'yxat).
3. `docker` PATH'da bo'lmasa: `DOCKER_BIN=/yo'l/docker` (skriptlar `docker exec ecom-postgres psql`
   bilan holatni tekshiradi).

Ishga tushirish (repo ildizidan):

```bash
node scripts/e2e/f3a-e2e.mjs
```

Har qator `✅`/`❌`; oxirida xatolar soni. Buyurtma endpointi daqiqasiga 10 ta so'rov bilan
cheklangan (429) — ketma-ket ishga tushirishda biroz kuting. Ko'p ishga tushirishdan keyin lokal
seed tovarlar zaxirasi tugashi mumkin.

## Ro'yxat

| Skript            | Nimani tekshiradi                                                         | MR  |
| ----------------- | ------------------------------------------------------------------------- | --- |
| `k2-e2e.mjs`      | Admin status o'zgarishi to'lov holatiga bo'ysunadi                        | !30 |
| `k3-e2e.mjs`      | Kuryer to'lanmagan/bekor buyurtmani ololmaydi                             | !31 |
| `k6-e2e.mjs`      | Checkout variant narxini oladi (`setup` / `check`)                        | !32 |
| `k7-e2e.mjs`      | UZCARD tasdiqlashda chekdagi summa majburiy va tekshiriladi               | !33 |
| `k8-e2e.mjs`      | Global buyurtma to'lanmaguncha Xitoydan sotib olinmaydi                   | !36 |
| `batch-a-e2e.mjs` | To'lov va checkout xavfsizligi (O7, Y8, Y7, Y9, Y11, O6)                  | !36 |
| `batch-b-e2e.mjs` | Admin bekor qilish, kuryer COD, qaytarishda zaxira, to'lov muddati        | !37 |
| `batch-c-e2e.mjs` | Sotuvchi KYC/tasdiq/to'xtatish, tovar tahriri, sessiya yangilash          | !38 |
| `batch-d-e2e.mjs` | Pulni qaytarishni qayd etish (K5)                                         | !39 |
| `batch-e-e2e.mjs` | Cashback, variant zaxirasi, chekni qayta yuborish (O1, O3–O5, O10, P5–P6) | !41 |
| `f3a-e2e.mjs`     | Sotuvchi jo'natmalari FBS/FBO, ombor qabuli, konsolidatsiya, tariflar     | !44 |
| `f3b-e2e.mjs`     | Hisob daftari, qaytarish yozuvlari, oyiga 2 marta to'lov, cron            | !45 |
| `f4-e2e.mjs`      | 3PL «qo'lda» provayder: trek, yetkazish, joyida rad etish                 | !46 |
| `f5-e2e.mjs`      | Narx taklifi → shaxsiy global tovar → to'lov sahifasi                     | !47 |
| `bank-e2e.mjs`    | Admin sotuvchi bank rekvizitini kiritadi va to'lovga qo'llaydi            | !48 |

`k2`, `k3`, `k6`, `k7` web'ni `:3100` portda kutadi (to'lov test sirlari bilan alohida server).
Ular o'z MR'i vaqtida yashil edi; keyingi bosqichlar oqimni o'zgartirgan (masalan F3a'dan keyin
kuryer faqat omborda qabul qilingan buyurtmani oladi), shuning uchun eski ssenariy qizil bo'lsa —
avval ssenariy hali to'g'rimi, shuni tekshiring. `batch-*` va `f*` skriptlari 2026-10-13 holatida
yangi oqimga moslangan.
