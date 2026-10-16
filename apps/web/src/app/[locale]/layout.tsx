import '@ecom/ui/globals.css';

import { locales } from '@ecom/i18n';
import { Toaster, TooltipProvider } from '@ecom/ui';
import { Inter, Playfair_Display } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';

import { CookieBanner, CookieConsentScript } from '../../components/layout/cookie-banner';
import { Footer } from '../../components/layout/footer';
import { Header } from '../../components/layout/header';
import { ScrollToTop } from '../../components/layout/scroll-to-top';
import { SkipLink } from '../../components/layout/skip-link';
import { InstallPrompt } from '../../components/pwa/install-prompt';
import { IosInstallSheet } from '../../components/pwa/ios-install-sheet';
import { ServiceWorkerRegister } from '../../components/pwa/service-worker-register';
import { StickyInstallBar } from '../../components/pwa/sticky-install-bar';
import { OrganizationJsonLd } from '../../components/seo/structured-data';
import { BASE_NAMESPACES, pickMessages } from '../../i18n/client-messages';
import { routing } from '../../i18n/routing';
import { fetchStorefrontCategories } from '../../lib/catalog';
import { siteUrl } from '../../lib/site-url';
import { QueryProvider } from '../../providers/query-provider';
import { StoreHydrator } from '../../store/hydrate';
import { StoreSync } from '../../store/store-sync';

import type { Metadata, Viewport } from 'next';

// Shriftlar: `subsets` qaysi @font-face qo'shilishini emas, qaysisi oldindan (preload,
// yuqori ustuvorlik bilan) yuklanishini belgilaydi — kirill @font-face'lari CSS'da baribir
// bor va /ru sahifasida kerak bo'lganda yuklanadi.
//
// Kirill preload'dan OLIB TASHLANDI (mobil tezlik, 2026-10-16). Ilgari u /ru sarlavhalari
// ko'z oldida almashmasligi uchun qo'shilgan edi, lekin preload barcha tillarda ishlaydi:
// /uz (asosiy auditoriya, lotin) va /en sahifalari ham birinchi chizishdan oldin ~39 KB
// keraksiz kirill shriftini sekin 4G'da CSS/JS bilan raqobatda yuklardi (jami 4 fayl,
// ~125 KB). Endi /ru'da birinchi ochilishda sarlavha bir lahza zaxira shriftda ko'rinishi
// mumkin — asosiy auditoriyaning tezligi uchun ongli kelishuv.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

// Playfair Display — Sellobay logotipi va bo'lim sarlavhalari.
//
// Preload faqat lotin (yuqoridagi izohga qarang).
//
// Og'irliklar 600 va 700 gacha qisqartirildi. 500 va 900 yuklanardi,
// lekin repo bo'ylab bironta ham font-serif ular bilan ishlatilmagan;
// og'irliksiz font-serif esa faqat <h1>/<h2> da uchraydi — u yerda
// brauzer standarti 700.
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    template: '%s · Sellobay',
    default: "Sellobay — O'zbekiston uchun onlayn marketplace",
  },
  description:
    'Tekshirilgan sotuvchilar, original mahsulotlar, tezkor yetkazib berish. Kiyim, poyabzal, atirlar va kosmetika.',
  keywords: [
    'sellobay',
    'marketplace',
    "o'zbekiston",
    'onlayn savdo',
    'kiyim',
    'poyabzal',
    'atir',
    'kosmetika',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Sellobay',
    locale: 'uz_UZ',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    title: 'Sellobay',
    statusBarStyle: 'default',
  },
  applicationName: 'Sellobay',
  formatDetection: { telephone: false },
  // Next.js app/icon.png va app/apple-icon.png'ni avtomatik aniqlaydi.
  // Qo'shimcha sizes uchun manifest.ts'ga ko'rsatamiz.
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0C' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

// Statik sahifalar ham (about, terms...) header'dagi kategoriyalarni bazadan oladi —
// 5 daqiqada yangilanadi. Sahifa o'zi kichikroq qiymat bersa (bosh sahifa 120), o'shasi.
export const revalidate = 300;

// Har til uchun sahifalar build paytida (va ISR bilan) tayyorlanadi. Usiz next-intl tilni
// so'rov sarlavhasidan o'qirdi va BUTUN sayt har ochilishda serverda qayta yig'ilardi.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // /favicon.ico kabi statik so'rovlar [locale] segmentiga tushmasin —
  // noto'g'ri locale NextIntlClientProvider'ga o'tsa Intl RangeError beradi
  if (!(locales as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);

  // Navigatsiya kategoriyalari BAZADAN. Ilgari Header va MobileNav o'zlarida
  // 6 ta slug'ni qotib saqlardi: admin yangi kategoriya qo'shsa menyuda
  // ko'rinmasdi, bo'sh kategoriya esa ko'rinib turardi va mijoz uni bosib
  // bo'sh katalogga tushardi.
  const [messages, navCategories] = await Promise.all([getMessages(), fetchStorefrontCategories()]);
  return (
    <html
      lang={locale}
      className={inter.variable + ' ' + playfair.variable}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        <OrganizationJsonLd />
        <NextIntlClientProvider locale={locale} messages={pickMessages(messages, BASE_NAMESPACES)}>
          <QueryProvider>
            <TooltipProvider delayDuration={150}>
              <StoreHydrator />
              <StoreSync />
              <SkipLink />
              <div className="flex min-h-screen flex-col">
                <Header categories={navCategories} />
                <main id="main" className="container flex-1 py-6 md:py-10">
                  {children}
                </main>
                <Footer />
              </div>
              <ScrollToTop />
              <CookieConsentScript />
              <CookieBanner />
              <InstallPrompt />
              <IosInstallSheet />
              <StickyInstallBar />
              <ServiceWorkerRegister />
              <Toaster />
            </TooltipProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
