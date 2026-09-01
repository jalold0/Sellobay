'use client';

// O'ng ustun — sticky buyurtma xulosasi + Sello Coins toggle + premium karta.
// checkout-flow.tsx'dan ajratilgan (JSX ko'chirildi, logika o'zgarmagan).

import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { formatMoney } from '../../lib/format';
import { COIN_VALUE_SOM, coinsForOrder } from '../../lib/loyalty';
import { productImage } from '../../lib/mock-data';

import type { CartItem } from '../../store/cart';

interface Props {
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  coinDiscount: number;
  total: number;
  redeemableCoins: number;
  useCoins: boolean;
  onToggleCoins: () => void;
  submitting: boolean;
  onPlaceOrder: () => void;
}

export function OrderSummary({
  items,
  subtotal,
  shippingFee,
  coinDiscount,
  total,
  redeemableCoins,
  useCoins,
  onToggleCoins,
  submitting,
  onPlaceOrder,
}: Props) {
  const t = useTranslations('checkout');

  return (
    <aside className="flex flex-col gap-4 lg:self-start">
      <div className="border-border rounded-[18px] border bg-white p-6 md:p-7 lg:sticky lg:top-24">
        <h2 className="text-brand-ink mb-[18px] text-xl font-bold">
          {t('summaryTitle', { count: items.length })}
        </h2>

        <ul className="flex flex-col gap-3.5">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3.5">
              <div className="bg-soft relative h-[72px] w-[60px] shrink-0 overflow-hidden rounded-[10px]">
                <Image
                  src={i.imageUrl ?? productImage(i.imageSeed, 120)}
                  alt={i.name}
                  fill
                  sizes="60px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-brand-ink line-clamp-2 text-[13px] font-semibold leading-[1.35]">
                  {i.name}
                </div>
                <div className="mt-1 text-[11.5px] text-[#9a9aa2]">
                  {t('pcs', { count: i.quantity })}
                </div>
              </div>
              <span className="text-brand-ink whitespace-nowrap text-[13.5px] font-extrabold">
                {formatMoney(i.quantity * i.unitPrice)}
              </span>
            </li>
          ))}
        </ul>

        {/* Sello Coins toggle — dashed-gold chip uslubida */}
        {redeemableCoins > 0 && (
          <button
            type="button"
            onClick={onToggleCoins}
            className={`mt-5 flex w-full items-center gap-2.5 rounded-xl border-[1.5px] p-3 text-left text-[13px] font-semibold transition ${
              useCoins
                ? 'border-brand-gold bg-promo text-brand-gold-text'
                : 'border-brand-gold bg-promo text-brand-gold-text hover:bg-promo/70 border-dashed'
            }`}
          >
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                useCoins ? 'border-brand-gold bg-brand-gold text-white' : 'border-brand-gold'
              }`}
            >
              {useCoins ? <CheckCircle2 size={12} /> : null}
            </span>
            <span className="flex-1">
              {t('useCoinsAvail', {
                coins: redeemableCoins,
                som: formatMoney(redeemableCoins * COIN_VALUE_SOM),
              })}
            </span>
          </button>
        )}

        {/* Totallar */}
        <div className="border-border mt-5 flex flex-col gap-2.5 border-t pt-[18px] text-[13.5px] text-[#4a4a52]">
          <div className="flex justify-between">
            <span>{t('summaryItemsCount', { count: items.length })}</span>
            <span className="text-brand-ink font-semibold">{formatMoney(subtotal)}</span>
          </div>
          {coinDiscount > 0 && (
            <div className="flex justify-between">
              <span>{t('coinDiscount')}</span>
              <span className="text-primary font-semibold">− {formatMoney(coinDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{t('summaryShipping')}</span>
            <span className="text-brand-ink font-semibold">
              {shippingFee === 0 ? t('shipping.freeBepul') : formatMoney(shippingFee)}
            </span>
          </div>
          <div className="border-border flex items-baseline justify-between border-t pt-3">
            <span className="text-brand-ink text-[14.5px] font-bold">{t('summaryTotal')}</span>
            <span className="text-brand-ink text-2xl font-bold">{formatMoney(total)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onPlaceOrder}
          disabled={submitting}
          className="bg-primary hover:bg-primary/90 mt-[22px] flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full text-[15px] font-bold text-white transition disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {t('goToPayment')}
              <ArrowRight size={16} strokeWidth={2.2} />
            </>
          )}
        </button>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-[#9a9aa2]">
          <ShieldCheck size={13} />
          {t('sslNote')}
        </div>
      </div>

      {/* Premium ball karta */}
      <div className="bg-brand-ink flex items-center gap-3 rounded-2xl px-5 py-4">
        <span className="text-brand-gold text-lg">◆</span>
        <span className="text-[12.5px] leading-[1.5] text-white/85">
          {t('premiumPoints', { points: coinsForOrder(total) })}
        </span>
      </div>
    </aside>
  );
}
