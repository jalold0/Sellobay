# ADR 0012 — NestJS mikroservis backend (Gateway + RabbitMQ + Redis), bosqichma-bosqich

- **Sana:** 2026-10-09
- **Holat:** Qabul qilingan (foydalanuvchi talabi), 1-bosqich rejalashtirilgan
- **Kontekst:** Backend hozir `apps/web` (va `apps/admin`, `apps/seller`) dagi Next.js
  API route'lari: 98 ta route, Vercel serverless, bitta Neon Postgres. Foydalanuvchi
  to'liq NestJS mikroservis backend, Gateway, RabbitMQ, Redis, TypeORM va Docker'da
  lokal deploy so'radi.
- **Bu ADR [0010](0010-backend-chidamliligi.md) ni qisman o'zgartiradi:** 0010 «har klient
  uchun alohida servis OCHILMAYDI» degan edi. Qaror o'zgardi, lekin 0010 ning
  ogohlantirishi (karantindagi `graveyard/api` — «split-brain backend») hamon kuchda va
  quyida aniq hal qilinadi.

## Qaror

### 1. Topologiya (NestJS monorepo: `apps/backend`, bitta paket, bir nechta ilova)

```
Flutter / Web / Admin / Seller / Telegram
                │  HTTPS
                ▼
        ┌──────────────┐   Redis: rate-limit, kesh, idempotency, OTP cooldown
        │   gateway    │   JWT tekshiradi, marshrutlaydi, yagona javob konverti
        └──────┬───────┘
   TCP/HTTP    │            ┌──────────────────────────────┐
 ┌─────────────┼──────────► │ eski Next.js API (Vercel)    │  ko'chirilmagan route'lar
 ▼             ▼            └──────────────────────────────┘
auth-service  catalog-service  orders-service  ... (keyingi bosqichlar)
      │            │                │
      └────────────┴────┬───────────┘
                        ▼
                  PostgreSQL            RabbitMQ: domen hodisalari
              (mavjud sxema, TypeORM)   order.created, order.status_changed,
                                        payment.confirmed → notification-service
```

- **Gateway** — yagona kirish nuqtasi. Hali ko'chirilmagan route'larni eski Next.js
  API'ga **proksi qiladi** (strangler pattern): ilovalar hech qachon to'xtamaydi.
