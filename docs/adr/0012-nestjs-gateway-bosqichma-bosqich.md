# ADR 0012 — NestJS gateway va servislar bosqichma-bosqich qo'shiladi; ADR 0010 qisman almashtiriladi

- **Sana:** 2026-10-12
- **Holat:** Qabul qilingan
- **Almashtiradi:** ADR 0010 (qisman — "servislarga ajratilmaydi" qismi)
- **Kontekst:** Loyiha egasining talabi: backend NestJS'da, gateway va servislar bilan,
  RabbitMQ, Redis, PostgreSQL, TypeORM, Docker'da ko'tarilgan holda. ADR 0010 xuddi
  shunga o'xshash talabni rad etgan, ADR 0004 esa avvalgi NestJS skeletini
  `graveyard/` ga karantin qilgan edi.

## Qaror

Backend **bosqichma-bosqich** (strangler fig) NestJS'ga ko'chiriladi. Har bosqichda
tizim to'liq ishlaydi, klientlar (web, admin, seller, Flutter) hech narsani sezmaydi.

1. **Gateway (NestJS).** Barcha klientlar uchun yagona kirish nuqtasi. Boshida HAMMA
   so'rov `apps/web` ga proksi qilinadi. Umumiy qatlam shu yerda: auth (mavjud
   `JWT_SECRET`, `sb_at`/`sb_rt` cookie va `Authorization: Bearer`), Redis'dagi umumiy
   rate-limit, `requestId`, log.
2. **Birinchi servislar — hozir umuman yo'q bo'lgan imkoniyatlar.**
   - `jobs` — fon ishlari: muddati o'tgan to'lanmagan buyurtmani bekor qilish va zaxira,
     coin, promoni qaytarish (audit K4).
   - `notifications` — push (FCM), SMS, email RabbitMQ navbati orqali, qayta urinish bilan.
3. **Domenlar birma-bir:** katalog → yetkazish/kuryer → seller → admin → buyurtma va
   to'lovlar eng oxirida. Domen gateway'da yangi servisga burilgan kundan boshlab uning
   yagona egasi o'sha servis bo'ladi.

## Nega ADR 0010 dan farqli

- ADR 0010 **klient bo'yicha** servis ochishni rad etgan. Bu qaror **domen bo'yicha**.
- ADR 0010 da yechilmay qolgan haqiqiy bo'shliq: serverless'da uzoq yashaydigan
  jarayon yo'q, ya'ni fon ishlari va navbat qo'yadigan joy yo'q. Natijada to'lanmagan
  buyurtmalar zaxirani abadiy band qiladi (K4), bildirishnoma xato bersa qayta
  yuborilmaydi. NestJS worker va RabbitMQ aynan shuni beradi.
- Egasi to'liq NestJS stekini talab qildi.

ADR 0010 dagi qolgan xulosalar (Neon pooler, Upstash/Redis rate-limit, Sentry —
konfiguratsiya masalasi) kuchida qoladi va bu qarorda ham bajarilishi shart.

## `graveyard/` takrorlanmasligi uchun (ADR 0004 saboqlari)

Avvalgi NestJS skeleti domenning eskirgan, farqlanuvchi nusxasiga aylangani uchun
o'lgan edi (masalan, buyurtmada zaxira kamaymasdi). Shuning uchun:

1. **Paritet bo'lmasa — burilmaydi.** Domen yo'li gateway'da yangi servisga faqat
   mavjud amaliy testlar (K1–K7 skriptlari va `apps/web/scripts/payments/*`) yangi
   servisga qarshi o'tgandan keyin buriladi.
2. **Bitta yozuvchi.** Bir domenga bir vaqtda faqat bitta backend yozadi. Ko'chirilgan
   domenning `apps/web` dagi route'lari o'chiriladi yoki gateway'ga yo'naltiriladi.
3. **Sxemaning yagona egasi — Prisma.** Migratsiyalar `packages/database` da qoladi
   (`pnpm db:migrate`). TypeORM entity'lari mavjud jadvallarga MOSLANADI:
   `synchronize: false`, `migrationsRun: false`. TypeORM sxemani hech qachon o'zgartirmaydi.
   Ikki ORM orasidagi moslikni tekshiruvchi test qo'shiladi.
4. **Ulanish hovuzi.** Har servisda kichik hovuz (masalan, maks. 5). Production'da
   PgBouncer yoki Neon pooler shart — ADR 0010 dagi 1-bandning o'zi.

## Deploy

- **Lokal Docker — staging.** `infrastructure/docker/docker-compose.yml`:
  `pnpm docker:up` → postgres + redis + rabbitmq. Elasticsearch, MinIO va Mailhog
  kodda ishlatilmaydi va `extras` profilida: `docker compose --profile extras up`.
- **Production o'zgarmaydi** (Vercel + Neon, `apps/web`): domen to'liq ko'chib,
  staging'da sinalmaguncha.

## Oqibatlari

**Yaxshi:** fon ishlari va navbat paydo bo'ladi; domenlar alohida masshtablanadi;
o'tish davrida ham klientlar va production buzilmaydi.

**Yomon:** harakatlanuvchi qismlar ko'payadi (gateway, broker, servislar) — monitoring
va health-check'lar kerak. O'tish davrida ikki stack yashaydi. Ikki ORM (Prisma —
migratsiya, TypeORM — runtime). Lokal staging noutbukning RAM'ini ko'proq oladi.

**Ochiq savollar:** servislarning joylashuvi (`apps/*` yoki `services/*`) va
production hosting (VPS) — keyingi bosqichlarda hal qilinadi.
