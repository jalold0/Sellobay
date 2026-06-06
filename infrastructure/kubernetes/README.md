# Kubernetes / Helm

Production deployment uchun Helm chart'lar. Hozircha skeleton.

## Tarkib (rejada)

```
infrastructure/kubernetes/
├── helm/
│   ├── api/
│   ├── wms/
│   ├── web/
│   ├── admin/
│   ├── seller/
│   ├── telegram-mini-app/
│   └── telegram-bot/
├── manifests/
│   ├── ingress.yaml
│   ├── cert-manager.yaml
│   └── monitoring/
└── argocd/
```

## Tavsiya etiladigan stack

- **Cluster:** AWS EKS / GCP GKE / Azure AKS
- **Ingress:** Nginx Ingress + cert-manager (Let's Encrypt)
- **Secrets:** External Secrets Operator + AWS Secrets Manager / Vault
- **Observability:** Prometheus + Grafana + Loki, Sentry
- **GitOps:** ArgoCD
