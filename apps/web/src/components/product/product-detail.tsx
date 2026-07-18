'use client';

// Mahsulot sahifasi — orkestr: variant tanlash (rang/o'lcham/miqdor), savatga
// qo'shish/ulashish va info ustuni shu yerda. Gallery/Tabs/StickyBar alohida
// komponentlarda (product-gallery, product-tabs, sticky-cart-bar).
import { Badge, Button, Rating, toast } from '@ecom/ui';
import {
  BadgeCheck,
  Check,
  Flame,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  Share2,
  ShoppingCart,
  TrendingUp,
  Truck,
  Undo2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { formatMoney, discountPercent } from '../../lib/format';
import { type Locale, pickLocale, productImage } from '../../lib/mock-data';
import { type ProductFullDetail } from '../../lib/product-details';
import { useCart } from '../../store/cart';
import { useWishlist } from '../../store/wishlist';
import { ProductGallery } from './product-gallery';
import { ProductTabs } from './product-tabs';
import { StickyCartBar } from './sticky-cart-bar';

interface Props {
  detail: ProductFullDetail;
  locale: Locale;
}

export function ProductDetail({ detail, locale }: Props) {
  const router = useRouter();
  const t = useTranslations('product');
  const { product, gallery, colors, sizes } = detail;
  const name = pickLocale(product.name, locale);

  const [color, setColor] = React.useState(colors[0]?.id);
  const [size, setSize] = React.useState(sizes.find((s) => s.inStock !== false)?.id);
  const [quantity, setQuantity] = React.useState(1);

  // Sticky CTA — asosiy tugma ekrandan chiqsa pastda paydo bo'ladi (conversion booster)
  const ctaRef = React.useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = React.useState(false);
  React.useEffect(() => {
    const el = ctaRef.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(([entry]) => setShowSticky(!entry!.isIntersecting), {
      rootMargin: '0px 0px -80px 0px',
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const addItem = useCart((s) => s.addItem);
  const wishlistHas = useWishlist((s) => s.ids.includes(product.id));
  const toggleWishlist = useWishlist((s) => s.toggle);

  const selectedColor = colors.find((c) => c.id === color);
  const selectedSize = sizes.find((s) => s.id === size);
  const discount = discountPercent(product.price, product.oldPrice);

  const handleAdd = (buyNow = false) => {
    if (sizes.length > 0 && !size) {
      toast({ title: t('selectSize'), variant: 'warning' });
      return;
    }
    if (selectedSize && selectedSize.inStock === false) {
      toast({ title: t('sizeUnavailable'), variant: 'destructive' });
      return;
    }
    addItem({
      productId: product.id,
      name,
      brand: product.brand,
      slug: product.slug,
      imageSeed: product.imageSeed,
      imageUrl: gallery[0]?.url ?? product.imageUrl,
      unitPrice: product.price,
      oldPrice: product.oldPrice,
      currency: product.currency,
      quantity,
      color: selectedColor?.label,
      size: selectedSize?.label,
    });
    toast({
      title: t('addedToCart'),
      description: `${quantity} × ${name}`,
      variant: 'success',
      duration: 2500,
    });
    if (buyNow) router.push('/checkout');
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: name, url: window.location.href });
      } catch {
        // user cancelled
      }
    } else {
      void navigator.clipboard?.writeText(window.location.href);
      toast({ title: t('linkCopied'), variant: 'success', duration: 1500 });
    }
  };

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery
          gallery={gallery}
          name={name}
          imageSeed={product.imageSeed}
          discount={discount}
          wishlistHas={wishlistHas}
          onToggleWishlist={() => toggleWishlist(product.id)}
        />

        {/* Info */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Link
              href={`/catalog?brand=${product.brand.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
              className="text-primary text-xs font-semibold uppercase tracking-widest hover:underline"
            >
              {product.brand}
            </Link>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground text-xs">
              SKU: ECM-{product.id.toUpperCase()}
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{name}</h1>
            <div className="mt-2 flex items-center gap-3">
              <Rating
                value={product.rating}
                reviewCount={product.reviewCount}
                size={16}
                showValue
              />
              <Link href="#reviews" className="text-muted-foreground text-sm hover:underline">
                ({t('reviewsCount', { count: product.reviewCount })})
              </Link>
            </div>

            {/* Trust / social-proof chiplari — real data (sotuvchi holati, rating, reviewCount) asosida */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {product.sellerVerified !== false && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <BadgeCheck size={13} />
                  {t('trustVerified')}
                </span>
              )}
              {product.reviewCount >= 100 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                  <Flame size={13} />
                  {t('trustPopular')}
                </span>
              )}
              {product.rating >= 4.8 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <TrendingUp size={13} />
                  {t('trustTopRated')}
                </span>
              )}
            </div>
          </div>

          {product.badge && (
            <Badge
              className={`rounded-md text-white ${
                product.badge === 'SALE'
                  ? 'bg-red-500 hover:bg-red-500'
                  : product.badge === 'NEW'
                    ? 'bg-emerald-500 hover:bg-emerald-500'
                    : 'bg-amber-500 hover:bg-amber-500'
              }`}
            >
              {product.badge}
            </Badge>
          )}

          {/* Price */}
          <div className="flex items-end gap-3 border-y py-5">
            <div>
              {product.oldPrice && (
                <div className="text-muted-foreground text-sm line-through">
                  {formatMoney(product.oldPrice)}
                </div>
              )}
              <div className="text-foreground text-3xl font-bold">{formatMoney(product.price)}</div>
            </div>
            {discount > 0 && (
              <Badge className="bg-rose-600 text-white hover:bg-rose-600">−{discount}%</Badge>
            )}
            <div className="ml-auto flex items-center gap-2 text-sm">
              {product.inStock ? (
                <>
                  <Check size={16} className="text-emerald-600" />
                  <span className="text-emerald-700">{t('inStock')}</span>
                </>
              ) : (
                <span className="text-muted-foreground">{t('outOfStock')}</span>
              )}
            </div>
          </div>

          {/* Color */}
          {colors.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold">
                {t('color')}:{' '}
                <span className="text-muted-foreground font-normal">{selectedColor?.label}</span>
              </div>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`h-9 w-9 rounded-full border-2 transition ${
                      c.id === color ? 'border-primary' : 'border-input hover:border-foreground'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    aria-label={`${t('color')}: ${c.label}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          {sizes.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold">
                  {t('size')}:{' '}
                  <span className="text-muted-foreground font-normal">
                    {selectedSize?.label ?? '—'}
                  </span>
                </span>
                <button type="button" className="text-primary text-xs hover:underline">
                  {t('sizeChart')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const disabled = s.inStock === false;
                  const active = s.id === size;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSize(s.id)}
                      className={`h-10 min-w-12 rounded-md border px-3 text-sm font-medium transition ${
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : disabled
                            ? 'border-input bg-muted text-muted-foreground cursor-not-allowed line-through opacity-60'
                            : 'border-input bg-background hover:border-primary'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & buttons */}
          <div ref={ctaRef} className="flex flex-col gap-3 md:flex-row">
            <div className="border-input flex h-12 items-center rounded-full border">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="text-muted-foreground hover:text-foreground grid h-12 w-12 place-items-center"
                aria-label={t('decrease')}
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v) && v >= 1) setQuantity(v);
                }}
                min={1}
                className="h-full w-14 bg-transparent text-center text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="text-muted-foreground hover:text-foreground grid h-12 w-12 place-items-center"
                aria-label={t('increase')}
              >
                <Plus size={16} />
              </button>
            </div>
            <Button
              size="lg"
              className="h-12 flex-1 rounded-full text-base font-semibold"
              onClick={() => handleAdd(false)}
              disabled={!product.inStock}
            >
              <ShoppingCart size={18} className="mr-2" />
              {t('addToCart')}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-12 rounded-full p-0"
              onClick={() => toggleWishlist(product.id)}
              aria-label={t('addToWishlist')}
            >
              <Heart size={18} className={wishlistHas ? 'fill-rose-500 text-rose-500' : ''} />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-12 rounded-full p-0"
              onClick={handleShare}
              aria-label={t('share')}
            >
              <Share2 size={18} />
            </Button>
          </div>

          <Button
            size="lg"
            variant="secondary"
            className="h-12 w-full rounded-full text-base font-semibold"
            onClick={() => handleAdd(true)}
            disabled={!product.inStock}
          >
            {t('buyNow')}
          </Button>

          {/* Delivery info */}
          <div className="bg-card space-y-2 rounded-xl border p-4 text-sm">
            {[
              { icon: Truck, text: t('deliveryFast') },
              { icon: Undo2, text: t('deliveryReturn') },
              { icon: ShieldCheck, text: t('deliveryAuthentic') },
            ].map((d) => (
              <div key={d.text} className="flex items-center gap-3">
                <d.icon size={18} className="text-primary shrink-0" />
                <span>{d.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ProductTabs detail={detail} locale={locale} />

      <StickyCartBar
        show={showSticky}
        name={name}
        imageSrc={gallery[0]?.url ?? productImage(product.imageSeed, 100)}
        price={product.price}
        oldPrice={product.oldPrice}
        inStock={product.inStock}
        onAdd={() => handleAdd(false)}
      />
    </div>
  );
}
