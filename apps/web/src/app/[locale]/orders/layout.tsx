import { IntlScope } from '../../../i18n/intl-scope';
import { PRIVATE_PAGE_ROBOTS } from '../../../lib/seo';

import type { Metadata } from 'next';

// Buyurtmani kuzatish va «buyurtma qabul qilindi» sahifalari — qidiruvda chiqmaydi
// (audit SEO-01). Kuzatish sahifasi client komponent, shuning uchun metadata shu yerda.
export const metadata: Metadata = { robots: PRIVATE_PAGE_ROBOTS };

export default function OrdersLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <IntlScope scope="orders" locale={locale}>
      {children}
    </IntlScope>
  );
}
