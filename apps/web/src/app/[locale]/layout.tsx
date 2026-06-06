import '@ecom/ui/globals.css';

import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import { QueryProvider } from '../../providers/query-provider';
import { Footer } from '../../components/layout/footer';
import { Header } from '../../components/layout/header';

export const metadata: Metadata = {
  title: {
    template: '%s · E-Commerce',
    default: "E-Commerce — O'zbekistondagi eng yirik onlayn savdo platformasi",
  },
  description:
    "Kiyim-kechak, poyabzal, atirlar, kosmetika va aksessuarlar. Asl mahsulotlar, tezkor yetkazib berish, 14 kun qaytarish.",
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
    <html lang={locale}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="container flex-1 py-6 md:py-10">{children}</main>
              <Footer />
            </div>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
