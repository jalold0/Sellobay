# Claude Code uchun yo'l-yo'riq (CLAUDE.md)

Bu loyiha **monorepo** (Turborepo + pnpm workspaces). Quyidagi qoidalarga rioya qiling:

## Texnologiya tanlovi (qat'iy)

- **Backend:** `apps/web` Next.js 14 App Router API route'lari (`src/app/api/**`) —
  HAQIQIY va deploy qilingan backend. Biznes-logika `apps/web/src/lib/*-server.ts` da,
  sof domen `@ecom/core-domain` paketida. Mobil ham shu API'ga ulanadi.
  (NestJS `apps/api`/`apps/wms` — ishlatilmagan skelet edi, `graveyard/` ga karantinlangan;
  qarang `graveyard/README.md`.)
- **Frontend (web):** Next.js 14 App Router + Tailwind + shadcn/ui (`@ecom/ui`)
- **Mobile:** Expo (React Native, Expo Router)
- **DB:** PostgreSQL (Neon) — ORM faqat Prisma orqali
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

## Lokal ishga tushirish tartibi

```bash
pnpm install
cp .env.example .env
pnpm docker:up
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev
```

Default portlar README.md'da.
