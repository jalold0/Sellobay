# ADR 0006 — Mavjud bazani migratsiya tizimiga o'tkazish (baselining)

**Sana:** 2026-08-31
**Holat:** Qabul qilindi

## Kontekst

Loyihada `packages/database/prisma/migrations` papkasi **umuman yo'q edi**. Sxema
`db push` orqali bazaga yozib kelingan, ya'ni:

- Sxema o'zgarishlarining tarixi yo'q — qachon, nima, nega o'zgargani bilinmaydi
- Xato o'zgarishni orqaga qaytarib bo'lmaydi
- Deployni takrorlab bo'lmaydi — yangi muhitda baza qanday holatga kelishi noaniq
- Yangi dasturchi bazani noldan tiklay olmaydi

Bu `CLAUDE.md` dagi o'z qoidamizga ham zid: _"Migrationlarni qo'lda yozmang —
`pnpm db:migrate` ishlatish"_.

Bazada haqiqiy ma'lumot bor (12 mahsulot, 25 buyurtma, 11 foydalanuvchi), shuning
uchun bazani tashlab qayta yaratish variant emas.

## Qaror

Prisma'ning **baselining** usuli qo'llanildi: mavjud sxemadan boshlang'ich
migratsiya yaratilib, u bazada "allaqachon qo'llangan" deb belgilandi.

Bajarilgan qadamlar:

1. **Shart tekshirildi** — sxema va baza bir xilligiga ishonch hosil qilindi:

   ```
   prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel schema.prisma
   → "-- This is an empty migration."
   ```

   Agar farq bo'lganda baselining noto'g'ri holatni muzlatib qo'yardi.

2. **Boshlang'ich migratsiya yaratildi** — `prisma/migrations/0_init/migration.sql`:

   ```
   prisma migrate diff --from-empty --to-schema-datamodel schema.prisma --script
   ```

   1486 satr: 54 jadval, 99 indeks, 24 enum, 71 tashqi kalit, `citext`/`pg_trgm`/
   `pgcrypto` kengaytmalari va `tsvector` GIN indeksi.

3. **Qo'llangan deb belgilandi** — SQL **ishga tushirilmadi**:

   ```
   prisma migrate resolve --applied 0_init
   ```

   Bu faqat `_prisma_migrations` xizmat jadvalini yaratib, bitta qator yozadi.

4. **Tasdiqlandi** — `prisma migrate status` → _"Database schema is up to date!"_,
   ma'lumot sanoqlari o'zgarmadi.

## Production'ga qo'llash

`.gitlab-ci.yml` da `migrate-deploy` job qo'shildi. U **ataylab qo'lda** ishga
tushadi (`when: manual`, faqat `main`):

- Hozir alohida staging bazasi yo'q. Har `main` push'da avtomatik migratsiya
  qilish — sinovsiz production'ga sxema o'zgarishi degani
- Staging paydo bo'lgach avtomatlashtirish mumkin va kerak

Job `DATABASE_URL` CI o'zgaruvchisini talab qiladi (GitLab → Settings → CI/CD →
Variables, masked va protected). Qo'yilmagan bo'lsa job **yiqiladi** — bu ham
ataylab, jim o'tib ketmasin.

## Bundan keyin

Sxema o'zgarganda:

```bash
pnpm db:migrate            # yangi migratsiya yaratadi (lokal)
pnpm db:migrate:status     # holatni ko'rsatadi
pnpm db:migrate:deploy     # qo'llaydi (CI yoki qo'lda)
```

`db push` **endi ishlatilmaydi** — u migratsiya tarixini chetlab o'tadi va shu
ADR'ni bekor qiladi.

## Oqibatlari

**Yaxshi tomoni**

- Sxema tarixi paydo bo'ldi va git bilan versiyalanadi
- Yangi muhitda baza takrorlanadigan holatga keladi
- Orqaga qaytarish mumkin (teskari migratsiya yozib)
- Kod bilan sxema bitta MR ichida birga o'zgaradi

**Narxi**

- Har sxema o'zgarishi migratsiya yozishni talab qiladi — `db push` tezroq edi
- Migratsiyani production'ga qo'llash hozircha qo'lda qadam

**Qolgan xavf**

Staging bazasi yo'qligicha qolmoqda. Migratsiya production'da birinchi marta
sinaladi. Bu keyingi ish — ish jarayoni ilovasida `Alohida test bazasi va
staging muhiti` vazifasi sifatida yozilgan.
