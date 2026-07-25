import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CheckoutFlow } from '../../../components/checkout/checkout-flow';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('checkout');
  return { title: t('title') };
}

export default function CheckoutPage() {
  return <CheckoutFlow />;
}
