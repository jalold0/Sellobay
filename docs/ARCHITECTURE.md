# Arxitektura

## Asosiy tamoyillar

- **Clean Architecture** — biznes mantiq freymvorkdan mustaqil
- **Domain-Driven Design (DDD)** — biznes domenlarga ajratish
- **SOLID** — har bir sinf bitta vazifaga
- **API-first** — OpenAPI/Swagger avtomatik
- **Microservice-ready** — kelajakda alohida servislarga bo'lish
- **Event-driven** (kelajak) — domain events, ya'ni `order.created`, `payment.completed`

## Yuqori darajadagi diagramma

Haqiqiy va deploy qilingan backend — `apps/web`ning Next.js API route'lari
(Vercel). Mobil, TMA va bot ham shu API'ga ulanadi. (Eski NestJS `api`/`wms`
skeletlari ishlatilmagan va `graveyard/`ga karantinlangan — ADR 0004.)

```
        ┌──────────────────────────────────────────────────┐
        │                 Mijoz tomonlari                   │
        │  Web (o'zi) · Mobile (Expo) · TMA · Telegram bot  │
        │        Admin · Seller · Courier (Expo)            │
        └───────────────────────┬──────────────────────────┘
                                │ HTTPS
                                ▼
        ┌──────────────────────────────────────────────────┐
        │        apps/web — Next.js 14 (Vercel)             │
        │  src/app/api/** — API route'lar (interface)       │
        │  src/lib/*-server.ts — biznes-servislar           │
        │  (auth, orders, inventory, payments, loyalty...)  │
        └──────────┬──────────────────────┬────────────────┘
                   │                      │
                   ▼                      ▼
        ┌────────────────────┐   ┌───────────────────────┐
        │ @ecom/core-domain   │   │ @ecom/database (Prisma)│
        │ sof domen: narx,    │   │          │             │
        │ loyalty, zona       │   │          ▼             │
        │ (framework'siz)     │   │  PostgreSQL (Neon)     │
        └────────────────────┘   └───────────────────────┘

        Rejalashtirilgan: Redis+BullMQ (hozircha unstable_cache),
        Elasticsearch (hozircha DB query)
```

## Domain bo'limlari (DDD bounded contexts)

| Bounded Context | Asosiy entitilar                        | Mas'uliyat                   |
| --------------- | --------------------------------------- | ---------------------------- |
| Identity        | User, Role, Session, RefreshToken       | Ro'yxat, login, RBAC         |
| Catalog         | Category, Brand, Product, Variant       | Mahsulotlar daraxti, qidiruv |
| Cart            | Cart, CartItem                          | Savatcha holati              |
| Ordering        | Order, OrderItem, Payment               | Buyurtma jarayoni            |
| Inventory       | Warehouse, InventoryItem, StockMovement | Stok boshqaruvi              |
| Delivery        | Courier, Delivery, DeliveryEvent        | Yetkazib berish              |
| Marketing       | PromoCode, LoyaltyTxn, Campaign         | Aksiya, sodiqlik             |
| CRM             | Segment, Ticket, Notification           | Mijoz munosabatlari          |
| Finance         | Invoice, Transaction, Payout            | Buxgalteriya                 |

## Qatlamlar (Clean Architecture)

```
packages/core-domain/          # DOMAIN — sof biznes-logika (narx, loyalty, zona);
                               # hech qanday freymvork/IO importi yo'q
apps/web/src/lib/*-server.ts   # APPLICATION — use case'lar / servislar
                               # (orders, inventory, payments, auth...)
packages/database (Prisma)     # INFRASTRUCTURE — DB kirish qatlami
apps/web/src/app/api/**        # INTERFACE — HTTP route handler'lar
```

Qoida: bog'liqlik faqat ichkariga qaraydi — route handler servisga, servis
domen va Prisma'ga tayanadi; `core-domain` hech narsaga bog'lanmaydi.

## API versiyalash

- URI versiyalash: `/api/v1/...`, kelajakda `/api/v2/...`
- Buzg'unchi (breaking) o'zgarishlar — yangi versiya
- Eski versiya kamida 6 oy qo'llab-quvvatlanadi

## Xavfsizlik

- JWT access (qisqa muddatli) + refresh token rotation
- RBAC (rola tekshiruvi har bir guarded endpoint'da)
- 2FA (SMS / TOTP)
- AES-256 (dam olish) — saqlangan to'lov tokenlari uchun
- TLS 1.3 (uzatish)
- OWASP Top 10 ga qarshi: ValidationPipe, helmet, rate limiting, CSRF (Web uchun)
- Audit log (`AuditLog`) — barcha sezgir amallar uchun

## SLO/SLI (TZ talablariga muvofiq)

| Ko'rsatkich      | Maqsad      |
| ---------------- | ----------- |
| Sayt LCP         | < 2 s       |
| API p95 latency  | < 200 ms    |
| Uptime           | >= 99.9%    |
| Concurrent users | 10,000+     |
| Buyurtma/kun     | 50,000+     |
| RTO              | < 1 soat    |
| RPO              | < 15 daqiqa |
