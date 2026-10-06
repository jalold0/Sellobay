import { fetchBrands, fetchProducts, fetchStorefrontCategories } from '../lib/catalog';

import type { BrandSummary, CategorySummary } from '../lib/catalog';
import type { MockProduct } from '../lib/mock-data';
import type { MetadataRoute } from 'next';

// Sitemap ISR bilan yangilanadi. Aks holda u build paytidagi katalog
// holatida muzlab qolardi: keyin qo'shilgan mahsulotlar keyingi deploy'gacha
// sitemap'ga tushmasdi.
export const revalidate = 3600;

const LOCALES = ['uz', 'ru', 'en'] as const;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// Sitemap uchun butun katalog kerak. Hozircha katalog kichik, shu sababli
// bitta so'rov kifoya; o'sganda bu yerga sahifalash qo'shiladi.
const SITEMAP_PRODUCT_LIMIT = 1000;

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

/**
 * Sitemap.
 *
 * Ilgari mahsulot, kategoriya va brend havolalari `mock-data.ts` dagi demo
 * ro'yxatlardan qurilardi. Ya'ni Google'ga MAVJUD BO'LMAGAN sahifalar
 * yuborilardi: mock slug'lar bazada yo'q, demak crawler 404 oladi va bu
 * saytning indekslanishiga zarar qiladi. Bir vaqtda bazadagi haqiqiy
 * mahsulotlar sitemap'ga umuman tushmasdi.
 *
 * Endi hammasi bazadan. Baza xato bersa statik yo'llar baribir qaytadi —
 * sitemap butunlay bo'sh bo'lib qolmaydi.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
        languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}${route}`])),
      },
    });
  }

  let products: MockProduct[] = [];
  let categories: CategorySummary[] = [];
  let brands: BrandSummary[] = [];

  try {
    // `scope: 'ALL'` — global (Xitoy) tovarlarning ham o'z sahifasi bor.
    const [productsResult, categoriesResult, brandsResult] = await Promise.all([
      fetchProducts({ limit: SITEMAP_PRODUCT_LIMIT, scope: 'ALL' }),
      fetchStorefrontCategories(),
      fetchBrands(),
    ]);
    products = productsResult.items;
    categories = categoriesResult;
    brands = brandsResult;
  } catch (err) {
    // Bazaga yetib bo'lmasa sitemap BUTUNLAY yiqilmasligi kerak — statik
    // yo'llar baribir qaytadi.
    //
    // Bu shart, chunki `fetchProducts` production'da DB xatosini yuqoriga
    // uzatadi (sahifalarda bu TO'G'RI: soxta mock ko'rsatib checkout'ni
    // buzmaydi). Lekin sitemap build vaqtida statik generatsiya qilinadi va
    // CI'da `DATABASE_URL` — placeholder, ya'ni ushlanmagan xato BUTUN
    // build'ni yiqitardi.
    console.error('[sitemap] katalogni o`qib bo`lmadi, faqat statik yo`llar:', err);
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

  // Kategoriya — `fetchStorefrontCategories()` bo'shini allaqachon chiqarib
  // tashlagan (bo'sh kategoriya indeksga arzimaydi).
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
