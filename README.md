# Sellobay — Marketplace ekotizimi

> O'zbekistondagi eng yirik multi-vendor marketplace
> Minglab sotuvchilar · 2M+ mahsulot · 24/7 yetkazib berish

## 🌐 Vercel deployments

- **Mijozlar sayti:** [sellobay-web.vercel.app](https://sellobay-web.vercel.app)
- **Admin paneli:** [sellobay-admin.vercel.app](https://sellobay-admin.vercel.app)
- **Sotuvchi paneli:** [sellobay-seller.vercel.app](https://sellobay-seller.vercel.app)
- **Telegram Mini App:** [sellobay-telegram-app.vercel.app](https://sellobay-telegram-app.vercel.app)

## 🏗 Texnologiyalar

- **Frontend (web):** Next.js 14 App Router + Tailwind + shadcn/ui (`@ecom/ui`)
- **Backend:** `apps/web` Next.js API routes + Prisma + PostgreSQL (Neon) —
  mobil ilova ham shu API'ga ulanadi
- **Domen:** `@ecom/core-domain` — sof biznes-logika (narx/loyalty/zona), unit-testlar bilan
- **Mobile:** Expo (React Native, Expo Router)
- **Cache/Queue:** Redis + BullMQ (rejalashtirilgan)
- **Search:** Elasticsearch (rejalashtirilgan)
- **i18n:** uz / ru / en (next-intl)

## 📦 Loyiha tuzilishi

```
apps/
  web/             — Mijozlar sayti VA asosiy backend (Next.js API routes)
  admin/           — Boshqaruv paneli
  seller/          — Sotuvchi paneli
  telegram-mini-app/ — Telegram WebApp
  mobile/          — Expo (iOS/Android)

packages/
  core-domain/     — Sof biznes-logika (narx/loyalty/zona) + unit-testlar
  ui/              — shadcn/ui + Sellobay design system
  database/        — Prisma client
  types/, utils/, auth/, i18n/

graveyard/         — Karantinlangan o'lik kod (api, wms) — workspace'ga kirmaydi

docs/
  ROADMAP.md          — ⭐ Master roadmap & progress (yagona haqiqat manbai)
  TZ_SELLOBAY.md      — Texnik vazifa (700+ qator)
  ARCHITECTURE.md, API.md, DEPLOYMENT.md
  SELLOBAY_GLOBAL.md  — Chegaralararo integratsiya rejasi (Xitoy → Turkiya/Koreya → ...)
```

## 🚀 Lokal ishga tushirish

```bash
pnpm install
cp .env.example .env
pnpm dev
```

## 📋 Brand

- Logo: SB monogram (Didot serif uslubida)
- Asosiy ranglar: Bordo `#8B0020` + Qora `#0A0A0C` + Oltin `#C9A961`
- To'liq design system: `docs/TZ_SELLOBAY.md`
