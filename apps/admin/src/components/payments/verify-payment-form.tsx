'use client';

// Karta (UZCARD) to'lovini tekshirish formasi — admin chekdagi summani O'ZI kiritadi.
//
// Kutilgan summa kiritishdan OLDIN ko'rsatilmaydi: maqsad — admin chekka qarab
// raqamni ko'chirishi, buyurtma summasini "tasdiqlash" emas. Yakuniy tekshiruv
// serverda (PATCH /api/orders/[id]/payment) — bu yerdagisi faqat tezkor ogohlantirish.

import { Button, Input, Label } from '@ecom/ui';
import { Check, X } from 'lucide-react';
import * as React from 'react';

import { formatMoney } from '../../lib/format';

/** "1 250 000 so'm", "1,250,000" kabi yozuvni serverga yuboriladigan satrga keltiradi. */
export function normalizeAmountInput(raw: string): string {
  return (
    raw
      .replace(/so['ʻ‘’`]?m/gi, '')
      // `\s` JS'da bo'linmas bo'shliqni (NBSP) ham qamraydi — bank ilovasidan nusxa shunday keladi
      .replace(/[\s,]/g, '')
      .trim()
  );
}

const AMOUNT_RE = /^\d{1,12}(\.\d{1,2})?$/;

interface VerifyPaymentFormProps {
  /** Input id — sahifada noyob bo'lishi kerak (masalan to'lov id'si bilan). */
  inputId: string;
  /** Buyurtma summasi (so'm). */
  expected: number;
  busy: boolean;
  onVerify: (receivedAmount: string) => void;
  onReject: () => void;
}

export function VerifyPaymentForm({
  inputId,
  expected,
  busy,
  onVerify,
  onReject,
}: VerifyPaymentFormProps) {
  const [value, setValue] = React.useState('');
  const amount = normalizeAmountInput(value);
  const valid = AMOUNT_RE.test(amount);
  const matches = valid && Number(amount) === expected;

  return (
    <div className="w-full space-y-2 sm:w-60">
      <Label htmlFor={inputId} className="text-xs">
        Chekdagi summa (so&apos;m)
      </Label>
      <Input
        id={inputId}
        inputMode="decimal"
        autoComplete="off"
        placeholder="Chekdan ko'chiring"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={busy}
      />
      {value.trim() === '' ? (
        <p className="text-muted-foreground text-xs">Tasdiqlashdan oldin summani kiriting</p>
      ) : !valid ? (
        <p className="text-xs text-red-600">Faqat raqam kiriting</p>
      ) : matches ? (
        <p className="text-xs text-emerald-700">Buyurtma summasiga mos</p>
      ) : (
        <p className="text-xs text-red-600">
          Buyurtma summasi {formatMoney(expected)} — mos emas. Tasdiqlab bo&apos;lmaydi.
        </p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onVerify(amount)}
          disabled={busy || !matches}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Check size={14} className="mr-1" />
          {busy ? '...' : 'Tasdiqlash'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onReject}
          disabled={busy}
          className="text-red-600 hover:bg-red-50"
        >
          <X size={14} className="mr-1" /> Rad etish
        </Button>
      </div>
    </div>
  );
}
