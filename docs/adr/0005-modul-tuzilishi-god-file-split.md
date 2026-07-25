# ADR 0005: Modul tuzilishi va god-file split konventsiyasi

**Status:** Qabul qilingan
**Sana:** 2026-07-18

## Kontekst

Loyiha o'sgani sayin bir nechta fayl "god-file"ga aylandi (600–1200+ qator):
mobil `checkout/index.tsx` (1227), web `product-detail.tsx` (632), mobil
`orders/[id].tsx` (627) va web `api/orders/route.ts` (559 — biznes-logika
interface qatlamida). Bu fayllar ustida ko'p ishlangani uchun o'qish, test
yozish va parallel ishlashni qiyinlashtirardi. Refaktor (2026-07-18) ularni
bo'ldi; kelajakda ham bir xil naqsh saqlanishi uchun qoidani hujjatlaymiz.

## Qaror

### 1. Qatlamlar (bog'liqlik faqat ichkariga qaraydi)

```
interface      apps/*/app/api/**  yoki  app/<screen>   (HTTP handler / ekran)
application     apps/web/src/lib/*-server.ts             (biznes-servislar)
domain          packages/core-domain                     (sof, framework'siz)
infrastructure  packages/database (Prisma)               (DB kirish)
```

Route handler / ekran → servisga, servis → domen va Prisma'ga tayanadi.
`core-domain` hech narsaga bog'lanmaydi. Qarang ADR 0004.

### 2. Biznes-logika route handler'da YOZILMAYDI

HTTP route (`app/api/**/route.ts`) faqat: rate-limit → parse/validatsiya →
auth → servis chaqiruvi → javob mapping. Biznes-logika `lib/*-server.ts` da.
Biznes-xatolar typed error (masalan `OrderError`) bilan tashlanadi, route uni
status/code'ga map qiladi. Namuna: `orders-server.ts` + `api/orders/route.ts`.

### 3. God-file split naqshi (UI ekranlar)

Ekran **orkestr** bo'lib qoladi: holat, effektlar, hisob-kitob, handlerlar,
submit. Prezentatsion bo'laklar seksiya komponentlarga ajratiladi:

- Web: `apps/web/src/components/<feature>/*`
- Mobil: `apps/mobile/src/components/<feature>/*`

Umumiy tiplar/konstantalar alohida `types.ts` yoki `*-i18n.ts` faylda.
Yo'nalish bir tomonlama: orkestr → seksiyalar → umumiy tiplar (aylanma yo'q).

### 4. Expo Router — seksiyalar `app/` TASHQARISIDA

Expo Router'da `app/` ostidagi har bir fayl avtomatik route bo'ladi. Shu bois
mobil seksiya komponentlari **doim** `src/components/<feature>/` da yashaydi,
hech qachon `app/checkout/` yoki `app/orders/` ichida emas — aks holda
tasodifiy, kirib bo'lmaydigan route paydo bo'ladi.

### 5. Fayl hajmi ko'rsatmasi (qat'iy chegara emas, signal)

- < 300 qator — norma
- 300–600 — kuzatuvda
- 600+ — bo'lish ko'rib chiqilsin (data/seed/lug'at fayllari istisno bo'lishi mumkin)

## Oqibatlar

- (+) Har fayl bitta mas'uliyatga ega, o'qish va parallel ishlash oson
- (+) Application qatlami (`*-server.ts`) framework'siz — test yozish osonlashadi
- (+) Refaktorda **logika o'zgartirilmadi**, faqat ko'chirildi; har qadam
  build+typecheck+test yashil va jonli smoke bilan tasdiqlandi
- (–) Bitta oqim endi bir nechta faylda — o'zgarish kiritishda orkestrni ham,
  tegishli seksiyani ham ko'rish kerak (props orqali bog'langan)

## Amalga oshirilgan bo'linishlar (2026-07-18)

| Fayl                        | Oldin | Hozir | Modullar                    |
| --------------------------- | ----- | ----- | --------------------------- |
| `api/orders/route.ts`       | 559   | 42    | `lib/orders-server.ts`      |
| `mobile checkout/index.tsx` | 1227  | 523   | `components/checkout/*` (7) |
| `web product-detail.tsx`    | 632   | 381   | `components/product/*` (3)  |
| `mobile orders/[id].tsx`    | 627   | 340   | `components/orders/*` (3)   |
