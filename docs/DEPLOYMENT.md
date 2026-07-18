# Deployment

## Muhitlar

| Muhit      | Maqsad                 | DB                                 |
| ---------- | ---------------------- | ---------------------------------- |
| local      | Ishlab chiqish         | Docker Compose                     |
| staging    | QA va integration test | Boshqariladigan PostgreSQL         |
| production | Real foydalanuvchilar  | Multi-AZ PostgreSQL, Redis cluster |

## Lokal

```bash
pnpm install
cp .env.example .env
pnpm docker:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Production (hozirgi holat)

1. **DB migration:** `pnpm --filter @ecom/database migrate:deploy`
2. **Deploy:** Next.js app'lar (`web`, `admin`, `seller`, `telegram-mini-app`)
   **Vercel**'da — `main`ga merge avtomatik deploy qiladi
3. **Bot:** `telegram-bot` alohida hostda (Docker image `docker.yml` orqali
   faqat versiya tegi yoki qo'lda build qilinadi)
4. **Health check:** `/api/health`
5. **Secrets:** Vercel environment variables (`.env.example` shablon)

K8s/Helm/ArgoCD hozircha ishlatilmaydi (qarang
`infrastructure/kubernetes/README.md`) — quyidagi bo'lim kelajak rejasi
sifatida saqlanadi.

## Backup va DR

- **DB:** kunlik snapshot + WAL streaming (15 min RPO)
- **Object storage:** versioning yoqilgan
- **DR drill:** har kvartalda failover sinovi
- **RTO:** 1 soat ichida tiklash skripti tayyor

## Monitoring alertlari

- API 5xx > 1%/min → PagerDuty
- p95 latency > 500ms (5 daqiqa davomida) → Slack
- DB connection pool > 80% → Slack
- Pod restart loop → PagerDuty
