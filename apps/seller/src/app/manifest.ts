import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sellobay Sotuvchi paneli',
    short_name: 'SB Sotuvchi',
    description: 'Sellobay marketplace sotuvchi paneli — do`koningizni boshqaring',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#ffffff',
    theme_color: '#8B0020',
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
        name: 'Mahsulotlarim',
        short_name: 'Products',
        url: '/products',
        icons: [{ src: '/icon.svg', sizes: 'any' }],
      },
      {
        name: 'Inventar',
        short_name: 'Inventory',
        url: '/inventory',
        icons: [{ src: '/icon.svg', sizes: 'any' }],
      },
      {
        name: 'Moliya',
        short_name: 'Finance',
        url: '/finance',
        icons: [{ src: '/icon.svg', sizes: 'any' }],
      },
    ],
  };
}
