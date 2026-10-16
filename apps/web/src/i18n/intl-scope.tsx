import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';

import { pickMessages, ROUTE_NAMESPACES } from './client-messages';

import type { RouteScope } from './client-messages';

/**
 * Sahifa/bo'lim subtree'si uchun client tarjimalari (`client-messages.ts`dagi izoh).
 * Root layout'dagi lug'atni almashtiradi, shuning uchun faqat shu subtree ichida ishlaydi.
 *
 * `setRequestLocale` — layout va sahifa alohida render bo'lishi mumkin; usiz next-intl
 * tilni so'rov sarlavhasidan o'qib, sahifani statikdan dinamikka o'tkazib yuborardi.
 */
export async function IntlScope({
  scope,
  locale,
  children,
}: {
  scope: RouteScope;
  locale: string;
  children: React.ReactNode;
}) {
  setRequestLocale(locale);
  const messages = await getMessages({ locale });
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={pickMessages(messages, ROUTE_NAMESPACES[scope])}
    >
      {children}
    </NextIntlClientProvider>
  );
}
