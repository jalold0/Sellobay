// Mijozning sourcing so'rovlari ro'yxati + taklifga javob berish (qabul/rad).
// Faqat QUOTED holatida CTA ko'rsatiladi; taklif muddati ko'rinib turadi.

'use client';

import { pickLocales, pickLocalized } from '@ecom/i18n/pick';
import { Button, Card, EmptyState } from '@ecom/ui';
import { Clock, ExternalLink, Loader2, PackageSearch, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link, useRouter } from '@/i18n/navigation';

import { useCart } from '../../store/cart';

import { formatLeadTime, formatUzs, hoursLeft, SourcingStatusChip } from './sourcing-ui';

import type { ApiEnvelope, SourcingCheckout, SourcingRequestView } from './sourcing-types';

interface Props {
  items: SourcingRequestView[];
  loading: boolean;
  onChanged: (updated: SourcingRequestView) => void;
}

export function SourcingList({ items, loading, onChanged }: Props) {
  const t = useTranslations('global.list');

  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-10">
        <Loader2 size={18} className="mr-2 animate-spin" /> {t('loading')}
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState icon={PackageSearch} title={t('emptyTitle')} description={t('emptyDesc')} />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <SourcingRow key={item.id} item={item} onChanged={onChanged} />
      ))}
    </div>
  );
}

function SourcingRow({
  item,
  onChanged,
}: {
  item: SourcingRequestView;
  onChanged: (updated: SourcingRequestView) => void;
}) {
  const t = useTranslations('global.list');
  const tc = useTranslations('common');
  const [busy, setBusy] = React.useState<null | 'ACCEPT' | 'REJECT' | 'CANCEL'>(null);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const addItem = useCart((s) => s.addItem);

  // Taklif narxidagi shaxsiy tovar savatga tushadi va to'lov sahifasi faqat u bilan ochiladi.
  function goToCheckout(c: SourcingCheckout) {
    addItem({
      productId: c.productId,
      name: pickLocalized(
        c.name,
        pickLocales.find((l) => l === params?.locale),
      ),
      brand: '',
      slug: c.slug,
      imageSeed: c.slug,
      unitPrice: c.unitPrice,
      currency: 'UZS',
      quantity: c.quantity,
      // Son taklifda belgilangan — savatda oshirib bo'lmaydi.
      maxQuantity: c.quantity,
      isGlobal: true,
    });
    router.push(`/checkout?only=${c.productId}`);
  }

  async function respond(action: 'ACCEPT' | 'REJECT') {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/global/sourcing/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body: ApiEnvelope<SourcingRequestView> = await res.json();
      if (!res.ok || !body.success || !body.data) {
        setError(body.error?.message ?? t('error'));
        return;
      }
      onChanged(body.data);
      if (action === 'ACCEPT' && body.data.checkout) goToCheckout(body.data.checkout);
    } catch {
      setError(t('error'));
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy('CANCEL');
    setError(null);
    try {
      const res = await fetch(`/api/global/sourcing/${item.id}`, { method: 'DELETE' });
      const body: ApiEnvelope<SourcingRequestView> = await res.json();
      if (!res.ok || !body.success || !body.data) {
        setError(body.error?.message ?? t('error'));
        return;
      }
      onChanged(body.data);
    } catch {
      setError(t('error'));
    } finally {
      setBusy(null);
    }
  }

  const isQuoted = item.status === 'QUOTED';
  const canCancel = item.status === 'NEW' || item.status === 'IN_REVIEW';
  const remaining = hoursLeft(item.quoteExpiresAt);

  return (
    <Card className="p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground font-mono text-xs">{item.number}</span>
            <SourcingStatusChip status={item.status} />
            <span className="bg-chip rounded-full px-2 py-0.5 text-[11px] font-medium">
              {item.platform}
            </span>
          </div>
          <a
            href={item.normalizedUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-brand-crimson mt-1.5 inline-flex max-w-full items-center gap-1 truncate text-sm hover:underline"
          >
            <span className="truncate">{item.normalizedUrl}</span>
            <ExternalLink size={12} className="shrink-0" />
          </a>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('qty', { qty: item.qty })}
            {item.variantNote ? ` · ${item.variantNote}` : ''}
          </p>
        </div>

        {isQuoted && item.quotedTotal !== null && (
          <div className="text-right">
            <div className="text-brand-ink font-serif text-2xl font-semibold">
              {formatUzs(item.quotedTotal)}
            </div>
            {item.qty > 1 && item.quotedUnit !== null && (
              <div className="text-muted-foreground text-xs">
                {t('perUnit', { price: formatUzs(item.quotedUnit) })}
              </div>
            )}
            <div className="text-muted-foreground mt-0.5 text-xs">
              {formatLeadTime(item.leadTimeMinDays, item.leadTimeMaxDays, t('day'))}
            </div>
          </div>
        )}
      </div>

      {item.operatorNote && (
        <p className="bg-paper text-brand-ink-soft mt-3 rounded-lg px-3 py-2 text-sm">
          {item.operatorNote}
        </p>
      )}

      {error && <p className="text-brand-crimson mt-3 text-sm">{error}</p>}

      {isQuoted && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={() => respond('ACCEPT')} disabled={busy !== null}>
            {busy === 'ACCEPT' && <Loader2 size={16} className="mr-2 animate-spin" />}
            {t('accept')}
          </Button>
          <Button variant="outline" onClick={() => respond('REJECT')} disabled={busy !== null}>
            {busy === 'REJECT' && <Loader2 size={16} className="mr-2 animate-spin" />}
            {t('reject')}
          </Button>
          {remaining > 0 && (
            <span className="text-muted-foreground ml-auto inline-flex items-center gap-1 text-xs">
              <Clock size={12} /> {t('expiresIn', { hours: remaining })}
            </span>
          )}
        </div>
      )}

      {item.status === 'ACCEPTED' && item.checkout && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="bg-success-chip rounded-lg px-3 py-2 text-sm text-emerald-800">
            {t('acceptedNotice')}
          </p>
          <Button onClick={() => goToCheckout(item.checkout!)}>{t('pay')}</Button>
        </div>
      )}

      {item.status === 'ACCEPTED' && !item.checkout && !item.orderId && (
        <p className="text-muted-foreground mt-3 text-sm">{t('acceptedExpired')}</p>
      )}

      {(item.status === 'ORDERED' || (item.status === 'ACCEPTED' && item.orderId)) && (
        <p className="mt-3 text-sm">
          <Link
            href={`/profile/orders/${item.orderId}`}
            className="text-brand-crimson hover:underline"
          >
            {t('orderedNotice')}
          </Link>
        </p>
      )}

      {canCancel && (
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={cancel} disabled={busy !== null}>
            {busy === 'CANCEL' ? (
              <Loader2 size={14} className="mr-2 animate-spin" />
            ) : (
              <Trash2 size={14} className="mr-2" />
            )}
            {tc('cancel')}
          </Button>
        </div>
      )}
    </Card>
  );
}
