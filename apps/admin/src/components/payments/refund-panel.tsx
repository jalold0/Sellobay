'use client';

// Pul qaytarilishi kerak bo'lgan buyurtma (bekor qilingan yoki qaytarilgan, to'langan).
//
// Pulning o'zi Click/Payme kabinetida, kartaga o'tkazma yoki naqd qaytariladi — bu forma
// faqat QAYD ETADI. Shuning uchun tugma «qaytarish» emas, «qayd etish» deydi: admin pulni
// tugma yuboradi deb o'ylamasin.

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@ecom/ui';
import { Undo2 } from 'lucide-react';
import * as React from 'react';

import { recordRefund, type RefundMethod } from '../../lib/auth/client';
import { formatMoney } from '../../lib/format';
import { normalizeAmountInput } from './verify-payment-form';

/** Kabinet nomi odamlar yozganidek (enum katta harfda keladi). */
const GATEWAY_NAMES: Record<string, string> = { CLICK: 'Click', PAYME: 'Payme' };

const METHODS: Record<RefundMethod, string> = {
  GATEWAY: 'Click/Payme kabineti orqali',
  CARD_TRANSFER: 'Kartaga o‘tkazma',
  CASH: 'Naqd',
};

interface RefundPanelProps {
  orderId: string;
  remaining: string;
  refundedTotal: string;
  /** To'lov provayderi — Click/Payme bo'lsa usul shunga mos tanlanadi. */
  provider: string;
  onDone: () => void;
}

export function RefundPanel({
  orderId,
  remaining,
  refundedTotal,
  provider,
  onDone,
}: RefundPanelProps) {
  // "410000.00" → "410000": admin kabinetdagi summa bilan solishtiradi, tiyin nol bo'lsa ko'rsatmaymiz.
  const [amount, setAmount] = React.useState(remaining.replace(/\.00$/, ''));
  const gateway = GATEWAY_NAMES[provider];
  const [method, setMethod] = React.useState<RefundMethod>(
    provider in GATEWAY_NAMES ? 'GATEWAY' : 'CARD_TRANSFER',
  );
  const [reference, setReference] = React.useState('');
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = normalizeAmountInput(amount);
    if (!confirm(`${formatMoney(Number(value))} qaytarilgani qayd etilsinmi?`)) return;
    setBusy(true);
    const res = await recordRefund(orderId, {
      amount: value,
      method,
      reference: reference.trim() || undefined,
      note: note.trim() || undefined,
    });
    setBusy(false);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Qaytarilgan pul qayd etildi',
      description: res.data.fullyRefunded
        ? 'Pul to‘liq qaytarildi — buyurtma «Pul qaytarildi» holatida'
        : `Jami qaytarilgan: ${formatMoney(Number(res.data.refundedTotal))}`,
      variant: 'success',
    });
    onDone();
  };

  return (
    <Alert variant="destructive">
      <Undo2 className="h-4 w-4" />
      <AlertTitle>Mijozga {formatMoney(Number(remaining))} qaytarilishi kerak</AlertTitle>
      <AlertDescription>
        <p className="mt-1 text-sm">
          Pulni {gateway ? `${gateway} kabinetida` : 'mijozga'} qaytaring, keyin shu yerda qayd
          eting.
          {Number(refundedTotal) > 0
            ? ` Avval qaytarilgan: ${formatMoney(Number(refundedTotal))}.`
            : ''}
        </p>
        <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={`refund-amount-${orderId}`} className="text-xs">
              Qaytarilgan summa (so‘m)
            </Label>
            <Input
              id={`refund-amount-${orderId}`}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Qanday qaytarildi</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as RefundMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(METHODS) as RefundMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {METHODS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`refund-ref-${orderId}`} className="text-xs">
              Tranzaksiya raqami (ixtiyoriy)
            </Label>
            <Input
              id={`refund-ref-${orderId}`}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`refund-note-${orderId}`} className="text-xs">
              Izoh (ixtiyoriy)
            </Label>
            <Input
              id={`refund-note-${orderId}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? 'Qayd etilmoqda…' : 'Qaytarilgan pulni qayd etish'}
            </Button>
          </div>
        </form>
      </AlertDescription>
    </Alert>
  );
}
