import '@ecom/ui/globals.css';

import { Toaster, TooltipProvider } from '@ecom/ui';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
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

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
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
  // Sellobay favikon — barcha qurilmalar uchun
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon', sizes: '32x32', type: 'image/png' }, // Next.js auto-generated PNG
    ],
    shortcut: '/icon.svg',
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
    other: [
      {
        rel: 'mask-icon',
        url: '/icon.svg',
        color: '#8B0020', // Safari pinned tab — bordo
      },
    ],
  },
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
  const messages = await getMessages();
  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        <OrganizationJsonLd />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            <TooltipProvider delayDuration={150}>
              <StoreHydrator />
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
