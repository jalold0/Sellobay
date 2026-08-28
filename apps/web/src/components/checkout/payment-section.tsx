'use client';

// To'lov usuli bo'limi — checkout-flow.tsx'dan ajratilgan (JSX ko'chirildi,
// logika o'zgarmagan). State egasi CheckoutFlow.

import { Banknote, CheckCircle2, CreditCard, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { formatMoney } from '../../lib/format';

import type { PaymentCardDTO, PaymentProvider } from './checkout-types';

// 1d — 4 ta to'lov plitkasi (Karta / Payme / Click / Naqd)
const PAYMENT_TILES: {
  id: PaymentProvider;
  label: 'card' | 'payme' | 'click' | 'cashShort';
  sub: 'cardSub' | 'appConfirm' | 'onReceive';
  Icon: typeof CreditCard;
}[] = [
  { id: 'UZCARD', label: 'card', sub: 'cardSub', Icon: CreditCard },
  { id: 'PAYME', label: 'payme', sub: 'appConfirm', Icon: Smartphone },
  { id: 'CLICK', label: 'click', sub: 'appConfirm', Icon: CheckCircle2 },
  { id: 'CASH_ON_DELIVERY', label: 'cashShort', sub: 'onReceive', Icon: Banknote },
];

interface Props {
  /**
   * GLOBAL buyurtma: naqd to'lov KO'RSATILMAYDI. Tovar mijoz puli bilan Xitoydan
   * sotib olinadi va 15-17 kun yo'lda bo'ladi — eshik oldida rad etilsa zarar bizniki.
   * Server ham rad etadi (`GLOBAL_PREPAID_ONLY`), bu faqat UI tarafi.
   */
  isGlobalOrder?: boolean;
  payment: PaymentProvider;
  onSelectPayment: (p: PaymentProvider) => void;
  total: number;
  cards: PaymentCardDTO[];
  copiedCard: string | null;
  onCopyCard: (num: string) => void;
  receipt: string;
  receiptBusy: boolean;
  onReceiptFile: (file: File | undefined) => void;
  paymentNote: string;
  onPaymentNote: (v: string) => void;
}

export function PaymentSection({
  isGlobalOrder = false,
  payment,
  onSelectPayment,
  total,
  cards,
  copiedCard,
  onCopyCard,
  receipt,
  receiptBusy,
  onReceiptFile,
  paymentNote,
  onPaymentNote,
}: Props) {
  const t = useTranslations('checkout');

  const tiles = isGlobalOrder
    ? PAYMENT_TILES.filter((tile) => tile.id !== 'CASH_ON_DELIVERY')
    : PAYMENT_TILES;

  return (
    <section className="border-border rounded-[18px] border bg-white p-6 md:p-7">
      <h2 className="text-brand-ink mb-[18px] font-serif text-xl font-semibold">
        {t('payment.methodTitle')}
      </h2>
      {isGlobalOrder && (
        <p className="bg-paper text-brand-ink-soft mb-4 rounded-xl px-4 py-3 text-sm">
          {t('payment.globalPrepaidNote')}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => {
          const active = payment === tile.id;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelectPayment(tile.id)}
              className={`flex flex-col items-center gap-2 rounded-[14px] border-2 px-3.5 py-[18px] transition ${
                active ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/30'
              }`}
            >
              <tile.Icon
                size={22}
                strokeWidth={1.8}
                className={active ? 'text-primary' : 'text-[#3a3a40]'}
              />
              <span className="text-brand-ink text-[12.5px] font-bold">
                {t(`payment.${tile.label}`)}
              </span>
              <span className="text-muted-foreground text-center text-[10.5px] leading-tight">
                {t(`payment.${tile.sub}`)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Karta orqali to'lov — kartalar + chek yuklash */}
      {payment === 'UZCARD' ? (
        <div className="border-primary/30 bg-primary/[0.03] mt-4 space-y-4 rounded-[14px] border p-4">
          <div>
            <h3 className="text-brand-ink text-sm font-bold">{t('payment.cardTransferTitle')}</h3>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {t('payment.cardTransferHint')}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 text-sm">
            <span className="text-muted-foreground">{t('payment.amountToTransfer')}</span>
            <span className="text-brand-ink font-bold">{formatMoney(total)}</span>
          </div>

          <div className="space-y-2">
            {cards.map((c) => (
              <div
                key={c.number}
                className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-brand-ink font-mono text-[15px] font-semibold tracking-wide">
                    {c.number}
                  </div>
                  <div className="text-muted-foreground truncate text-[11px]">
                    {c.holder}
                    {c.bank ? ` · ${c.bank}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onCopyCard(c.number)}
                  className="text-primary ml-3 shrink-0 text-xs font-semibold hover:underline"
                >
                  {copiedCard === c.number ? t('payment.copied') : t('payment.copyCard')}
                </button>
              </div>
            ))}
          </div>

          {/* Chek yuklash */}
          <div>
            <label
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-semibold transition ${
                receipt
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-border text-brand-ink hover:border-primary/50'
              }`}
            >
              {receiptBusy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : receipt ? (
                <CheckCircle2 size={16} />
              ) : (
                <CreditCard size={16} />
              )}
              {receiptBusy
                ? t('payment.receiptProcessing')
                : receipt
                  ? `${t('payment.receiptUploaded')} · ${t('payment.replaceReceipt')}`
                  : t('payment.uploadReceipt')}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => onReceiptFile(e.target.files?.[0])}
              />
            </label>
            {receipt ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={receipt}
                alt="receipt"
                className="mt-2 max-h-40 rounded-lg border object-contain"
              />
            ) : null}
          </div>

          <div>
            <label className="text-muted-foreground mb-1 block text-xs">
              {t('payment.receiptNoteLabel')}
            </label>
            <input
              type="text"
              value={paymentNote}
              onChange={(e) => onPaymentNote(e.target.value)}
              placeholder={t('payment.receiptNotePlaceholder')}
              maxLength={300}
              className="border-border focus:border-primary w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none"
            />
          </div>
        </div>
      ) : null}

      <div className="text-muted-foreground bg-muted mt-4 flex items-start gap-2 rounded-xl p-3 text-xs">
        <ShieldCheck size={13} className="text-primary mt-0.5 shrink-0" />
        {t('payment.secureNote')}
      </div>
    </section>
  );
}
