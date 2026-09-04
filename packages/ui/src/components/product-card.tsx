import { Eye, Heart, ShoppingBag, Star, Truck } from 'lucide-react';
import * as React from 'react';

import { discountPercent, formatMoney, type CurrencyCode } from '@ecom/utils';

import { cn } from '../lib/cn';

// UI paketi i18n kontekstiga ega emas — barcha user-facing matn chaqiruvchidan keladi
export interface ProductCardLabels {
  quickView: string;
  outOfStock: string;
  addToCart: string;
  onlyLeft: string; // chaqiruvchi count bilan formatlab beradi
  wishlist: string; // aria-label
  freeShipping: string;
}

export interface ProductCardProps {
  name: string;
  brand?: string;
  imageUrl: string;
  href: string;
  price: number;
  oldPrice?: number;
  currency?: CurrencyCode;
  locale?: string;
  rating?: number;
  reviewCount?: number;
  badge?: 'NEW' | 'SALE' | 'TOP';
  inStock?: boolean;
  stockLeft?: number; // low-stock indikator — TZ §5
  /** Narx bepul yetkazish chegarasidan oshganda — chaqiruvchi hisoblaydi (core-domain). */
  freeShipping?: boolean;
  labels: ProductCardLabels;
  className?: string;
  onAddToCart?: () => void;
  onToggleWishlist?: () => void;
  onQuickView?: () => void;
  isWishlisted?: boolean;
  LinkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
  }>;
  ImageComponent?: React.ComponentType<{
    src: string;
    alt: string;
    className?: string;
    width?: number;
    height?: number;
  }>;
}

// Badge pill'lari — SALE=crimson/oq, TOP=gold/crimson-deep, NEW=ink/gold-light
const BADGE_CFG: Record<NonNullable<ProductCardProps['badge']>, { label: string; cls: string }> = {
  NEW: { label: 'NEW', cls: 'bg-brand-ink text-brand-gold-light' },
  SALE: { label: 'SALE', cls: 'bg-primary text-white' },
  TOP: { label: 'TOP', cls: 'bg-brand-gold text-brand-crimson-deep' },
};

// Narx formatlash va chegirma foizi @ecom/utils da — savat, mahsulot sahifasi
// va karta BIR XIL satr chiqarishi uchun. Ilgari bu yerda alohida nusxa turardi
// va u oddiy probel ishlatardi (utils esa uzilmas probel), ya'ni kartada narx
// satr oxirida bo'linib ketishi mumkin edi.

const NativeLink = (props: { href: string; className?: string; children: React.ReactNode }) => (
  <a href={props.href} className={props.className}>
    {props.children}
  </a>
);

const NativeImage = (props: {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}) => (
  <img
    src={props.src}
    alt={props.alt}
    width={props.width}
    height={props.height}
    className={props.className}
  />
);

/**
 * Marketpleys uslubidagi mahsulot kartasi.
 *
 * Tartib ATAYLAB shunday: rasm -> NARX -> nom -> reyting -> yetkazish -> tugma.
 * Butik saytlarida odatda nom narxdan oldin turadi, lekin marketpleysda
 * xaridor birinchi navbatda narxni solishtiradi (Uzum, Ozon, Wildberries —
 * uchalasida ham narx nomdan yuqorida). Skanerlash tezligi shundan oshadi.
 *
 * "Savatga qo'shish" hover'da EMAS, doim ko'rinadi: hover sensorli ekranda
 * umuman yo'q, ya'ni telefonda tugma topilmay qolardi.
 */
