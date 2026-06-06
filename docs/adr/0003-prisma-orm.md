# ADR 0003: ORM — Prisma

**Status:** Qabul qilingan
**Sana:** 2026-06-06

## Kontekst

PostgreSQL ustida ORM kerak. Variantlar: Prisma, TypeORM, Drizzle, Knex (query builder).

## Qaror

**Prisma 5.x**.

Sabablari:
- Schema-first — bitta `schema.prisma` butun jamoa uchun source of truth
- Migratsiya tizimi yetuk (`migrate dev`, `migrate deploy`, shadow DB)
- Type-safe client — TypeScript bilan a'lo
- Prisma Studio — DB inspect uchun
- Generated client ko'p paketlarda ishlatish oson (workspace orqali)

## Trade-off lar

- (–) Murakkab so'rovlarda RAW SQL kerak bo'lishi mumkin — `prisma.$queryRaw` mavjud
- (–) Soft delete to'g'ridan-to'g'ri yo'q — `deletedAt` filtri qo'lda
- (+) Engine'ni Rust'dan boshqa runtime-ga ko'chirish jamoa rejasida

## Migrationlar

`packages/database/prisma/migrations/` — Git'ga commit qilinadi. Production'da faqat `migrate deploy`.
