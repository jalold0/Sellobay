# @ecom/backend — NestJS mikroservislar

Gateway + auth + catalog + orders (ADR [0012](../../docs/adr/0012-nestjs-mikroservis-backend.md)).
**Hozirgi holat: 1-bosqich — infratuzilma va gateway TAYYOR, servislar skelet** (health, konfiguratsiya,
umumiy qoidalar). Biznes route'lari ko'chirilguncha gateway hamma narsani eski Next.js API'ga uzatadi,
shuning uchun ilovalar bu stack'siz ham, u bilan ham bir xil ishlaydi.

```
Klient ──▶ gateway :4000 ──▶ auth :4001 | catalog :4002 | orders :4003   (ichki tarmoq, INTERNAL_API_KEY)
              │                              │
              │                              └─▶ Postgres (mavjud sxema, TypeORM) · Redis · RabbitMQ
              └─▶ eski Next.js API (Vercel)   ← NEST_ROUTES da yoqilmagan hamma narsa
```

## Tuzilma

```
src/
  common/    umumiy qatlam: konfiguratsiya (Zod), yagona konvert va xato filtri, gateway foydalanuvchisi
             (qo'riqchilar), Redis, RabbitMQ hodisa shinasi + hodisa shartnomasi, baza, health
  gateway/   identity (JWT) → rate-limit (Redis) → proksi; marshrut jadvali (routes.ts)
  auth/ catalog/ orders/   servislar (har biri: module + main.ts)
```

Qoidalar (ESLint bilan majburlanadi):

- Servislar bir-birining kodini **import qila olmaydi** — faqat HTTP (gateway orqali) yoki RabbitMQ hodisasi.
- Route standart holda **yopiq**; ochiq qilish uchun `@Public()`, rol uchun `@Roles('ADMIN')`.
- `synchronize` **hech qachon** yoqilmaydi: sxema manbai `packages/database` (Prisma, `pnpm db:migrate`).
- Pul — `numeric` ustun, JS'da **string**. Narx/loyalty/zona qoidalari `@ecom/core-domain` dan.
- Javob shakli: `{ success: true, data }` / `{ success: false, error: { code, message, fields? } }`.
- `import type` sinf uchun **ishlatmang** (Nest DI uchun sinf runtime'da kerak) — `consistent-type-imports` shu sababli o'chirilgan.

## Lokal ishga tushirish (Docker)

Docker Desktop kerak (hozirgi kompyuterda o'rnatilmagan).

```bash
cp infrastructure/docker/backend.env.example infrastructure/docker/.env.backend   # sirlarni to'ldiring
docker compose -f infrastructure/docker/docker-compose.backend.yml \
  --env-file infrastructure/docker/.env.backend up -d --build

# bir martalik: sxema + test ma'lumot (Postgres host'ga 127.0.0.1:5432 da chiqqan)
DATABASE_URL=postgresql://postgres:<parol>@127.0.0.1:5432/ecommerce pnpm db:migrate:deploy
DATABASE_URL=postgresql://postgres:<parol>@127.0.0.1:5432/ecommerce pnpm db:seed

curl http://localhost:4000/health/ready      # gateway + Redis
curl http://localhost:4000/api/products      # eski API'ga proksi (NEST_ROUTES bo'sh)
```

Flutter ilovasini lokal gateway'ga ulash (telefon va kompyuter bir tarmoqda):
`flutter run --dart-define=API_BASE_URL=http://<kompyuter-IP>:4000`.

## Bevosita (Docker'siz) ishlab chiqish

```bash
pnpm --filter @ecom/backend test        # 53 test (gateway integratsiya testlari haqiqiy HTTP serverlar bilan)
pnpm --filter @ecom/backend build
# Gateway (Redis kerak; yo'q bo'lsa ham ishlaydi — cheklov o'chiq, /health/ready 503):
JWT_SECRET=<32+ belgi> REDIS_URL=redis://127.0.0.1:6379 pnpm --filter @ecom/backend dev:gateway
```

## Servisni ko'chirish tartibi (strangler)

1. Servisda route'larni **eski Next.js bilan bir xil shartnomada** yozing (`@ecom/api-contract` sxemalari).
2. Paritet testi: bir xil kirish → eski va yangi API bir xil javob.
3. `NEST_ROUTES=<servis>` bilan gateway'da yoqing; ilovalar gateway manziliga o'tgan bo'lishi shart.
4. **Shu prefiksdagi eski Next.js route'larni O'CHIRING** (bitta route — bitta egasi; ADR 0012 §4).

## Hali yo'q (keyingi bosqichlar)

- Servislardagi haqiqiy route'lar va TypeORM entity'lari (hozir `databaseModule([])`).
- `notification-service` (push/SMS/email): hodisa shartnomasi `src/common/events.ts` da tayyor.
- Buyurtma uchun «transactional outbox» (baza yozuvi va hodisa bitta tranzaksiyada emas).
- Docker image'lar real Docker'da hali qurilmagan (Dockerfile mantiqi `pnpm deploy` + `node dist/...` bilan lokal tekshirilgan).
