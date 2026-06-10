# Sellobay — Mijoz mobil ilovasi (Expo)

React Native (Expo SDK 51, Expo Router v3) iOS/Android ilova. NativeWind 4 (Tailwind for RN).
Bitta kodbaza → **Android + iOS** bir vaqtda. Jonli API: `sellobay-web.vercel.app/api` (Neon DB).

- Nom: **Sellobay**, bundle: `uz.sellobay.app`
- Ranglar: bordo `#8B0020` + qora `#0A0A0C` + oltin `#C9A961` (web bilan bir xil)

## Ishga tushirish (Expo Go — bepul, build kerak emas)

```bash
pnpm --filter @ecom/mobile dev      # Expo Dev Server (QR kod)
pnpm --filter @ecom/mobile android  # Android emulator
pnpm --filter @ecom/mobile ios      # iOS simulator (faqat macOS)
```

Birinchi marta: telefoningizga **Expo Go** ilovasini o'rnating, QR kodni skan qiling.
Sellobay telefoningizda ochiladi, kod o'zgarsa real-time yangilanadi.

## Haqiqiy build (EAS)

```bash
npm install -g eas-cli
eas login                                            # expo.dev hisobi (GitHub bilan bepul)
eas build:configure                                  # eas project id biriktiradi
eas build --platform android --profile preview       # Android APK (bepul)
eas build --platform ios --profile preview           # iOS (Apple Developer $99/yil kerak)
eas build --platform android --profile production     # AAB (Play Store)
```

API manzili: `app.json` → `expo.extra.apiBaseUrl`. Custom domain tayyor bo'lganda shu yerni yangilang.

## Struktura

```
app/                          # Expo Router fayllari
├── _layout.tsx               # Root layout (Providers, Stack)
├── (tabs)/                   # Bottom tab group
│   ├── _layout.tsx           # Tabs konfiguratsiyasi (5 tab)
│   ├── index.tsx             # Bosh sahifa (hero, kategoriya, featured, sale, brand)
│   ├── catalog.tsx           # Katalog (filter, sort, search)
│   ├── cart.tsx              # Savatcha (qty, remove, promo, total)
│   ├── wishlist.tsx          # Sevimlilar
│   └── profile.tsx           # Profil (mehmon/foydalanuvchi)
├── product/[slug].tsx        # Mahsulot detali (gallery, color/size, qty, add-to-cart, related)
├── auth/login.tsx            # Modal: telefon OTP + email + 3 OAuth
├── checkout/index.tsx        # Multi-step (manzil → shipping → to'lov → tasdiq)
└── order-success.tsx         # Buyurtma muvaffaqiyat

src/
├── lib/
│   ├── api.ts                # Jonli API client (sellobay-web.vercel.app/api, mock fallback)
│   ├── hooks.ts              # React Query: useProducts, useProduct
│   ├── format.ts             # Deterministik money/date/relative
│   ├── mock-data.ts          # fallback products/brands/categories
│   └── storage.ts            # MMKV + expo-secure-store helperlari
├── store/
│   ├── cart.ts               # Zustand + MMKV persist
│   ├── wishlist.ts           # Zustand + MMKV persist
│   ├── session.ts            # Auth state (tokens secureStore'da)
│   └── toast.ts              # Imperative toast() API
└── ui/                       # Reusable komponentlar
    ├── button.tsx, input.tsx, badge.tsx, skeleton.tsx
    ├── empty-state.tsx, header.tsx, section-header.tsx
    ├── category-chip.tsx, product-card.tsx
    └── toaster.tsx
```

## Texnik tanlovlar

- **NativeWind 4** — Tailwind class'lari React Native komponentlarda
- **expo-router v3** — file-based routing, typed routes
- **Zustand + react-native-mmkv** — eng tezkor key-value persistence
- **expo-secure-store** — sezgir token'lar uchun (keychain/keystore)
- **lucide-react-native** — ikonlar (web bilan bir xil)
- **expo-image** — optimized image loader (gallery uchun)

## Kelajakda kengaytirish

- **Backend ulashi:** ✅ bajarildi — `lib/api.ts` + `lib/hooks.ts` orqali jonli API (Home, Catalog, Product, Wishlist)
- **Auth:** ro'yxatdan o'tish/kirish API'ga ulanishi kerak (web Auth bosqichidan keyin)
- **Push bildirishnomalar:** `expo-notifications` qo'shing, server orqali token registratsiya
- **Tahliy:** `expo-analytics` yoki Sentry
- **i18n:** `expo-localization` + `react-intl` yoki o'zimizning `pickLocalized`
- **Mobile-specific:** kamera (barcode skanerlash), geolokatsiya (manzil), shaxsiy hisob
