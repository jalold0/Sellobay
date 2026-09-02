'use client';

import { Button, Card, Input, StatusBadge } from '@ecom/ui';
import { CheckCircle2, Loader2, Package, Phone, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { type CurrencyCode } from '@ecom/utils';

import { formatDateTime, formatMoney } from '../../../lib/format';
import { ORDER_STATUS_TONE, type OrderStatus } from '../../../lib/order-status';

/**
 * Buyurtmani kuzatish.
 *
 * Ilgari bu sahifa MOCK edi: `ORD-` bilan boshlanadigan ISTALGAN raqamga
 * to'qima buyurtma qaytarardi — o'ylab topilgan holat, kuryer ismi
 * ("Bekzod A.") va telefon raqami bilan. Mijoz mavjud bo'lmagan buyurtmani
 * "yo'lda" deb ko'rardi.
 *
 * Endi /api/orders/track ga so'rov ketadi: raqam + telefon mos kelsa —
 * bazadagi haqiqiy holat va vaqt chizig'i, aks holda "topilmadi".
 */
interface TrackedOrder {
  number: string;
  status: OrderStatus;
  placedAt: string;
  total: string;
  currency: CurrencyCode;
  deliveryMethod: string;
  itemCount: number;
  timeline: { status: OrderStatus; at: string }[];
}

export default function OrderTrackerPage() {
  const t = useTranslations('tracking');
  const tStatus = useTranslations('order.status');
  const tc = useTranslations('common');

  const [number, setNumber] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<TrackedOrder | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim() || !phone.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ number: number.trim(), phone: phone.trim() }),
      });
      if (res.status === 429) {
        setError(t('tooMany'));
        return;
      }
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setError(t('notFound'));
        return;
      }
      setResult(json.data.order as TrackedOrder);
    } catch {
      setError(t('notFound'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-brand-ink text-2xl font-bold tracking-tight md:text-3xl">
          {t('title')}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('subtitle')}</p>
      </div>

      <form onSubmit={onSearch} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="ORD-2026-00001234"
              aria-label={t('orderNumber')}
              className="pl-9"
            />
          </div>
          <div className="relative flex-1">
            <Phone className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
              aria-label={t('phone')}
              inputMode="tel"
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {loading ? t('searching') : tc('search')}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">{t('phoneHint')}</p>
      </form>

      {error ? (
        <Card className="p-6 text-center">
          <Package className="text-muted-foreground mx-auto h-10 w-10" />
          <p className="text-muted-foreground mt-3 text-sm">{error}</p>
        </Card>
      ) : null}

      {result ? (
        <Card className="overflow-hidden">
          <div className="bg-secondary/40 border-b p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-muted-foreground text-xs uppercase tracking-wide">
                  {t('orderNumber')}
                </div>
                <div className="font-mono text-lg font-bold">{result.number}</div>
              </div>
              <StatusBadge tone={ORDER_STATUS_TONE[result.status]}>
                {tStatus(result.status)}
              </StatusBadge>
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground text-xs">{t('placedAt')}</dt>
                <dd className="font-medium">{formatDateTime(result.placedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">{t('items')}</dt>
                <dd className="font-medium">{t('itemCount', { count: result.itemCount })}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">{t('total')}</dt>
                <dd className="font-semibold">{formatMoney(result.total, result.currency)}</dd>
              </div>
            </dl>
          </div>

          <div className="p-5">
            <ol className="relative space-y-4 border-l pl-6">
              {result.timeline.map((step, i) => {
                const isLast = i === result.timeline.length - 1;
                return (
                  <li key={`${step.status}-${step.at}`} className="relative">
                    <span
                      className={`absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full border ${
                        isLast
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-background'
                      }`}
                    >
                      <CheckCircle2 size={12} />
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{tStatus(step.status)}</div>
                      <div className="text-muted-foreground text-xs">{formatDateTime(step.at)}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </Card>
      ) : null}

      <Card className="p-5 text-sm">
        <div className="font-semibold">{t('helpTitle')}</div>
        <p className="text-muted-foreground mt-1">{t('helpDesc')}</p>
        <a
          href="tel:+998712000000"
          className="bg-background hover:bg-accent mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <Phone size={14} className="text-primary" /> +998 71 200 00 00
        </a>
      </Card>
    </div>
  );
}