- **Sinxron** so'rovlar gateway → servis **ichki HTTP** orqali (reverse proxy). Servislar
  hozirgi REST shartnomasini (yo'llar, status kodlari, `{ success, data }` konverti) O'ZGARTIRMAY
  saqlaydi — Flutter va web klientlari tegilmaydi, har servis `supertest` bilan mustaqil
  testlanadi. (Dastlab TCP transport rejalashtirilgan edi; 98 ta REST route'ni TCP xabarlariga
  qayta moslash foydasiz qatlam bo'lardi.) **Asinxron** ishlar (push, SMS, email, hisobotlar) —
  RabbitMQ hodisalari orqali.
- **Redis** — tezlik cheklovi, katalog keshi, idempotency kalitlari, OTP qayta-yuborish
  hisoblagichi. Servislar holatni xotirada saqlamaydi.

### 2. 1-bosqich (shu ADR bilan boshlanadi)

`gateway`, `auth-service`, `catalog-service`, `orders-service` + Docker infrastruktura
(Postgres, Redis, RabbitMQ). `notification-service` (push/SMS) — 2-bosqich, hodisa
shartnomalari 1-bosqichdayoq belgilanadi.

### 3. Baza va ORM

- **Bitta Postgres, mavjud sxema.** Servislar jadvallarga **egalik** qiladi
  (auth → `User*`, `OtpCode`; catalog → `Product*`, `Category`, `Brand`; orders →
  `Order*`, `Cart*`, `Payment`...). Boshqa servis jadvaliga to'g'ridan-to'g'ri
  yozmaydi — hodisa yoki servis so'rovi orqali.
- **TypeORM entity'lari mavjud sxemaga mos yoziladi, `synchronize: false` — HECH
  QACHON.** Migratsiyalar avvalgidek `pnpm db:migrate` (Prisma) orqali: sxema manbai
  bitta. TypeORM faqat o'qish/yozish qatlami. Pul — `numeric` ustun, JS'da **string**
  (CLAUDE.md qoidasi): transformer bilan.
- Lokal baza — `db:seed` bilan toza (haqiqiy mijoz ma'lumoti ko'chirilmaydi).

### 4. Split-brain xavfini yopish (eng muhim shart)

`graveyard/api` aynan shu sababdan o'ldirilgan: ikkita farqlanuvchi biznes-logika. Shuning uchun:

1. **Bitta route — bitta egasi.** Route ko'chirilgach, eski Next.js route **o'chiriladi**
   yoki gateway'ga yo'naltiruvchi ingichka proksiga aylanadi. Ikki joyda ishlamaydi.
2. **Hamma klient gateway orqali.** Web/admin/Flutter bazaviy manzili gateway'ga o'tadi
   (ilova uchun `API_BASE_URL`); ularning eski Next.js'ga to'g'ridan-to'g'ri
   chaqiruvlari qolmasligi shart (aks holda buyurtmani ikkala backend yozadi).
3. **Shartnoma testi.** `@ecom/api-contract` (Zod) — yagona haqiqat manbai: yangi servis
   javoblari shu sxemalar bo'yicha tekshiriladi va eski API javobi bilan **parity
   testidan** o'tadi (bir xil kirish → bir xil chiqish).
4. **Domen qoidalari bir joyda:** `@ecom/core-domain` (narx, loyalty, zona) NestJS
   servislari ham ishlatadi — nusxalanmaydi.
5. Ko'chirish **servis bo'yicha, route'lar guruhi bilan** va faqat testlar yashil bo'lgach.

### 5. Texnologiyalar

NestJS **11** (TypeScript strict, CommonJS), `@nestjs/typeorm` + TypeORM **0.3** + `pg`,
`ioredis` 5, `amqp-connection-manager` + `amqplib`, `http-proxy-middleware` 3, `jose` 5 (mavjud
`@ecom/auth` tokenlari bilan bir xil HS256), Zod 3 (`@ecom/api-contract` bilan sxema ulashish),
`jest` + `supertest`. Docker: bitta ko'p bosqichli `Dockerfile` (`APP=gateway|auth|catalog|orders`),
production rasmda faqat `--prod` bog'liqliklar, root bo'lmagan foydalanuvchi.

**Nega Nest 12 / TypeORM 1.x emas:** ular yangi chiqqan va ESM-only (`"type": "module"`); dekoratorlar,
jest va mavjud CJS paketlari bilan ishlash murakkablashadi. Nest 11 qo'llab-quvvatlanadigan «legacy»
liniya; ESM'ga o'tish keyinroq, alohida qaror.

### 6. Xavfsizlik va ishonchlilik

- JWT (`jose`, `@ecom/auth` bilan bir xil kalit/format — mavjud tokenlar ishlayveradi).
- Gateway rate-limit (Redis), servislar tashqariga ochilmaydi (faqat Docker tarmog'i).
- Idempotency: buyurtma yaratish kaliti Redis + `Order.idempotencyKey` (mavjud ustun).
- Hodisalar: RabbitMQ'da `durable` navbat + `dead-letter` navbat (qayta urinishsiz — zaharli xabar
  navbatni to'xtatmasin); `messageId` bo'yicha consumer idempotent bo'ladi. OTP kabi maxfiy hodisa
  60 soniyada o'chadi va logga yozilmaydi.
- Gateway → servis: `x-user-id`/`x-user-roles` sarlavhalarini FAQAT gateway qo'yadi (mijozdan kelganini
  o'chiradi); servislar `INTERNAL_API_KEY`siz so'rovni rad etadi; har servis faqat o'ziga kerak sirlarni oladi.
- Sog'liq: har servis `/health` (DB, Redis, RabbitMQ).

## Oqibatlar va tan olingan xavflar

- **Operatsion murakkablik oshadi** (5+ jarayon, 3 infratuzilma xizmati) — bitta
  dasturchi uchun jiddiy yuk. Shu sababli bosqichma-bosqich va gateway proksi bilan.
- Hozirgi Vercel deploy **o'zgarmaydi**; NestJS stack'i hozircha **lokal Docker**'da.
  Productionga chiqarish alohida qaror (VPS yoki bulut) — 2-bosqichdan keyin.
- 98 route'ni to'liq paritet bilan ko'chirish — haftalar. 1-bosqich butun backendning
  taxminan uchdan birini qoplaydi.

## Foydalanuvchidan kerak bo'ladigan ma'lumotlar

| Nima                                                                      | Qachon kerak           |
| ------------------------------------------------------------------------- | ---------------------- |
| Docker Desktop o'rnatilgan kompyuter (hozir yo'q; WSL2 ham yo'q)          | 1-bosqich tekshiruvi   |
| Eskiz.uz (yoki PlayMobile) login/parol — OTP SMS                          | auth-service           |
| Click `SERVICE_ID/MERCHANT_ID/SECRET`, Payme merchant kaliti              | orders/payments        |
| Firebase service account JSON (maxfiy — faqat `.env`ga)                   | notification-service   |
| Production serveri (VPS/bulut) va domen (`sellobay.uz` hozir ulanmagan)   | productionga chiqarish |
| JWT maxfiy kalitlari (mavjud Vercel'dagilar bilan bir xil bo'lishi kerak) | auth-service           |
