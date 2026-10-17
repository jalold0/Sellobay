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
3. **Bot:** Sellobay boti `apps/web` dagi webhook orqali ishlaydi (`/api/telegram/webhook`,
   ADR 0018) — alohida server kerak emas. `apps/telegram-bot` (long polling) skelet, deploy
   qilinmaydi: bitta token bilan webhook va polling birga ishlamaydi.
4. **Health check:** `/api/health`
5. **Secrets:** Vercel environment variables (`.env.example` shablon)

K8s/Helm/ArgoCD hozircha ishlatilmaydi (qarang
`infrastructure/kubernetes/README.md`) — quyidagi bo'lim kelajak rejasi
sifatida saqlanadi.

## Telegram bot (Telegram orqali kirish, ADR 0018)

1. @BotFather'da bot oching (`/newbot`), tokenni oling. Bot nomi masalan `SellobayBot`.
2. Vercel → `apps/web` → Environment Variables (Production):
   - `TELEGRAM_BOT_TOKEN` — BotFather bergan token;
   - `TELEGRAM_BOT_USERNAME` — bot nomi, @ belgisisiz;
   - `TELEGRAM_WEBHOOK_SECRET` — faqat `A-Z a-z 0-9 _ -`, masalan
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
     Boshqa belgi bo'lsa Telegram kirishi o'chiq turadi (logda sabab yoziladi).
3. Redeploy (ENV yangi build bilan o'qiladi).
4. Webhook'ni qo'lda o'rnatish SHART EMAS: prod server birinchi «Telegram bilan kirish»
   so'rovida o'zi `setWebhook` chaqiradi — Vercel'dagi o'sha token va sir bilan (har server
   nusxasida bir marta). Token terminalga ko'chirilmaydi, sir har doim mos.
5. Tekshiruv: login sahifasida «Telegram bilan kirish»ni bosing, botda Start — bot kodni
   ko'rsatishi kerak. Ixtiyoriy: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo` —
   `url` = `https://www.sellobay.uz/api/telegram/webhook`, `last_error_message` yo'q.

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
