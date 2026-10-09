# ADR 0010 — Backend qatlamli mustahkamlanadi; har klient uchun alohida servis OCHILMAYDI

- **Sana:** 2026-10-06
- **Holat:** Qabul qilingan
- **Kontekst:** «Har bir klient ilovasi uchun alohida servis kerak, gateway bo'lsin,
  server xatosi bo'lganda qolganlari yiqilmasin» degan talab.

## Qaror

Servislarga **ajratilmaydi**. O'rniga uchta qatlam mustahkamlanadi:
shartnoma (`@ecom/api-contract` + OpenAPI), chidamlilik (`withApi()`,
ulanish hovuzi, rate-limit, Sentry) va domen modullari (`lib/*-server.ts`).

## Talab to'g'ri, lekin tashxis boshqa joyni ko'rsatdi

Maqsad — bitta narsa yiqilganda qolgani ishlab turishi — **jarayon
darajasida allaqachon bajarilgan**. `apps/web` Vercel'da serverless
ishlaydi: har bir API route alohida lambda chaqiruvi, umumiy uzoq
yashaydigan jarayon yo'q. `/api/reviews` dagi 500 xato `/api/orders`
ga ta'sir qilmaydi — ular bir-birini yiqita olmaydi.

Bu yo'l bir marta sinalgan ham: `apps/api` (NestJS) va `apps/wms`
aynan shunday ajratilgan servislar edi va **ishlatilmagani uchun**
`graveyard/` ga karantinlangan.

## O'lchab topilgan HAQIQIY yiqilish manbalari

1. **Bazaga ulanish.** `DATABASE_URL` Neon'ning TO'G'RIDAN-TO'G'RI
   endpointiga qaraydi (nomda `-pooler` yo'q). Serverless'da har issiq
   lambda o'z ulanish hovuzini ochadi va yuk oshganda limit tugaydi.

   **Ajratish buni YOMONLASHTIRARDI:** 5 ta servis = 5 barobar ko'p
   hovuz, o'sha bitta limitga qarshi. Ya'ni talab qilingan yechim
   aynan eng zaif nuqtaga zarar berardi.

2. **Rate limiting amalda o'chiq.** `UPSTASH_REDIS_REST_URL` qo'yilmagan,
   kod in-memory `Map` ga tushadi. Har lambda instansining o'z `Map` i
   bor, ya'ni hisoblagich umumiy emas — login va OTP himoyasiz.

3. **Xatolar ko'rinmaydi.** `SENTRY_DSN` qo'yilmagan.
   `Sentry.captureException(...)` chaqiruvlari hech qayerga ketmaydi.

4. **Shartnoma ikki xil edi.** 43 route `{success,data}`, 6 ta katalog
   route'i xom javob qaytarardi. Klientda ikkita metod (`get`/`getRaw`)
   saqlanardi va noto'g'risini chaqirish muvaffaqiyatli javobni ham
   xato deb ko'rsatardi. Versiyalash ham yo'q edi.

## Yechim

**Shartnoma qatlami.** `@ecom/api-contract` — Zod sxemalari yagona
manba. Undan `openapi.json` va Dart modellari generatsiya qilinadi.
Ilgari Dart modellari qo'lda yozilardi (946 qator) va server maydon
qo'shganda uni qo'lda ko'chirish kerak edi; esdan chiqsa maydon JIM
yo'qolardi — `Map<String, dynamic>` ni kompilyator tekshirmaydi.

**`withApi()` — gateway, lekin SERVIS EMAS, qatlam.** Har route'ni
o'raydi: domen xatolari, Zod validatsiyasi, Prisma xatolari va
kutilmagan istisnolar bitta joyda ushlanadi, `requestId` qo'yiladi,
stack trace tashqariga chiqmaydi. Alohida protsess qilish qo'shimcha
tarmoq sakrashi va yangi yiqilish nuqtasi bo'lardi.

**Sekin degradatsiya.** Ikkilamchi ma'lumot asosiysini o'ldirmaydi:
kuryer statistikasi yiqilsa ro'yxat baribir ko'rinadi.

## Muhim chegara

Tashqi protokollar konvertga **o'tkazilmaydi**: `/api/payments/payme`
JSON-RPC 2.0 da, `/api/payments/click` esa `{error, error_note}` da
javob beradi — formatni to'lov tizimlari belgilaydi. O'zgartirish
haqiqiy to'lovlarni buzardi. `/api/health` ham monitoring uchun
sodda qoladi.

## Oqibatlari

**Yaxshi:** bitta deploy, bitta ulanish hovuzi, bitta shartnoma manbai.
Kutilmagan xato endi HTML emas, JSON qaytaradi va `requestId` beradi.

**Yomon:** `openapi.json` va Dart modellari generatsiya qilinadi —
sxema o'zgarganda `pnpm api:gen` ni ishga tushirish esdan chiqishi
mumkin. Buni CI tekshiruvi bilan yopish kerak (hali qilinmagan).

**Hal qilinmagan:** 1–3 bandlar — pooler, Upstash va Sentry —
**konfiguratsiya**, kod emas. Ular Vercel va Neon panelida qo'yiladi
va eng katta foydani aynan o'shalar beradi.

## Qachon ajratish mantiqan keladi

Jamoalar alohida bo'lganda yoki bitta domen boshqalardan keskin ko'p
yuk olganda. Hozir admin va seller jami 19 000 qator — monolitni
bo'lish uchun kichik hajm.
