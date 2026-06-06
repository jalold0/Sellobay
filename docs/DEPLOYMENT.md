# Deployment

## Muhitlar

| Muhit | Maqsad | DB |
|-------|--------|----|
| local | Ishlab chiqish | Docker Compose |
| staging | QA va integration test | Boshqariladigan PostgreSQL |
| production | Real foydalanuvchilar | Multi-AZ PostgreSQL, Redis cluster |

## Lokal

```bash
pnpm install
cp .env.example .env
pnpm docker:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Production (umumiy ko'rsatma)

1. **DB migration:** `pnpm --filter @ecom/database migrate:deploy`
2. **Image build:** GitHub Actions `docker.yml` workflow image yasaydi
3. **Deploy:** Helm chart'lar `infrastructure/kubernetes/helm/*` orqali ArgoCD'da sync
4. **Zero-downtime:** rolling update (`maxSurge: 1`, `maxUnavailable: 0`)
5. **Health check:** `/api/v1/health` liveness va readiness probe
6. **Secrets:** External Secrets Operator orqali

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
