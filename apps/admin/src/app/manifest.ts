import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sellobay Admin Panel',
    short_name: 'SB Admin',
    description: 'Sellobay marketplace boshqaruv markazi',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#ffffff',
    theme_color: '#0A0A0C',
    lang: 'uz',
    categories: ['business', 'productivity'],
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
        name: 'Buyurtmalar',
        short_name: 'Orders',
        url: '/orders',
        icons: [{ src: '/icon.svg', sizes: 'any' }],
      },
      {
        name: 'Mahsulotlar',
        short_name: 'Products',
        url: '/products',
        icons: [{ src: '/icon.svg', sizes: 'any' }],
      },
      {
        name: 'Mijozlar',
        short_name: 'Customers',
        url: '/customers',
        icons: [{ src: '/icon.svg', sizes: 'any' }],
      },
      {
        name: 'Analitika',
        short_name: 'Analytics',
        url: '/analytics',
        icons: [{ src: '/icon.svg', sizes: 'any' }],
      },
    ],
  };
}
