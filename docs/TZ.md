# Texnik Topshiriq (TZ) — E-Commerce Ekosistema

> **Asl manba:** `TZ_Ecommerce_Ekosistema.docx` (Versiya 1.0, 2026-yil May)
> Ushbu Markdown nusxa kod baza bilan birga turishi va PR'larda ko'rib chiqilishi uchun keltirilgan.

## 1. Loyiha maqsadi

O'zbekistonda eng yirik ko'p toifali onlayn savdo ekosistema yaratish:
kiyim-kechak, poyabzal, atirlar, kosmetika, go'zallik mahsulotlari, moda aksessuarlari hamda kelajakda elektronika va uy-ro'zg'or buyumlari.

## 2. Platforma tarkibi (12 komponent)

1. Mijoz sayti (Next.js)
2. Mobil ilova (React Native — iOS + Android)
3. Telegram Mini App
4. Admin Panel
5. Sotuvchi Paneli (Marketplace)
6. Ombor Tizimi (WMS)
7. Kuryer Tizimi
8. CRM Tizimi
9. Qo'llab-quvvatlash markazi (AI Chatbot bilan)
10. Marketing markazi
11. Moliya moduli
12. Analitika markazi

## 3. Maqsadli bozor

| Bosqich | Maqsad |
|---------|--------|
| 1 | O'zbekiston |
| 2 | Markaziy Osiyo (Qozog'iston, Qirg'iziston, Tojikiston, Turkmaniston) |
| 3 | Xalqaro |

## 4. Texnologiyalar to'plami

| Qatlam | Texnologiya |
|--------|-------------|
| Frontend | Next.js, React, TypeScript |
| Mobile | React Native |
| Backend | NestJS (Node.js) |
| DB | PostgreSQL |
| Cache | Redis |
| Search | Elasticsearch |
| Storage | S3 Compatible |
| Realtime | WebSocket |
| Infra | Docker, Kubernetes, CI/CD |
| Cloud | AWS / GCP / Azure |

## 5. Funksional talablar (qisqacha)

- **Auth:** Telefon (SMS OTP), Email+parol, Telegram Login, Google OAuth, Apple Sign In, 2FA, JWT+Refresh, RBAC, Audit Logs
- **Profil:** shaxsiy ma'lumotlar, manzillar, wishlist, kartalar, sodiqlik, kuponlar, referal
- **Katalog:** ko'p darajali kategoriyalar, brendlar, variantlar (rang/o'lcham), rasmlar/videolar, sharhlar, Q&A, SEO, Elasticsearch qidiruv
- **Savatcha:** add/remove, Buy Now, Guest Checkout, Saqlangan savatcha, Abandoned cart recovery
- **To'lov:** Click, Payme, Uzum Bank, Uzcard, Humo, Visa/Mastercard, COD
- **Yetkazib berish:** Uyga, Olib ketish punkti, Express
- **Telegram:** Mini App, Bot, Marketing
- **Instagram:** Shop sync, Lead, DM, Influencer kuzatuvi
- **Marketing:** Promo-kodlar, Referral, Loyalty, Cashback, Affiliate, Push, SMS, Telegram, Email
- **CRM:** Profile, Segmentatsiya, Lead, Communications, RFM
- **Support:** Tickets, Live Chat, Telegram, AI Chatbot, FAQ, KB
- **Sotuvchi:** Marketplace panel (mahsulot, inventar, buyurtmalar, hisobotlar, qaytarish, moliya)
- **WMS:** Real-time inventar, Barcode/QR, Receiving, Dispatch, Audit, Transferlar, ko'p ombor
- **Kuryer:** mobil ilova, marshrut, yetkazib berish tasdig'i, imzo, foto dalil
- **Analitika:** moliyaviy, buyurtmalar, mijozlar, konversiya, mahsulot, marketing, ombor, sotuvchi, kuryer

## 6. Xavfsizlik

- JWT + Refresh
- RBAC
- 2FA (SMS, TOTP)
- AES-256 (at rest), TLS 1.3 (in transit)
- Rate Limiting, IP Whitelist
- Audit log
- Parol siyosati (min 8, murakkab)
- OWASP Top 10

## 7. Arxitektura

Clean Architecture + DDD + SOLID + Microservice-ready + API-first + Event-driven (kelajak).

Asosiy jadval domenlari: `users`, `products`, `orders`, `warehouses`, `marketing`, `couriers`, `crm`, `finance`. Batafsil: [`packages/database/prisma/schema.prisma`](../packages/database/prisma/schema.prisma).

## 8. Infratuzilma

- Docker (har bir servis konteyner)
- Docker Compose (lokal)
- Kubernetes (production)
- Helm Charts
- GitHub Actions / GitLab CI
- Prometheus + Grafana, ELK, Sentry, Uptime monitoring

## 9. Ko'p til va valyuta

| Parametr | Qiymat |
|----------|--------|
| Tillar | uz (default), ru, en |
| Valyutalar | UZS (asosiy), USD, EUR |
| Matn | i18n JSON, hardcode taqiqlangan |
| RTL | Kelajakdagi arab bozori uchun rejada |
| Sana/vaqt | Foydalanuvchi mintaqasiga mos |

## 10. Roadmap

| Bosqich | Muddat | Vazifalar |
|---------|--------|-----------|
| 1 | 0–3 oy | Arxitektura, DB, API skeleti, Auth, Mahsulot, Buyurtma |
| 2 | 3–6 oy | To'lov, Telegram MA, Admin, Sotuvchi |
| 3 | 6–9 oy | WMS, Kuryer, CRM, Marketing, Analitika |
| 4 | 9–12 oy | AI Chatbot, Tavsiya tizimi, Performance, Audit |
| 5 | 12+ oy | Markaziy Osiyo, ko'p valyuta, xalqaro to'lovlar |

## 11. Sifat talablari (SLO)

| Ko'rsatkich | Min |
|-------------|-----|
| LCP | < 2 s |
| API p95 | < 200 ms |
| Uptime | >= 99.9% |
| Concurrent | 10,000+ |
| Buyurtma/kun | 50,000+ |
| Backup | Kunlik |
| RTO | < 1 soat |
| RPO | < 15 daqiqa |

## 12. Rivojlanish standartlari

- Clean Architecture qat'iy
- SOLID
- DDD
- TDD (kritik modullarda)
- Code Review (≥ 1 reviewer)
- Git Flow
- SemVer
- ADR
- Hech qachon workaround qoldirilmasin

---

Mualliflar: Loyiha arxitektura jamoasi.
