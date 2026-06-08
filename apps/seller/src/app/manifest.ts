import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'E-Commerce Sotuvchi paneli',
    short_name: 'Sotuvchi',
    description: 'Marketplace sotuvchi paneli — do`koningizni boshqaring',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#ffffff',
    theme_color: '#6366f1',
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
        name: 'Mahsulotlarim',
        short_name: 'Products',
        url: '/products',
        icons: [{ src: '/icon', sizes: '32x32' }],
      },
      {
        name: 'Inventar',
        short_name: 'Inventory',
        url: '/inventory',
        icons: [{ src: '/icon', sizes: '32x32' }],
      },
      {
        name: 'Moliya',
        short_name: 'Finance',
        url: '/finance',
        icons: [{ src: '/icon', sizes: '32x32' }],
      },
    ],
  };
}
