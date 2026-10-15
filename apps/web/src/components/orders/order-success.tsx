'use client';

import { Button, Card } from '@ecom/ui';
import { CheckCircle2, Clock, FileText, Package, Smartphone } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link } from '@/i18n/navigation';

import { useMe } from '../../lib/auth/use-me';

import { PayNowButtons } from './pay-now';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PaymentStatus {
  number: string;
  state: 'PAID' | 'COD_PENDING' | 'AWAITING_PAYMENT';
  receiptInReview: boolean;
  canPayOnline: boolean;
  onlineProviders: string[];
}

/**
 * «Buyurtma qabul qilindi» sahifasi.
 *
 * Ilgari to'lov natijasini tekshirmasdi: Click/Payme to'lovi boshlanmasa yoki mijoz
 * to'lov sahifasini yopib qaytsa ham «qabul qilindi» deyilardi va qayta to'lash yo'q
 * edi (audit FUN-06). Endi `order` bo'lsa holat serverdan olinadi; to'lanmagan bo'lsa
 * «to'lov kutilmoqda» va to'lash tugmalari ko'rsatiladi.
 */
export function OrderSuccess() {
  const t = useTranslations('orderSuccess');
  const tc = useTranslations('common');
  const params = useSearchParams();
  const { data: me } = useMe();
  // Raqam berilmagan bo'lsa ko'rsatilmaydi: ilgari bu yerda to'qima
  // `ORD-2026-00000000` turardi va u haqiqiy buyurtmaga o'xshab ko'rinardi.
  const numberParam = params.get('number');

  // To'lov provayderidan qaytganda (`return_url` da `order` bor) mobil
  // ilovani ochamiz. Faqat UUID qabul qilinadi: parametr tashqaridan
  // keladi va havolaga o'zboshimcha matn qo'yilmasligi kerak.
  const orderParam = params.get('order');
  const orderId = orderParam && UUID.test(orderParam) ? orderParam : null;
  const appLink = orderId ? `sellobay://orders/${orderId}` : null;

  const [status, setStatus] = React.useState<PaymentStatus | null>(null);
  const [checking, setChecking] = React.useState(Boolean(orderId));

  React.useEffect(() => {
    if (!orderId) return;
    let alive = true;
    fetch(`/api/orders/${orderId}/payment-status`, { credentials: 'same-origin' })
      .then((r) => r.json() as Promise<{ success?: boolean; data?: PaymentStatus }>)
      .then((j) => {
        if (alive && j.success && j.data) setStatus(j.data);
      })
      .catch(() => {
        // Tekshirib bo'lmadi — oddiy «qabul qilindi» ko'rinishi qoladi.
      })
      .finally(() => {
        if (alive) setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, [orderId]);

  React.useEffect(() => {
    // Faqat Android va faqat to'lov tugagan bo'lsa: ilova o'rnatilmagan bo'lsa jim qoladi.
    // To'lov kutilayotganda sahifada qolamiz — to'lash tugmasi shu yerda.
    if (!appLink || checking || status?.canPayOnline) return;
    if (/android/i.test(navigator.userAgent)) window.location.href = appLink;
  }, [appLink, checking, status?.canPayOnline]);

  const number = numberParam ?? status?.number ?? null;
  const awaiting = status?.state === 'AWAITING_PAYMENT' && !status.receiptInReview;
  // Mehmonning kabineti yo'q — u buyurtmani kuzatish sahifasida ko'radi.
  const ordersHref = me ? '/profile/orders' : '/orders';

  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      {awaiting ? (
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          <Clock className="h-10 w-10" aria-hidden="true" />
        </div>
      ) : (
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
        </div>
      )}
      <h1 className="mt-6 text-3xl font-bold tracking-tight">
        {awaiting ? t('pendingTitle') : status?.state === 'PAID' ? t('paidTitle') : t('title')}
      </h1>
      <p className="text-muted-foreground mt-3 text-sm" aria-live="polite">
        {checking ? t('checking') : awaiting ? t('pendingDesc') : t('subtitle')}
      </p>

      {number ? (
        <Card className="mt-6 p-5">
          <div className="text-muted-foreground text-xs uppercase tracking-wide">
            {t('orderNumber')}
          </div>
          <div className="mt-1 font-mono text-2xl font-bold">{number}</div>
        </Card>
      ) : null}

      {awaiting && status?.canPayOnline && orderId ? (
        <div className="mt-6">
          <PayNowButtons orderId={orderId} providers={status.onlineProviders} />
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {appLink && !awaiting ? (
          <Button asChild>
            <a href={appLink}>
              <Smartphone className="mr-2 h-4 w-4" aria-hidden="true" /> {t('openInApp')}
            </a>
          </Button>
        ) : null}
        <Button asChild variant={appLink || awaiting ? 'outline' : 'default'}>
          <Link href={ordersHref}>
            <Package className="mr-2 h-4 w-4" aria-hidden="true" />{' '}
            {me ? t('goToOrders') : t('trackOrder')}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" /> {tc('continue')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
