# ADR 0002: Backend — NestJS

**Status:** Qabul qilingan
**Sana:** 2026-06-06

## Kontekst

TZ ko'rsatadi: NestJS (Node.js). Alternativ variantlar: Express, Fastify (toza), Hono, Go.

## Qaror

**NestJS 10** asosiy backend uchun.

Sabablari:
- Modular arxitektura — DDD bounded context'larga juda mos
- DI (Dependency Injection) box dan tashqari
- Decorators bilan Swagger avtomatik
- BullMQ, WebSocket, Microservices — native integratsiyalar
- TypeScript birinchi
- O'zbek dasturchilar bozorida tarqalgan
- Microservice-ready (kelajak uchun)

## Oqibatlar

- (+) Tezkor onboarding, ko'p tayyor namunalar
- (+) Mature ekosistema (Passport, JWT, Throttler, Swagger)
- (–) Decorator-heavy stack — runtime metadata kerak
- (–) Cold start Express'dan biroz sekinroq (faqat lambda holatida sezilarli)
