'use client';

import { toast } from '@ecom/ui';
import { Loader2, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

/**
 * Yetkazilgan buyurtmani qaytarishni so'rash (audit FUN-07). API (`/api/orders/[id]/return`)
 * bor edi, lekin web'da chaqirilmasdi — faqat Flutter'da edi.
 *
 * Oynani SERVER hisoblaydi (`returnable`, ADR 0015: yetkazilgandan 10 kun) — biz unga
 * ishonamiz. Bosilganda brauzer `confirm()` emas, shu yerda panel ochiladi: nima bo'lishi,
 * ixtiyoriy sabab va aniq fe'lli tugma.
 */
export function ReturnRequest({
  orderId,
  returnable,
  delivered,
  windowDays,
  onDone,
}: {
  orderId: string;
  returnable: boolean;
  delivered: boolean;
  windowDays: number;
  onDone: () => void | Promise<void>;
}) {
  const t = useTranslations('profile.ordersPage');
  const reasonId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  if (!returnable) {
    // Yetkazilgan, lekin muddat o'tgan — sababini aytamiz (Flutter'dagi kabi).
    return delivered && windowDays > 0 ? (
      <p className="text-muted-foreground text-xs">{t('returnWindow', { days: windowDays })}</p>
    ) : null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const json = (await res.json()) as { success: boolean; error?: { message?: string } };
      if (json.success) {
        toast({ title: t('returnRequested'), variant: 'success' });
        setOpen(false);
        await onDone();
      } else {
        toast({ title: json.error?.message ?? 'Xato', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Xato', variant: 'destructive' });
    }
    setBusy(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border text-brand-ink hover:bg-muted inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-5 py-2.5 text-[13px] font-bold transition"
      >
        <RotateCcw size={15} aria-hidden /> {t('requestReturn')}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="border-border rounded-[18px] border bg-white p-6">
      <div className="text-brand-ink text-sm font-bold">{t('requestReturn')}</div>
      <p className="text-muted-foreground mt-2 text-[13px] leading-[1.55]">{t('returnHint')}</p>
      <label htmlFor={reasonId} className="text-brand-ink mb-1.5 mt-4 block text-xs font-semibold">
        {t('returnReasonLabel')}
      </label>
      <textarea
        id={reasonId}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={300}
        rows={3}
        placeholder={t('returnReasonPlaceholder')}
        className="border-border text-brand-ink focus:border-primary focus:ring-primary/15 placeholder:text-muted-foreground w-full resize-none rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:ring-2"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="bg-primary hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-bold text-white transition disabled:opacity-60"
        >
          {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
          {t('returnSubmit')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="text-brand-ink rounded-full px-4 py-2.5 text-[13px] font-semibold hover:underline"
        >
          {t('returnKeep')}
        </button>
      </div>
    </form>
  );
}
