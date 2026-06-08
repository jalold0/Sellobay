import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'E-Commerce Admin Panel',
    short_name: 'Admin',
    description: 'Platforma boshqaruv markazi',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    lang: 'uz',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
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
        icons: [{ src: '/icon', sizes: '32x32' }],
      },
      {
        name: 'Mahsulotlar',
        short_name: 'Products',
        url: '/products',
        icons: [{ src: '/icon', sizes: '32x32' }],
      },
      {
        name: 'Mijozlar',
        short_name: 'Customers',
        url: '/customers',
        icons: [{ src: '/icon', sizes: '32x32' }],
      },
      {
        name: 'Analitika',
        short_name: 'Analytics',
        url: '/analytics',
        icons: [{ src: '/icon', sizes: '32x32' }],
      },
    ],
  };
}
