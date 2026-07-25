# ADR 0004: Backend — apps/web (Next.js API routes); NestJS skeletlari karantinlandi

**Status:** Qabul qilingan (ADR 0002'ni bekor qiladi)
**Sana:** 2026-07-17 (helm chart karantini: 2026-07-18)

## Kontekst

ADR 0002 backend sifatida NestJS'ni tanlagan edi (`apps/api`, `apps/wms`).
Amalda esa loyiha boshqa yo'ldan rivojlandi:

- Barcha jonli trafik (web, mobil, TMA, bot) `apps/web`ning Next.js API
  route'lariga boradi va Vercel'da deploy qilingan.
- `apps/api`/`apps/wms` hech qayerdan import qilinmagan, deploy qilinmagan
  skeletlar bo'lib qoldi — ustiga, domen logikasining **eskirgan, farqlanuvchi
  nusxasini** saqlar edi (masalan, `OrdersService.create` stock kamaytirmas,
  loyalty/oversell himoyasini qo'llamas edi). Bu "split-brain backend" xavfi:
  kelajakda kimdir noto'g'ri nusxani rivojlantirishi mumkin edi.

## Qaror

1. **Haqiqiy backend — `apps/web`:** API route'lar (`src/app/api/**`) interface
   qatlami, biznes-servislar `src/lib/*-server.ts`, sof domen
   `packages/core-domain`da (framework'siz), DB faqat Prisma
   (`packages/database`) orqali.
2. **NestJS skeletlari o'chirilmadi, karantinlandi:** `graveyard/api`,
   `graveyard/wms` (workspace'dan tashqarida, build/deploy qilinmaydi,
   git tarixi saqlangan — qaytarish `git mv` bilan). Qarang
   `graveyard/README.md`.
3. **Yetim artefaktlar ham tozalandi:** CI docker matritsasidan `api`/`wms`
   olib tashlandi; `infrastructure/kubernetes/helm/api` charti
   `graveyard/helm-api`ga ko'chirildi.

## Oqibatlar

- (+) Bitta haqiqat manbai — domen logikasi faqat bir joyda rivojlanadi
- (+) API kontraktlar, auth, DB oqimlari o'zgarmadi (klientlar allaqachon
  `apps/web`ga ulanardi)
- (+) CI'da mavjud bo'lmagan Dockerfile'ga ishora qiladigan job'lar yo'q
- (–) Kelajakda backend'ni alohida xizmatga ajratish kerak bo'lsa, NestJS'dan
  emas, mavjud `lib/*-server.ts` + `core-domain` qatlamlaridan boshlanadi
  (bu qatlamlar allaqachon framework'dan ajratilgan)
