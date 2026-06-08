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
import { ServiceWorkerRegister } from '../../components/pwa/service-worker-register';
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
    template: '%s · E-Commerce',
    default: "E-Commerce — O'zbekistondagi eng yirik onlayn savdo platformasi",
  },
  description:
    'Kiyim-kechak, poyabzal, atirlar, kosmetika va aksessuarlar. Asl mahsulotlar, tezkor yetkazib berish, 14 kun qaytarish.',
  keywords: ['e-commerce', "o'zbekiston", 'onlayn savdo', 'kiyim', 'poyabzal', 'atir', 'kosmetika'],
  openGraph: {
    type: 'website',
    siteName: 'E-Commerce',
    locale: 'uz_UZ',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  // PWA — app-style ko'rinish iOS Safari'da, Android Chrome'da
  appleWebApp: {
    capable: true,
    title: 'E-Commerce',
    statusBarStyle: 'default',
  },
  applicationName: 'E-Commerce',
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
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
              <ServiceWorkerRegister />
              <Toaster />
            </TooltipProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
