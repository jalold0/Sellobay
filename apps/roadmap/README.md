# @ecom/roadmap — ish jarayoni

Sellobay bo'limlarining holati, funksiyalari va qolgan vazifalari.
Uch auditoriya uchun bitta manba:

- **Asoschi** — qaysi bo'lim qanday holatda, nima qolgan
- **Investor** — umumiy tayyorlik, tekshirilishi mumkin baholar
- **Hodim** — bo'lim nima qiladi (o'qitish) va kimning vazifasi nima

## Ma'lumot qayerda

`src/data/modules.ts` — repo ichida, git bilan versiyalanadi.

Bu **ataylab** bazada emas. Sabablari:

1. Har bir o'zgarish merge request orqali o'tadi — tarixi, sababi va ko'rib
   chiqilishi bor
2. Holat kod bilan birga o'zgaradi, "yangilashni unutdik" holati bo'lmaydi
3. Migratsiya tizimi kerak emas (loyihada u hozircha yo'q)

Holatni o'zgartirish uchun `modules.ts` ni tahrirlab MR oching.

## Ishga tushirish

```
pnpm --filter @ecom/roadmap dev
```

Port: 3004.

Parol **`apps/roadmap/.env.local`** dagi `ROADMAP_PASSWORD` dan olinadi
(monorepo ildizidagi `.env` emas — Next.js har ilovaning o'z papkasini o'qiydi).
Deploy uchun Vercel'ning environment variables bo'limiga qo'yiladi.

O'zgaruvchi qo'yilmagan bo'lsa ilova **hech kimni kiritmaydi** — ochiq qolib
ketmaydi.

## Baholash qoidasi

| Holat     | Ma'nosi                                  |
| --------- | ---------------------------------------- |
| `done`    | Ishlaydi va tekshirilgan                 |
| `wip`     | Qisman — boshlangan, tugallanmagan       |
| `planned` | Rejada, hali boshlanmagan                |
| `gap`     | Yo'q **va bu xavf**                      |
| `idle`    | Yo'q, lekin hozirgi bosqichda zarur emas |

`gap` va `idle` farqi muhim: analitik ombor yo'qligi hozir muammo emas,
migratsiya yo'qligi esa muammo.

Tayyorlik foizi: `done` = 1, `wip` = 0.5, qolgani = 0. `idle` hisobga kirmaydi.
