// "Havola orqali buyurtma" formasi — mijoz Taobao/1688 havolasini yuboradi.
// Havola to'g'riligi core-domain'dagi AYNAN SHU parser bilan tekshiriladi (server ham shuni ishlatadi),
// shuning uchun mijoz serverga bormasdan darhol xatoni ko'radi.

'use client';

import { parseSourcingLink } from '@ecom/core-domain';
import { Button, Card, Input, Label, Textarea } from '@ecom/ui';
import { Link2, Loader2, Plane, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import type { ApiEnvelope, FreightMode, SourcingRequestView } from './sourcing-types';

interface Props {
  onCreated: (request: SourcingRequestView, duplicate: boolean) => void;
}

const LINK_ERROR_KEY = {
  INVALID_URL: 'invalidUrl',
  UNSUPPORTED_HOST: 'unsupportedHost',
  NO_ITEM_ID: 'noItemId',
} as const;

export function SourcingForm({ onCreated }: Props) {
  const t = useTranslations('global.form');
  const tMode = useTranslations('global.mode');

  const [url, setUrl] = React.useState('');
  const [qty, setQty] = React.useState(1);
  const [freightMode, setFreightMode] = React.useState<FreightMode>('AUTO');
  const [variantNote, setVariantNote] = React.useState('');
  const [customerNote, setCustomerNote] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Kiritish paytida jonli tekshiruv (server chaqirilmaydi)
  const linkCheck = React.useMemo(() => (url.trim() ? parseSourcingLink(url) : null), [url]);
  const linkError =
    linkCheck && !linkCheck.ok ? t(`error.${LINK_ERROR_KEY[linkCheck.error]}`) : null;
  const canSubmit = Boolean(linkCheck?.ok) && qty >= 1 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/global/sourcing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          qty,
          freightMode,
          variantNote: variantNote.trim() || undefined,
          customerNote: customerNote.trim() || undefined,
        }),
      });
      const body: ApiEnvelope<{ request: SourcingRequestView; duplicate: boolean }> =
        await res.json();

      if (!res.ok || !body.success || !body.data) {
        setError(body.error?.message ?? t('error.generic'));
        return;
      }

      onCreated(body.data.request, body.data.duplicate);
      setUrl('');
      setQty(1);
      setVariantNote('');
      setCustomerNote('');
    } catch {
      setError(t('error.network'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5 md:p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="sourcing-url">{t('urlLabel')}</Label>
          <div className="relative">
            <Link2
              size={16}
              className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            />
            <Input
              id="sourcing-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('urlPlaceholder')}
              className="pl-9"
              inputMode="url"
              autoComplete="off"
            />
          </div>
          {linkError ? (
            <p className="text-brand-crimson text-sm">{linkError}</p>
          ) : linkCheck?.ok && linkCheck.needsResolve ? (
            <p className="text-brand-gold-text text-sm">{t('shortLinkNotice')}</p>
          ) : (
            <p className="text-muted-foreground text-sm">{t('urlHint')}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sourcing-qty">{t('qtyLabel')}</Label>
            <Input
              id="sourcing-qty"
              type="number"
              min={1}
              max={999}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('modeLabel')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['AUTO', 'AVIA'] as const).map((mode) => {
                const Icon = mode === 'AUTO' ? Truck : Plane;
                const active = freightMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFreightMode(mode)}
                    aria-pressed={active}
                    className={[
                      'flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition',
                      active
                        ? 'border-brand-crimson bg-crimson-chip'
                        : 'border-border hover:border-brand-crimson/40',
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <Icon size={14} /> {tMode(mode)}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {tMode(`${mode}Hint`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sourcing-variant">{t('variantLabel')}</Label>
          <Input
            id="sourcing-variant"
            value={variantNote}
            onChange={(e) => setVariantNote(e.target.value)}
            placeholder={t('variantPlaceholder')}
            maxLength={300}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sourcing-note">{t('noteLabel')}</Label>
          <Textarea
            id="sourcing-note"
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            placeholder={t('notePlaceholder')}
            rows={3}
            maxLength={1000}
          />
        </div>

        {error && (
          <p className="bg-crimson-chip text-brand-crimson rounded-lg px-3 py-2 text-sm">{error}</p>
        )}

        <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
          {submitting && <Loader2 size={16} className="mr-2 animate-spin" />}
          {t('submit')}
        </Button>
      </form>
    </Card>
  );
}
