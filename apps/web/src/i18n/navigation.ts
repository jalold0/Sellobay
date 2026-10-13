// Tilni o'zi qo'shadigan navigatsiya: `<Link href="/catalog">` → `/uz/catalog`.
//
// Ilgari ichki havolalar `next/link` bilan prefikssiz (`/catalog`) yozilardi. Middleware
// `localePrefix: 'always'` bo'lgani uchun har bosishda avval 307 redirect qaytarardi, keyin
// haqiqiy sahifa so'ralardi — har o'tish ikki marta serverga borib-qaytardi va prefetch
// behuda ketardi. Ichki havola va `router.push` shu fayldan olinadi.

import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
