import '@ecom/ui/globals.css';

import { locales } from '@ecom/i18n';
import { Toaster, TooltipProvider } from '@ecom/ui';
import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import { CookieBanner } from '../../components/layout/cookie-banner';
import { Footer } from '../../components/layout/footer';
import { Header } from '../../components/layout/header';
import { ScrollToTop } from '../../components/layout/scroll-to-top';
import { SkipLink } from '../../components/layout/skip-link';
import { InstallPrompt } from '../../components/pwa/install-prompt';
import { IosInstallSheet } from '../../components/pwa/ios-install-sheet';
import { ServiceWorkerRegister } from '../../components/pwa/service-worker-register';
import { StickyInstallBar } from '../../components/pwa/sticky-install-bar';
import { QueryProvider } from '../../providers/query-provider';
import { OrganizationJsonLd } from '../../components/seo/structured-data';
import { StoreHydrator } from '../../store/hydrate';
import { StoreSync } from '../../store/store-sync';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
});

// Playfair Display — Sellobay SB monogram va premium sarlavhalar uchun elegant serif
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700', '900'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    template: '%s · Sellobay',
    default: "Sellobay — O'zbekistondagi eng yirik marketplace",
  },
  description:
    "Minglab sotuvchilar, premium brendlar, tezkor yetkazib berish. O'zbekistondagi eng yirik marketplace — Sellobay.",
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
  const messages = await getMessages();
  return (
    <html
      lang={locale}
      className={inter.variable + ' ' + playfair.variable}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        <OrganizationJsonLd />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            <TooltipProvider delayDuration={150}>
              <StoreHydrator />
              <StoreSync />
              <SkipLink />
              <div className="flex min-h-screen flex-col">
                <Header />
                <main id="main" className="container flex-1 py-6 md:py-10">
                  {children}
                </main>
                <Footer />
              </div>
              <ScrollToTop />
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
