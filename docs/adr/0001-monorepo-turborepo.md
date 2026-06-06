# ADR 0001: Monorepo (Turborepo + pnpm workspaces)

**Status:** Qabul qilingan
**Sana:** 2026-06-06

## Kontekst

12 ta app va bir nechta umumiy paketlardan iborat ekosistema. Har bir app uchun alohida repository tutib turish:
- Versiya nomuvofiqligi
- Type'larni qo'lda sinxron qilish
- Migration paytida cross-repo PR
- Onboarding qiyinlashadi

## Qaror

**Turborepo + pnpm workspaces** bilan **monorepo** yondashuvi.

Sabablari:
- pnpm workspaces — node_modules dublikatlarisiz, tezkor o'rnatish
- Turborepo — incremental builds, remote cache (kelajak), task pipeline
- Type'lar real-time — paket bir o'zgarsa, barcha foydalanuvchilarda
- Vercel/Cloud build tabiiy qo'llab-quvvatlash
- Microservice-readiness — har bir `apps/*` allaqachon alohida deploy qilinadi

## Oqibatlar

- (+) Yagona PR, yagona test pipeline, yagona versiya
- (+) Umumiy `@ecom/database`, `@ecom/types`, `@ecom/ui`
- (–) Repo hajmi katta, lekin pnpm samarali
- (–) CI'da partial builds turbo orqali boshqarish kerak
