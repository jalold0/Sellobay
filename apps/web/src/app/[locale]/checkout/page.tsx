import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

import { CheckoutFlow } from '../../../components/checkout/checkout-flow';

import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'checkout' });
  return { title: t('title') };
}

export default function CheckoutPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  // CheckoutFlow `?only=` ni useSearchParams bilan o'qiydi — statik sahifada u faqat
  // brauzerda ma'lum, shuning uchun Suspense ichida (aks holda build to'xtaydi).
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
      <CheckoutFlow />
    </Suspense>
  );
}
