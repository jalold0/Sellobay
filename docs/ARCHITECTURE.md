# Arxitektura

## Asosiy tamoyillar

- **Clean Architecture** — biznes mantiq freymvorkdan mustaqil
- **Domain-Driven Design (DDD)** — biznes domenlarga ajratish
- **SOLID** — har bir sinf bitta vazifaga
- **API-first** — OpenAPI/Swagger avtomatik
- **Microservice-ready** — kelajakda alohida servislarga bo'lish
- **Event-driven** (kelajak) — domain events, ya'ni `order.created`, `payment.completed`

## Yuqori darajadagi diagramma

```
                                ┌────────────────────────────┐
                                │       Mijoz tomonlari      │
                                │  Web · Mobile · TMA · Bot   │
                                └─────────────┬──────────────┘
                                              │ HTTPS/WSS
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       API Gateway / Ingress                          │
└─────────────┬───────────────────────────────┬───────────────────────┘
              │                               │
              ▼                               ▼
   ┌──────────────────────┐         ┌──────────────────────┐
   │   apps/api (NestJS)  │         │   apps/wms (NestJS)  │
   │  Auth, Catalog, Cart │         │ Warehouses, Inventory│
   │  Orders, Payments,   │         │ Movements, Audit     │
   │  Reviews, Marketing  │         └──────────────────────┘
   └──────┬──────┬────┬───┘
          │      │    │
          ▼      ▼    ▼
   ┌──────────┐ ┌────┐ ┌──────────────┐
   │PostgreSQL│ │Redis│ │Elasticsearch │
   └──────────┘ └────┘ └──────────────┘
          ▲             ▲
          │             │
   ┌──────┴──────┐ ┌────┴──────────┐
   │  Admin/UI    │ │ Search index   │
   │  Seller/UI   │ │ Products index │
   │  Courier app │ └────────────────┘
   └──────────────┘
```

## Domain bo'limlari (DDD bounded contexts)

| Bounded Context | Asosiy entitilar | Mas'uliyat |
|-----------------|------------------|------------|
| Identity | User, Role, Session, RefreshToken | Ro'yxat, login, RBAC |
| Catalog | Category, Brand, Product, Variant | Mahsulotlar daraxti, qidiruv |
| Cart | Cart, CartItem | Savatcha holati |
| Ordering | Order, OrderItem, Payment | Buyurtma jarayoni |
| Inventory | Warehouse, InventoryItem, StockMovement | Stok boshqaruvi |
| Delivery | Courier, Delivery, DeliveryEvent | Yetkazib berish |
| Marketing | PromoCode, LoyaltyTxn, Campaign | Aksiya, sodiqlik |
| CRM | Segment, Ticket, Notification | Mijoz munosabatlari |
| Finance | Invoice, Transaction, Payout | Buxgalteriya |

## Qatlamlar (Clean Architecture)

```
src/modules/<context>/
├── domain/           # Entitilar, value objectlar, domain events
├── application/      # Use case'lar (commands, queries), portlar
├── infrastructure/   # Repository implementatsiyalari, external API
└── interface/        # HTTP controllers, gateways, schedulers
```

Skeleton bosqichida modullar oddiy NestJS shaklida (controller + service). Loyiha o'sgani sayin har bir bounded context ichida yuqoridagi qatlamlarga ajratiladi.

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

| Ko'rsatkich | Maqsad |
|-------------|--------|
| Sayt LCP | < 2 s |
| API p95 latency | < 200 ms |
| Uptime | >= 99.9% |
| Concurrent users | 10,000+ |
| Buyurtma/kun | 50,000+ |
| RTO | < 1 soat |
| RPO | < 15 daqiqa |
