import { Heart, ShoppingCart } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/cn';
import { Badge } from './badge';
import { Button } from './button';
import { Rating } from './rating';

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
  className?: string;
  onAddToCart?: () => void;
  onToggleWishlist?: () => void;
  LinkComponent?: React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>;
  ImageComponent?: React.ComponentType<{ src: string; alt: string; className?: string; width?: number; height?: number }>;
}

const badgeStyles: Record<NonNullable<ProductCardProps['badge']>, { label: string; className: string }> = {
  NEW: { label: 'NEW', className: 'bg-emerald-500 hover:bg-emerald-500' },
  SALE: { label: 'SALE', className: 'bg-red-500 hover:bg-red-500' },
  TOP: { label: 'TOP', className: 'bg-amber-500 hover:bg-amber-500' },
};

// Deterministik formatter — SSR/CSR ICU farqlariga moyil emas.
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

const NativeImage = (props: { src: string; alt: string; className?: string; width?: number; height?: number }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={props.src} alt={props.alt} width={props.width} height={props.height} className={props.className} />
);

export function ProductCard({
  name,
  brand,
  imageUrl,
  href,
  price,
  oldPrice,
  currency = 'UZS',
  locale = 'uz-UZ',
  rating,
  reviewCount,
  badge,
  inStock = true,
  className,
  onAddToCart,
  onToggleWishlist,
  LinkComponent = NativeLink,
  ImageComponent = NativeImage,
}: ProductCardProps) {
  const discountPct = oldPrice && oldPrice > price ? Math.round(100 - (price / oldPrice) * 100) : 0;
  const badgeCfg = badge ? badgeStyles[badge] : null;

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg',
        !inStock && 'opacity-70',
        className,
      )}
    >
      <LinkComponent href={href} className="relative block aspect-square overflow-hidden bg-muted">
        <ImageComponent
          src={imageUrl}
          alt={name}
          width={400}
          height={400}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {badgeCfg && <Badge className={cn('rounded-md text-white shadow', badgeCfg.className)}>{badgeCfg.label}</Badge>}
          {discountPct > 0 && (
            <Badge className="rounded-md bg-rose-600 text-white shadow hover:bg-rose-600">−{discountPct}%</Badge>
          )}
        </div>
        {!inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-foreground">
              Mavjud emas
            </span>
          </div>
        )}
        {onToggleWishlist && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleWishlist();
            }}
            className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-foreground shadow-sm transition hover:bg-white hover:text-rose-500"
            aria-label="Wishlist"
          >
            <Heart size={16} />
          </button>
        )}
      </LinkComponent>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {brand && (
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{brand}</div>
        )}
        <LinkComponent href={href} className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary">
          {name}
        </LinkComponent>

        {rating !== undefined && (
          <Rating value={rating} reviewCount={reviewCount} size={12} className="-mt-1" />
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col">
            {oldPrice && oldPrice > price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(oldPrice, currency)}
              </span>
            )}
            <span className={cn('text-base font-bold', oldPrice && 'text-rose-600')}>
              {formatPrice(price, currency)}
            </span>
          </div>
          {onAddToCart && inStock && (
            <Button
              type="button"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                onAddToCart();
              }}
              className="h-9 w-9 rounded-full p-0"
              aria-label="Add to cart"
            >
              <ShoppingCart size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
