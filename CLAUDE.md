# Claude Code uchun yo'l-yo'riq (CLAUDE.md)

Bu loyiha **monorepo** (Turborepo + pnpm workspaces). Quyidagi qoidalarga rioya qiling:

## Texnologiya tanlovi (qat'iy)

- **Backend:** `apps/web` Next.js 14 App Router API route'lari (`src/app/api/**`) —
  HAQIQIY va deploy qilingan backend. Biznes-logika `apps/web/src/lib/*-server.ts` da,
  sof domen `@ecom/core-domain` paketida. Mobil ham shu API'ga ulanadi.
  (Eski NestJS `apps/api`/`apps/wms` — ishlatilmagan skelet edi, `graveyard/` ga karantinlangan;
  qarang `graveyard/README.md`.)
- **NestJS mikroservislar (`apps/backend`, ADR 0012, YANGI — bosqichma-bosqich):** gateway + auth +
  catalog + orders, RabbitMQ, Redis, TypeORM, Docker. Hozir gateway eski Next.js API'ga proksi qiladi;
  route ko'chirilgach eski Next.js route **o'chiriladi** (bitta route — bitta egasi, aks holda
  «split-brain» — `graveyard/README.md` ogohlantirishi). Qarang `apps/backend/README.md`.
- **Frontend (web):** Next.js 14 App Router + Tailwind + shadcn/ui (`@ecom/ui`)
- **Mobile:** Expo (React Native, Expo Router)
- **DB:** PostgreSQL (Neon) — sxema va migratsiya faqat Prisma (`packages/database`); `apps/backend`
  (NestJS) TypeORM'ni faqat MAVJUD sxema ustidan o'qish/yozish uchun ishlatadi, `synchronize` HECH QACHON
- **Cache/Queue:** Redis + BullMQ (rejalashtirilgan — hozircha `unstable_cache`)
- **Search:** Elasticsearch (rejalashtirilgan — hozircha DB query)
- **i18n:** `@ecom/i18n` — har doim `pickLocalized()` orqali, hardcode YO'Q
- **Auth:** `@ecom/auth` — argon2 (parol), jose (JWT)

## Loyiha tuzilishi

- `apps/web` — mijoz sayti **va asosiy backend** (Next.js API routes)
- `apps/admin`, `apps/seller`, `apps/telegram-mini-app` — Next.js
- `apps/mobile`, `apps/courier` — Expo
- `apps/telegram-bot` — grammY
- `packages/*` — umumiy paketlar (core-domain, database, ui, types, i18n, utils, auth)
  - `@ecom/core-domain` — sof biznes-logika (narx/loyalty/zona), framework'ga bog'liq emas
- `graveyard/*` — karantinlangan o'lik kod (workspace'ga kirmaydi) — `api`, `wms`
- `infrastructure/*` — Docker, K8s, monitoring
- `docs/*` — ARCHITECTURE, TZ, API, DEPLOYMENT, adr/

## Stildagi qoidalar

- TypeScript strict — `any` ishlatmang, type-imports'ni qo'llang
- ESLint + Prettier — `pnpm format` muvaffaqiyatli ishlasa
- Conventional Commits — `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Hech qachon `.env`ni commit qilmang — `.env.example`ga shablon
- Migrationlarni qo'lda yozmang — `pnpm db:migrate` ishlatish

## Domain qoidalari

- Pul har doim **Decimal** (Prisma) yoki **string**'da uzatiladi — hech qachon `number`'da to'g'ridan-to'g'ri saqlash
- Vaqt zonasi — `Asia/Tashkent`, lekin DB'da UTC
- Telefon raqami — `+998XXXXXXXXX` (E.164), faqat `@ecom/utils/normalizeUzPhone` orqali
- Slug — faqat `slugify()` orqali

## Yondashuv

- Clean Architecture qatlamlarini buzmang (domain freymvorkka bog'liq emas)
- DDD — har bir bounded context o'z modulida
- Hech qachon vaqtinchalik workaround qoldirmang
- Har bir muhim arxitektura qarori uchun ADR yozing (`docs/adr/`)

## Dizayn (UI/UX)

Har qanday UI ishida (web, admin, seller, Flutter ekranlari, matn/mikrokopi) avval
`frontend-design` skill'ini ishga tushiring (`.claude/skills/frontend-design/`,
Anthropic'ning rasmiy skill'i). Uning mohiyati: reja → brif bilan solishtirish →
qurish → o'z ishini tanqid qilish; standart «shablon» yechimlardan qoching;
yagona joyda jasoratli bo'ling, qolgani sokin; xato va bo'sh holat — yo'l
ko'rsatish; CTA aniq fe'l bilan.

**Brend birinchi:** skill «brif so'zi har doim g'olib» deydi. Sellobay'ning
brendi allaqachon belgilangan (`SellobayColors`, `@ecom/ui` tokenlari, Playfair
serif sarlavhalar) — uni buzmang, undan chetga chiqish faqat foydalanuvchi so'rasa.
Flutter'da: ranglar/shriftlar faqat `buildSellobayTheme()` orqali, matn faqat
`@ecom/i18n` kalitlari bilan (qo'lda yozilmaydi), skeleton/animatsiya
«animatsiyani kamaytirish»ni hisobga oladi. Ekranni o'zgartirgach
`flutter test tool/screens.dart --update-goldens` bilan suratga olib, ko'zdan
kechiring.

## Lokal ishga tushirish tartibi

```bash
pnpm install
cp .env.example .env
pnpm docker:up
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev
```

Default portlar README.md'da.
