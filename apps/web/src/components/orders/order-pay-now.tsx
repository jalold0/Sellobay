'use client';

import * as React from 'react';

import { PayNowButtons } from './pay-now';

/**
 * Buyurtma sahifasidagi «To'lash» — faqat onlayn to'lash hozir mumkin bo'lsa ko'rinadi
 * (holatni `/api/orders/[id]/payment-status` aytadi). Ilgari web'da to'lanmay qolgan
 * Click/Payme buyurtmasini qayta to'lashning yo'li yo'q edi (audit FUN-06).
 */
export function OrderPayNow({ orderId }: { orderId: string }) {
  const [providers, setProviders] = React.useState<string[]>([]);

  React.useEffect(() => {
    let alive = true;
    fetch(`/api/orders/${orderId}/payment-status`, { credentials: 'same-origin' })
      .then(
        (r) =>
          r.json() as Promise<{
            success?: boolean;
            data?: { canPayOnline: boolean; onlineProviders: string[] };
          }>,
      )
      .then((j) => {
        if (alive && j.success && j.data?.canPayOnline) setProviders(j.data.onlineProviders);
      })
      .catch(() => {
        // Holat aniqlanmadi — tugma ko'rsatilmaydi.
      });
    return () => {
      alive = false;
    };
  }, [orderId]);

  if (providers.length === 0) return null;
  return (
    <div className="mt-3">
      <PayNowButtons orderId={orderId} providers={providers} />
    </div>
  );
}
