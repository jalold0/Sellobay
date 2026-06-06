# Sotuvchi paneli (`@ecom/seller`)

Marketplace sotuvchilari uchun panel. **Port: 3002**.

## Ishga tushirish

```bash
pnpm --filter @ecom/seller dev
```

## Sahifalar

- `/` — Dashboard (KPI, daromad, top mahsulot, oxirgi buyurtmalar)
- `/products`, `/products/new` — Mahsulot CRUD (status tablar)
- `/inventory` — Stok yangilash (bulk edit)
- `/orders` — Buyurtmalar (status tablar + shahar filter)
- `/returns` — Qaytarish so'rovlari (approve/reject)
- `/finance` — Payouts, komissiya, invoice
- `/analytics` — Sotuv hisoboti
- `/login` — Login

Admin panel arxitekturasiga to'liq mos, faqat sotuvchining shaxsiy ko'rinishi.
Foundationi shu xil: `@ecom/ui` + `lib/api-client.ts` + `providers/`.

Yangi bo'lim qo'shish: `src/lib/nav.ts` ga `NavItem` qo'shib, `src/app/<bolim>/page.tsx` yaratish kifoya.
