import { Eye, Heart, ShoppingBag, Star } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/cn';

export interface ProductCardProps {
  name: string;
  brand?: string;
  imageUrl: string;
  href: string;
  price: number;
  oldPrice?: number;
  currency?: string;
  locale?: string;
  rating?: number;
  reviewCount?: number;
  badge?: 'NEW' | 'SALE' | 'TOP';
  inStock?: boolean;
  stockLeft?: number; // "Faqat 5 ta qoldi!" — TZ §5
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

// Badge pill'lari — redesign: SALE=crimson/oq, TOP=gold/crimson-deep, NEW=ink/gold-light
const BADGE_CFG: Record<NonNullable<ProductCardProps['badge']>, { label: string; cls: string }> = {
  NEW: { label: 'NEW', cls: 'bg-brand-ink text-brand-gold-light' },
  SALE: { label: 'SALE', cls: 'bg-primary text-white' },
  TOP: { label: 'TOP', cls: 'bg-brand-gold text-brand-crimson-deep' },
};

// Deterministik price format — chiziqli eski narx + crimson yangi narx
function formatPrice(value: number, currency = 'UZS'): string {
  const fixed = Math.abs(Math.trunc(value)).toString();
  const grouped = fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const num = value < 0 ? `-${grouped}` : grouped;
  if (currency === 'UZS') return `${num} so'm`;
  if (currency === 'USD') return `$${num}`;
  if (currency === 'EUR') return `€${num}`;
  return `${num} ${currency}`;
}

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
  className,
  onAddToCart,
  onToggleWishlist,
  onQuickView,
  isWishlisted = false,
  LinkComponent = NativeLink,
  ImageComponent = NativeImage,
}: ProductCardProps) {
  const discountPct = oldPrice && oldPrice > price ? Math.round(100 - (price / oldPrice) * 100) : 0;
  const badgeCfg = badge ? BADGE_CFG[badge] : null;
  const lowStock = stockLeft !== undefined && stockLeft > 0 && stockLeft <= 5;
  const stockBarPct = stockLeft !== undefined ? Math.min(100, (stockLeft / 20) * 100) : 0;
  const discounted = Boolean(oldPrice && oldPrice > price);

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
      {/* Image — 4/5, soft fon */}
      <LinkComponent href={href} className="bg-soft relative block aspect-[4/5] overflow-hidden">
        <ImageComponent
          src={imageUrl}
          alt={name}
          width={400}
          height={500}
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
          {discountPct > 0 && (
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
            aria-label="Wishlist"
          >
            <Heart size={16} strokeWidth={1.8} className={isWishlisted ? 'fill-current' : ''} />
          </button>
        )}

        {/* Hover: tez ko'rish */}
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
            <Eye size={14} /> Tez ko&apos;rish
          </button>
        )}

        {/* Out of stock overlay */}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-brand-ink rounded-full bg-white/95 px-4 py-1.5 text-xs font-semibold">
              Mavjud emas
            </div>
          </div>
        )}

        {/* Hover: pastdan chiquvchi "Savatga qo'shish" */}
        {onAddToCart && inStock && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart();
            }}
            className={cn(
              'absolute inset-x-0 bottom-0 flex items-center justify-center gap-2',
              'bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg',
              'translate-y-full transition-transform duration-300 ease-out',
              'group-hover:translate-y-0',
            )}
          >
            <ShoppingBag size={15} />
            Savatga qo&apos;shish
          </button>
        )}
      </LinkComponent>

      {/* Card body — 16px padding */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {brand && (
          <div className="text-muted-foreground text-[10.5px] font-bold uppercase tracking-[0.14em]">
            {brand}
          </div>
        )}
        <LinkComponent
          href={href}
          className="text-brand-ink hover:text-primary line-clamp-2 text-sm font-semibold leading-[1.4] transition"
        >
          {name}
        </LinkComponent>

        {/* Rating — bitta gold yulduz + ball + (soni) */}
        {rating !== undefined && (
          <div className="flex items-center gap-[5px] text-xs">
            <Star size={12} className="fill-brand-gold text-brand-gold" />
            <span className="text-brand-ink font-bold">{rating.toFixed(1)}</span>
            <span className="text-[#9a9aa2]">({reviewCount ?? 0})</span>
          </div>
        )}

        {/* Narx — chegirmada crimson + chiziqli eski narx */}
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span
            className={cn(
              'text-[15.5px] font-extrabold leading-tight',
              discounted ? 'text-primary' : 'text-brand-ink',
            )}
          >
            {formatPrice(price, currency)}
          </span>
          {discounted && (
            <span className="text-[12.5px] text-[#9a9aa2] line-through">
              {formatPrice(oldPrice as number, currency)}
            </span>
          )}
        </div>

        {/* Low-stock progress bar — "Faqat X ta qoldi!" */}
        {lowStock && inStock && (
          <div className="mt-1 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-medium">
              <span className="text-primary">Faqat {stockLeft} ta qoldi!</span>
            </div>
            <div className="bg-chip h-1 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${stockBarPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
