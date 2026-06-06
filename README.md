# E-Commerce Ekosistema (O'zbekiston bozori)

Ko'p toifali on-layn savdo platformasi — kiyim-kechak, poyabzal, atirlar, kosmetika, moda aksessuarlari va kelajakda elektronika hamda uy-ro'zg'or buyumlari.

> **Status:** Skeleton (TZ v1.0 asosida, 2026-yil May)
> **Brend nomi:** Tasdiqlash bosqichida

## Tarkib (12 ta komponent)

| # | App / Servis | Texnologiya | Maqsad |
|---|--------------|-------------|--------|
| 1 | `apps/web` | Next.js 14 | Asosiy mijoz sayti |
| 2 | `apps/mobile` | React Native (Expo) | iOS/Android mijoz ilovasi |
| 3 | `apps/telegram-mini-app` | Next.js + Telegram WebApp SDK | Telegram ichida xarid |
| 4 | `apps/admin` | Next.js 14 | Platforma boshqaruv markazi |
| 5 | `apps/seller` | Next.js 14 | Marketplace sotuvchi paneli |
| 6 | `apps/courier` | React Native (Expo) | Kuryer ilovasi |
| 7 | `apps/telegram-bot` | NestJS + grammY | Telegram bot |
| 8 | `apps/api` | NestJS | Asosiy backend API |
| 9 | `apps/wms` | NestJS | Ombor boshqaruv tizimi (WMS) |
| 10 | `packages/database` | Prisma + PostgreSQL | Sxema, migration, seed |
| 11 | `packages/ui` | shadcn/ui + Tailwind | Umumiy komponentlar |
| 12 | `infrastructure/` | Docker + K8s | Konteynerizatsiya |

## Texnologiyalar to'plami

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Mobile:** React Native (Expo SDK 51+), React Navigation, Zustand
- **Backend:** NestJS 10, TypeScript, Prisma ORM, Class-validator
- **DB:** PostgreSQL 16
- **Cache:** Redis 7
- **Search:** Elasticsearch 8
- **Object storage:** S3-compatible (MinIO local)
- **Realtime:** WebSocket (Socket.IO)
- **Infra:** Docker, Kubernetes, Helm, GitHub Actions
- **Monitoring:** Prometheus, Grafana, ELK, Sentry

## Tezkor boshlash

```bash
# 1. Repo klonlash va paketlarni o'rnatish
pnpm install

# 2. .env yaratish
cp .env.example .env
# .env faylini moslab oling (DB, Redis, JWT secrets, ...)

# 3. Infratuzilmani ko'tarish (PostgreSQL, Redis, Elasticsearch, MinIO)
pnpm docker:up

# 4. Ma'lumotlar bazasi sxemasini migration qilish
pnpm db:migrate

# 5. Seed (boshlang'ich ma'lumotlar)
pnpm db:seed

# 6. Hammasini ishga tushirish
pnpm dev
```

Default portlar:

| Servis | Port |
|--------|------|
| Mijoz sayti (`web`) | 3000 |
| Admin panel | 3001 |
| Sotuvchi panel | 3002 |
| Telegram Mini App | 3003 |
| Backend API | 4000 |
| WMS | 4001 |
| Telegram bot | 4002 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Elasticsearch | 9200 |
| MinIO (S3) | 9000 / 9001 (console) |
| MailHog | 1025 / 8025 (web) |

## Loyiha tuzilishi

```
.
├── apps/
│   ├── api/                  NestJS backend
│   ├── wms/                  NestJS WMS
│   ├── web/                  Next.js mijoz sayti
│   ├── admin/                Next.js admin panel
│   ├── seller/               Next.js sotuvchi paneli
│   ├── telegram-mini-app/    Next.js TMA
│   ├── telegram-bot/         grammY bot
│   ├── mobile/               React Native (Expo)
│   └── courier/              React Native (Expo)
├── packages/
│   ├── database/             Prisma schema + client
│   ├── ui/                   shadcn/ui umumiy komponentlar
│   ├── types/                Umumiy TypeScript tiplar
│   ├── i18n/                 uz/ru/en tarjimalar
│   ├── utils/                Umumiy yordamchi funksiyalar
│   ├── auth/                 JWT yordamchilari
│   ├── eslint-config/
│   └── tsconfig/
├── infrastructure/
│   ├── docker/               docker-compose.yml
│   ├── kubernetes/           Helm Charts
│   └── ci/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── TZ.md                 Texnik topshiriq
│   └── adr/                  Architecture Decision Records
└── .github/workflows/        CI/CD pipelines
```

## Arxitektura tamoyillari

- **Clean Architecture** — qatlamlar bo'yicha ajratish (domain → use case → adapter → framework)
- **Domain-Driven Design (DDD)** — biznes mantiqi domenlarda
- **SOLID** — har bir sinf va funksiya uchun
- **API-first** — OpenAPI (Swagger) avtomatik generatsiya
- **Microservice-ready** — kelajakda alohida servislarga bo'lish oson bo'lishi uchun shaffof chegaralar
- **Event-Driven** (kelajak uchun) — domain events orqali xabar almashish

Batafsil: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Rivojlanish bosqichlari (Roadmap)

| Bosqich | Muddat | Vazifalar |
|---------|--------|-----------|
| 1 | 0-3 oy | Arxitektura, DB, API skeleti, Auth, Mahsulot, Buyurtma |
| 2 | 3-6 oy | To'lov integratsiyalari, Telegram MA, Admin, Sotuvchi paneli |
| 3 | 6-9 oy | WMS, Kuryer ilovasi, CRM, Marketing, Analitika |
| 4 | 9-12 oy | AI Chatbot, Tavsiya tizimi, Performance, Audit |
| 5 | 12+ oy | Markaziy Osiyo kengayishi, ko'p valyuta, xalqaro to'lovlar |

## Hujjat va standartlar

- TZ to'liq matni: [docs/TZ.md](docs/TZ.md)
- Hissa qo'shish: [CONTRIBUTING.md](CONTRIBUTING.md)
- Arxitektura qarorlari: [docs/adr/](docs/adr/)

## Litsenziya

Ushbu kod baza shaxsiy mulk hisoblanadi. Qarang: [LICENSE](LICENSE).
