import { IntlScope } from '../../../i18n/intl-scope';

// Shu bo'lim client komponentlari uchun tarjimalar (i18n/client-messages.ts).
export default function Layout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <IntlScope scope="cart" locale={locale}>
      {children}
    </IntlScope>
  );
}
