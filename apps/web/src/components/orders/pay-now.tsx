'use client';

import { Button } from '@ecom/ui';
import { CreditCard, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

const PROVIDER_NAME: Record<string, string> = { CLICK: 'Click', PAYME: 'Payme' };

/**
 * To'lanmagan buyurtmani onlayn to'lash tugmalari (audit FUN-06).
 *
 * `/api/payments/create` to'lov sahifasi manzilini beradi; summa serverdagi buyurtmadan
 * olinadi. Mehmon buyurtmasi ham ishlaydi (route shunday qurilgan).
 */
export function PayNowButtons({
  orderId,
  providers,
}: {
  orderId: string;
  providers: readonly string[];
}) {
  const t = useTranslations('orderSuccess');
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function pay(provider: string) {
    setBusy(provider);
    setError(null);
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ orderId, provider }),
      });
      const json = (await res.json().catch(() => null)) as {
        success?: boolean;
        data?: { checkoutUrl?: string | null };
        error?: { message?: string };
      } | null;
      if (json?.success && json.data?.checkoutUrl) {
        window.location.href = json.data.checkoutUrl;
        return;
      }
      setError(json?.error?.message ?? t('payFailed'));
    } catch {
      setError(t('payFailed'));
    }
    setBusy(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        {providers.map((p) => (
          <Button key={p} onClick={() => void pay(p)} disabled={busy !== null}>
            {busy === p ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {t('payWith', { provider: PROVIDER_NAME[p] ?? p })}
          </Button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
