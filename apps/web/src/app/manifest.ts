import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'E-Commerce — Onlayn savdo platformasi',
    short_name: 'E-Commerce',
    description: "O'zbekistondagi eng yirik ko'p toifali onlayn savdo platformasi",
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    orientation: 'portrait',
    icons: [
      // Real loyihada `public/icon-192.png`, `public/icon-512.png` lar yaratiladi
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
    ],
    categories: ['shopping', 'lifestyle', 'business'],
    lang: 'uz',
  };
}
