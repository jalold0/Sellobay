import type { MetadataRoute } from 'next';

// Sellobay PWA manifest — rasmiy logo bilan
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sellobay — Marketplace ekotizimi',
    short_name: 'Sellobay',
    description:
      'Tekshirilgan sotuvchilar, original mahsulotlar, tezkor yetkazib berish. Kiyim, poyabzal, atirlar va kosmetika.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#8B0020', // Bordo
    lang: 'uz',
    dir: 'ltr',
    categories: ['shopping', 'lifestyle', 'business'],
    prefer_related_applications: false,
    icons: [
      { src: '/sellobay-icon-32.png', sizes: '32x32', type: 'image/png' },
      { src: '/sellobay-icon-180.png', sizes: '180x180', type: 'image/png' },
      { src: '/sellobay-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/sellobay-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/sellobay-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/sellobay-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Katalog',
        short_name: 'Katalog',
        description: "Barcha mahsulotlarni ko'rish",
        url: '/catalog',
        icons: [{ src: '/sellobay-icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Savatcha',
        short_name: 'Savatcha',
        description: 'Sizning savatchangiz',
        url: '/cart',
        icons: [{ src: '/sellobay-icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Buyurtmalar',
        short_name: 'Buyurtmalar',
        description: 'Buyurtma kuzatish',
        url: '/orders',
        icons: [{ src: '/sellobay-icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Aksiyalar',
        short_name: 'Aksiya',
        description: 'Eng yaxshi chegirmalar',
        url: '/sale',
        icons: [{ src: '/sellobay-icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
