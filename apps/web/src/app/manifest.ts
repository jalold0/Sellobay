import type { MetadataRoute } from 'next';

// PWA manifest — installable web app for desktop and mobile.
// Foydalanuvchi brauzerda "Install app" tugmasini bosib home screen'ga qo'shadi.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sellobay — Marketplace ekotizimi',
    short_name: 'Sellobay',
    description:
      "Minglab sotuvchilar, premium brendlar, tezkor yetkazib berish. O'zbekistondagi eng yirik marketplace — Sellobay.",
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#8B0020', // Bordo — yangi brand
    lang: 'uz',
    dir: 'ltr',
    categories: ['shopping', 'lifestyle', 'business'],
    prefer_related_applications: false,
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Katalog',
        short_name: 'Katalog',
        description: "Barcha mahsulotlarni ko'rish",
        url: '/catalog',
        icons: [{ src: '/icon.svg', sizes: 'any' }],
      },
      {
        name: 'Savatcha',
        short_name: 'Savatcha',
        description: 'Sizning savatchangiz',
        url: '/cart',
        icons: [{ src: '/icon.svg', sizes: 'any' }],
      },
      {
        name: 'Buyurtmalar',
        short_name: 'Buyurtmalar',
        description: 'Buyurtma kuzatish',
        url: '/orders',
        icons: [{ src: '/icon.svg', sizes: 'any' }],
      },
      {
        name: 'Aksiyalar',
        short_name: 'Aksiya',
        description: 'Eng yaxshi chegirmalar',
        url: '/sale',
        icons: [{ src: '/icon.svg', sizes: 'any' }],
      },
    ],
  };
}
