import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CartView } from '../../../components/cart/cart-view';

import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'cart' });
  return { title: t('title') };
}

export default function CartPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return <CartView />;
}
