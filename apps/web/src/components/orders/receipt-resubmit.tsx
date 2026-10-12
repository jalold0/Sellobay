'use client';

// Karta cheki rad etilgan buyurtma — mijoz yangi chek yuboradi (audit O4).
//
// Muddat ko'rsatiladi: K4 qoidasi bo'yicha rad etilgandan 24 soat o'tsa buyurtma avtomatik
// bekor qilinadi. Chek checkout'dagi bilan bir xil yuklanadi (kichraytirib, yopiq saqlanadi).

import { Button, Input, toast } from '@ecom/ui';
import { ImageUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { formatDateTime } from '../../lib/format';
import { uploadReceipt } from '../checkout/receipt-image';

interface ReceiptResubmitProps {
  orderId: string;
  reason: string | null;
  deadline: string | null;
  onSent: () => void;
}

export function ReceiptResubmit({ orderId, reason, deadline, onSent }: ReceiptResubmitProps) {
  const t = useTranslations('profile.orderDetail');
  const [file, setFile] = React.useState<File | null>(null);
  const [note, setNote] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: t('receiptMissing'), variant: 'warning' });
      return;
    }
    setSending(true);
    try {
      const { pathname } = await uploadReceipt(file);
      const res = await fetch(`/api/orders/${orderId}/receipt`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receipt: pathname, note: note.trim() || null }),
      });
      const json = (await res.json()) as { success: boolean; error?: { message?: string } };
      if (!json.success) {
        toast({ title: json.error?.message ?? 'Xato', variant: 'destructive' });
        return;
      }
      toast({ title: t('receiptSent'), variant: 'success' });
      onSent();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Xato', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-[13px] text-red-900">
      <div className="text-[14px] font-bold">{t('receiptRejectedTitle')}</div>
      {reason ? <p className="mt-1">{t('receiptRejectedReason', { reason })}</p> : null}
      <p className="mt-1">
        {deadline
          ? t('receiptRejectedDeadline', { date: formatDateTime(deadline) })
          : t('receiptRejectedHint')}
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="border-border text-brand-ink hover:border-primary inline-flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 font-semibold">
          <ImageUp size={16} />
          <span className="max-w-[180px] truncate">{file ? file.name : t('receiptPick')}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('receiptNote')}
          maxLength={300}
          className="bg-white sm:flex-1"
        />
        <Button type="submit" disabled={sending} className="shrink-0">
          {sending ? t('receiptSending') : t('receiptSubmit')}
        </Button>
      </form>
    </div>
  );
}
