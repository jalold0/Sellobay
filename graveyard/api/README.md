# @ecom/api — Backend API (NestJS)

Asosiy backend mikroservis. Mijoz sayti, mobil ilova, Telegram Mini App, admin/sotuvchi panellari, kuryer va ombor ilovalari shu API ga murojaat qiladi.

## Modullar

- `auth` — Ro'yxat, login, JWT + Refresh Token, Passport JWT strategy
- `users` — Foydalanuvchi profili va manzillar
- `categories` — Kategoriya daraxti (ko'p tilli)
- `brands` — Brendlar katalogi
- `products` — Mahsulotlar ro'yxati, filtrlash, slug bo'yicha topish
- `cart` — Savatcha (CRUD)
- `orders` — Buyurtma yaratish va kuzatuv
- `payments` — Click, Payme, Uzum Bank provider'lari (skeleton)
- `reviews` — Mahsulot sharhlari
- `health` — Sog'liq endpoint (DB tekshiruvi)

## Ishga tushirish

```bash
pnpm dev          # nest start --watch
pnpm build        # nest build
pnpm test         # jest unit-testlar
```

Swagger UI: http://localhost:4000/docs
