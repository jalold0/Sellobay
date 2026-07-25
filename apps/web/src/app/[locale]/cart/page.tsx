import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { CartView } from '../../../components/cart/cart-view';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('cart');
  return { title: t('title') };
}

export default function CartPage() {
  return <CartView />;
}
