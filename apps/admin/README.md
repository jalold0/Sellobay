# Admin Panel (`@ecom/admin`)

Next.js 14 App Router asosida. **Port: 3001**.

## Ishga tushirish

```bash
# Root'dan
pnpm install
pnpm --filter @ecom/admin dev
```

`.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_USE_MOCK=true   # backend tayyor bo'lmasa
```

## Struktura

```
src/
├── app/                     # Next.js App Router
│   ├── layout.tsx           # Root layout (Providers + Shell)
│   ├── page.tsx             # Dashboard
│   ├── products/            # Mahsulot list / new / [id]
│   ├── orders/              # Buyurtmalar list + detail
│   ├── customers/           # Mijozlar list + detail
│   ├── sellers/             # Sotuvchi approval
│   ├── categories/          # Tree
│   ├── brands/              # Brendlar
│   ├── inventory/           # Stok / omborlar
│   ├── marketing/           # Promo + kampaniya + sodiqlik + segmentlar
│   ├── analytics/           # Charts
│   ├── settings/            # Profil, foydalanuvchi, RBAC, integratsiya
│   └── login/               # Login (alohida layout)
├── components/
│   ├── layout/              # Sidebar, Topbar, UserMenu, Breadcrumbs, Shell
│   ├── charts/              # Recharts wrapperlari (theme-aware)
│   └── status/              # Domain badge'lari
├── lib/
│   ├── config.ts            # env va konstantalar
│   ├── api-client.ts        # Auth-aware fetch wrapper (token refresh bilan)
│   ├── auth.ts              # JWT decode + RBAC
│   ├── format.ts            # Money/date/relative
│   ├── nav.ts               # Markazlashtirilgan navigatsiya
│   └── mock/                # Backend tayyor bo'lmaganda
└── providers/
    ├── index.tsx            # Hammasini birlashtirgan Providers
    ├── query-provider.tsx
    ├── theme-provider.tsx   # light/dark/system
    └── session-provider.tsx # RBAC + signOut
```

## Kengaytirish

Yangi bo'lim qo'shish:

1. `src/lib/nav.ts` ga `NavItem` qo'shing — sidebar avtomatik yangilanadi.
2. `src/app/<bolim>/page.tsx` yarating.
3. Roli cheklangan bo'lsa, `NavItem.roles` ga belgilang.

Backend tayyor bo'lganda mock data'ni almashtirish:

```ts
const { data: products } = useQuery({
  queryKey: ['products', filters],
  queryFn: () => apiClient.get<PaginatedResult<Product>>('/products', { params: filters }),
});
```