export function ProductCard({
  name,
  brand,
  imageUrl,
  href,
  price,
  oldPrice,
  currency = 'UZS',
  rating,
  reviewCount,
  badge,
  inStock = true,
  stockLeft,
  freeShipping = false,
  labels,
  className,
  onAddToCart,
  onToggleWishlist,
  onQuickView,
  isWishlisted = false,
  LinkComponent = NativeLink,
  ImageComponent = NativeImage,
}: ProductCardProps) {
  const discountPct = discountPercent(price, oldPrice);
  const badgeCfg = badge ? BADGE_CFG[badge] : null;
  const lowStock = stockLeft !== undefined && stockLeft > 0 && stockLeft <= 5;
  const stockBarPct = stockLeft !== undefined ? Math.min(100, (stockLeft / 20) * 100) : 0;
  const discounted = discountPct > 0;

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl bg-white transition-all duration-[250ms] ease-out',
        'border-border border',
        'hover:shadow-card-hover hover:-translate-y-1',
        !inStock && 'opacity-70',
        className,
      )}
    >
      {/* Rasm — kvadrat. Katalog zichligi 4/5 dan yuqori: bir ekranda ko'proq
          mahsulot ko'rinadi va qatorlar bir tekis tushadi. */}
      <LinkComponent href={href} className="bg-soft relative block aspect-square overflow-hidden">
        <ImageComponent
          src={imageUrl}
          alt={name}
          width={400}
          height={400}
          className="duration-400 h-full w-full object-cover transition-transform ease-out group-hover:scale-[1.05]"
        />

        {/* Top-left badge pill'lar */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {badgeCfg && (
            <span
              className={cn(
                'rounded-full px-2.5 py-[5px] text-[10px] font-extrabold uppercase tracking-[0.1em]',
                badgeCfg.cls,
              )}
            >
              {badgeCfg.label}
            </span>
          )}
          {discounted && (
            <span className="bg-primary rounded-full px-2.5 py-[5px] text-[10px] font-extrabold tracking-[0.1em] text-white">
              −{discountPct}%
            </span>
          )}
        </div>

        {/* Top-right: Wishlist doira 34px */}
        {onToggleWishlist && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWishlist();
            }}
            className={cn(
              'absolute right-2.5 top-2.5 grid h-[34px] w-[34px] place-items-center rounded-full transition',
              isWishlisted
                ? 'bg-primary hover:bg-primary/90 text-white'
                : 'text-brand-ink hover:text-primary bg-white/[0.92] hover:bg-white',
            )}
            aria-label={labels.wishlist}
          >
            <Heart size={16} strokeWidth={1.8} className={isWishlisted ? 'fill-current' : ''} />
          </button>
        )}

        {/* Hover: tez ko'rish (ixtiyoriy — faqat onQuickView berilganda) */}
        {inStock && onQuickView && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickView();
            }}
            className={cn(
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
              'text-brand-ink flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold shadow-lg',
              'opacity-0 transition-all duration-300 ease-out',
              'group-hover:opacity-100',
            )}
          >
            <Eye size={14} /> {labels.quickView}
          </button>
        )}

        {/* Out of stock overlay */}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-brand-ink rounded-full bg-white/95 px-4 py-1.5 text-xs font-semibold">
              {labels.outOfStock}
            </div>
          </div>
        )}
      </LinkComponent>

      {/* Karta tanasi */}
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {/* 1. NARX — eng katta va eng yuqorida */}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className={cn(
              'text-[17px] font-extrabold leading-tight tracking-[-0.01em]',
              discounted ? 'text-primary' : 'text-brand-ink',
            )}
          >
            {formatMoney(price, currency)}
          </span>
          {discounted && (
            <span className="text-[12.5px] text-[#9a9aa2] line-through">
              {formatMoney(oldPrice as number, currency)}
            </span>
          )}
        </div>

        {/* 2. Brend + nom */}
        {brand && (
          <div className="text-muted-foreground text-[10.5px] font-bold uppercase tracking-[0.14em]">
            {brand}
          </div>
        )}
        <LinkComponent
          href={href}
          className="text-brand-ink hover:text-primary line-clamp-2 text-[13.5px] font-medium leading-[1.35] transition"
        >
          {name}
        </LinkComponent>

        {/* 3. Reyting FAQAT haqiqiy sharh bo'lganda ko'rsatiladi.
            Sharhsiz "0.0 ★ (0)" yozish mahsulotni yomon baholangandek
            ko'rsatadi — aslida uni hali hech kim baholamagan. */}
        {rating !== undefined && (reviewCount ?? 0) > 0 && (
          <div className="flex items-center gap-[5px] text-xs">
            <Star size={12} className="fill-brand-gold text-brand-gold" />
            <span className="text-brand-ink font-bold">{rating.toFixed(1)}</span>
            <span className="text-[#9a9aa2]">({reviewCount ?? 0})</span>
          </div>
        )}

        {/* 4. Bepul yetkazish — chegara core-domain'dan, to'qima emas */}
        {freeShipping && (
          <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-700">
            <Truck size={13} strokeWidth={2} />
            {labels.freeShipping}
          </div>
        )}

        {/* 5. Low-stock progress bar — "Faqat X ta qoldi!" */}
        {lowStock && inStock && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-medium">
              <span className="text-primary">{labels.onlyLeft}</span>
            </div>
            <div className="bg-chip h-1 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${stockBarPct}%` }}
              />
            </div>
          </div>
        )}

        {/* 6. Savatga qo'shish — doim ko'rinadi (hover sensorli ekranda yo'q) */}
        {onAddToCart && inStock && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart();
            }}
            className={cn(
              'mt-auto flex items-center justify-center gap-2 rounded-xl pt-0',
              'bg-chip text-brand-ink hover:bg-primary px-4 py-2.5 text-[13px] font-bold hover:text-white',
              'transition-colors duration-200',
            )}
          >
            <ShoppingBag size={15} />
            {labels.addToCart}
          </button>
        )}
      </div>
    </div>
  );
}
