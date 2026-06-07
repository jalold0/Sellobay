import type { MetadataRoute } from 'next';

import { brands, categories, products } from '../lib/mock-data';

const LOCALES = ['uz', 'ru', 'en'] as const;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const STATIC_ROUTES = [
  '',
  '/catalog',
  '/sale',
  '/login',
  '/register',
  '/about',
  '/contacts',
  '/help',
  '/delivery',
  '/returns',
  '/faq',
  '/sell',
  '/seller-guide',
  '/commissions',
  '/seller-rules',
  '/terms',
  '/privacy',
  '/cookies',
  '/offer',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // Static routes — har bir locale uchun
  for (const route of STATIC_ROUTES) {
    entries.push({
      url: `${SITE_URL}/uz${route}`,
      lastModified: now,
      changeFrequency: route === '' ? 'daily' : 'weekly',
      priority: route === '' ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((l) => [l, `${SITE_URL}/${l}${route}`]),
        ),
      },
    });
  }

  // Mahsulot sahifalari
  for (const p of products) {
    entries.push({
      url: `${SITE_URL}/uz/product/${p.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((l) => [l, `${SITE_URL}/${l}/product/${p.slug}`]),
        ),
      },
    });
  }

  // Kategoriya
  for (const c of categories) {
    entries.push({
      url: `${SITE_URL}/uz/catalog?category=${c.slug}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    });
  }

  // Brendlar
  for (const b of brands) {
    entries.push({
      url: `${SITE_URL}/uz/brand/${b.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }

  return entries;
}
