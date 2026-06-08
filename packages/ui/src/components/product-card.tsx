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

// Badge ranglari TZ §4 ga muvofiq
const BADGE_CFG: Record<NonNullable<ProductCardProps['badge']>, { label: string; bg: string }> = {
  NEW: { label: 'NEW', bg: 'bg-blue-600' },
  SALE: { label: 'SALE', bg: 'bg-primary' },
  TOP: { label: 'TOP', bg: 'bg-gradient-to-br from-amber-400 to-amber-600' },
};

// Deterministik price format — TZ §4: chiziqli eski narx + qizil yangi narx
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
  // eslint-disable-next-line @next/next/no-img-element
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

  return (
    <div
      className={cn(
        'bg-card duration-250 group relative flex flex-col overflow-hidden rounded-2xl transition-all',
        'border-border/60 hover:border-border border',
        'hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.14)]',
        !inStock && 'opacity-70',
        className,
      )}
    >
      {/* Image area — clean white bg */}
      <LinkComponent
        href={href}
        className="bg-muted/30 relative block aspect-square overflow-hidden"
      >
        <ImageComponent
          src={imageUrl}
          alt={name}
          width={400}
          height={400}
          className="duration-400 h-full w-full object-cover transition-transform ease-out group-hover:scale-[1.08]"
        />

        {/* Top-left badges — TZ §4: SALE/NEW/TOP + chegirma foizi */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {badgeCfg && (
            <span
              className={cn(
                'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm',
                badgeCfg.bg,
              )}
            >
              {badgeCfg.label}
            </span>
          )}
          {discountPct > 0 && (
            <span className="bg-brand-red-dark rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-sm">
              −{discountPct}%
            </span>
          )}
        </div>

        {/* Top-right: Wishlist */}
        {onToggleWishlist && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWishlist();
            }}
            className={cn(
              'absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full shadow-sm transition',
              isWishlisted
                ? 'bg-primary hover:bg-primary/90 text-white'
                : 'text-foreground hover:text-primary bg-white/95 hover:bg-white',
            )}
            aria-label="Wishlist"
          >
            <Heart size={16} className={isWishlisted ? 'fill-current' : ''} />
          </button>
        )}

        {/* Center hover overlay: Quick view + Sliding "Add to cart" */}
        {inStock && (
          <>
            {onQuickView && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onQuickView();
                }}
                className={cn(
                  'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                  'text-foreground flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold shadow-lg',
                  'opacity-0 transition-all duration-300 ease-out',
                  'group-hover:opacity-100',
                )}
              >
                <Eye size={14} /> Tez ko&apos;rish
              </button>
            )}
          </>
        )}

        {/* Out of stock overlay */}
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-foreground rounded-full bg-white/95 px-4 py-1.5 text-xs font-semibold">
              Mavjud emas
            </div>
          </div>
        )}

        {/* Sliding "Add to cart" from bottom — TZ §4 */}
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
              'bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold shadow-lg',
              'translate-y-full transition-transform duration-300 ease-out',
              'group-hover:translate-y-0',
            )}
          >
            <ShoppingBag size={15} />
            Savatga qo&apos;shish
          </button>
        )}
      </LinkComponent>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {brand && (
          <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
            {brand}
          </div>
        )}
        <LinkComponent
          href={href}
          className="text-foreground hover:text-primary line-clamp-2 text-sm font-semibold leading-snug transition"
        >
          {name}
        </LinkComponent>

        {/* Rating */}
        {rating !== undefined && (
          <div className="flex items-center gap-1 text-xs">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={11}
                  className={
                    i <= Math.round(rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-muted text-muted'
                  }
                />
              ))}
            </div>
            <span className="text-muted-foreground">({reviewCount ?? 0})</span>
          </div>
        )}

        {/* Price — TZ §4: chiziqli eski narx + qizil yangi narx */}
        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-2">
            {oldPrice && oldPrice > price && (
              <span className="text-muted-foreground text-[11px] line-through">
                {formatPrice(oldPrice, currency)}
              </span>
            )}
          </div>
          <div
            className={cn(
              'text-lg font-bold leading-tight',
              oldPrice && oldPrice > price ? 'text-primary' : 'text-foreground',
            )}
          >
            {formatPrice(price, currency)}
          </div>
        </div>

        {/* Low-stock progress bar — TZ §5: "Faqat X ta qoldi!" */}
        {lowStock && inStock && (
          <div className="mt-1 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-medium">
              <span className="text-primary">Faqat {stockLeft} ta qoldi!</span>
            </div>
            <div className="bg-muted h-1 overflow-hidden rounded-full">
              <div
                className="from-brand-orange to-primary h-full rounded-full bg-gradient-to-r"
                style={{ width: `${stockBarPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
