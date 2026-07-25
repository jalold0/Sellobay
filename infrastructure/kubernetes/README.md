# Kubernetes / Helm

Hozircha **bo'sh** — production deploy Vercel'da (Next.js app'lar) va alohida
hostlarda (bot). Kubernetes'ga o'tish rejalashtirilgan bosqichda emas.

Eski NestJS `api` uchun yozilgan Helm chart skeleti xizmat bilan birga
karantinlangan: `graveyard/helm-api` (qarang `graveyard/README.md`).

## Kelajakda K8s kerak bo'lsa (tavsiya etiladigan stack)

- **Cluster:** AWS EKS / GCP GKE / Azure AKS
- **Ingress:** Nginx Ingress + cert-manager (Let's Encrypt)
- **Secrets:** External Secrets Operator + AWS Secrets Manager / Vault
- **Observability:** Prometheus + Grafana + Loki, Sentry
- **GitOps:** ArgoCD

Chart'lar `apps/*` dagi har bir deploy qilinadigan xizmat uchun alohida yoziladi
(`web`, `admin`, `seller`, `telegram-mini-app`, `telegram-bot`).
