import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

import { OrderSuccess } from '../../../../components/orders/order-success';

export default function OrderSuccessPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  // Buyurtma raqami URL'dan (useSearchParams) — statik sahifada faqat brauzerda ma'lum.
  return (
    <Suspense fallback={<div className="min-h-[50vh]" aria-busy="true" />}>
      <OrderSuccess />
    </Suspense>
  );
}
