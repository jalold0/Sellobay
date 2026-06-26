'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Rating,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@ecom/ui';
import {
  BadgeCheck,
  Check,
  Flame,
  Heart,
  HelpCircle,
  Minus,
  Plus,
  ShieldCheck,
  Share2,
  ShoppingCart,
  Star,
  ThumbsUp,
  TrendingUp,
  Truck,
  Undo2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { formatMoney, formatRelative, discountPercent } from '../../lib/format';
import { type Locale, pickLocale, productImage } from '../../lib/mock-data';
import { type ProductFullDetail } from '../../lib/product-details';
import { useCart } from '../../store/cart';
import { useWishlist } from '../../store/wishlist';

interface Props {
  detail: ProductFullDetail;
  locale: Locale;
}

export function ProductDetail({ detail, locale }: Props) {
  const router = useRouter();
  const t = useTranslations('product');
  const {
    product,
    gallery,
    colors,
    sizes,
    description,
    features,
    specs,
    reviews,
    questions,
    ratingBreakdown,
  } = detail;
  const name = pickLocale(product.name, locale);

  const [activeImageIdx, setActiveImageIdx] = React.useState(0);
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

  const ratingBars = ([5, 4, 3, 2, 1] as const).map((star) => ({
    star,
    pct: ratingBreakdown[star] ?? 0,
  }));

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
        {/* Gallery */}
        <div className="space-y-3">
          <div className="bg-muted relative aspect-square overflow-hidden rounded-2xl border">
            <Image
              src={productImage(gallery[activeImageIdx]?.seed ?? product.imageSeed, 800)}
              alt={name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 600px"
              className="object-cover"
            />
            {discount > 0 && (
              <Badge className="absolute left-3 top-3 rounded-md bg-rose-600 text-white shadow hover:bg-rose-600">
                −{discount}%
              </Badge>
            )}
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              className="text-foreground absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 shadow-sm transition hover:bg-white"
              aria-label={t('addToWishlist')}
            >
              <Heart size={18} className={wishlistHas ? 'fill-rose-500 text-rose-500' : ''} />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {gallery.slice(0, 5).map((g, i) => (
              <button
                key={g.seed}
                type="button"
                onClick={() => setActiveImageIdx(i)}
                className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                  i === activeImageIdx ? 'border-primary' : 'hover:border-input border-transparent'
                }`}
                aria-label={`${t('description')} ${i + 1}`}
              >
                <Image
                  src={productImage(g.seed, 200)}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>

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

            {/* Trust / social-proof chiplari — real data (rating, reviewCount) asosida */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <BadgeCheck size={13} />
                {t('trustVerified')}
              </span>
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

      {/* Tabs */}
      <section className="border-t pt-8">
        <Tabs defaultValue="description">
          <TabsList>
            <TabsTrigger value="description">{t('tabDescription')}</TabsTrigger>
            <TabsTrigger value="specs">{t('tabSpecs')}</TabsTrigger>
            <TabsTrigger value="reviews" id="reviews">
              {t('tabReviews')} ({product.reviewCount})
            </TabsTrigger>
            <TabsTrigger value="qa">
              {t('tabQa')} ({questions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-4 text-sm leading-relaxed md:col-span-2">
                <p>{pickLocale(description, locale)}</p>
                <ul className="list-disc space-y-1 pl-5">
                  {features.map((f, i) => (
                    <li key={i}>{pickLocale(f, locale)}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-card rounded-xl border p-4 text-sm">
                <div className="mb-3 font-semibold">{t('quickSpecs')}</div>
                <dl className="space-y-2">
                  {specs.slice(0, 4).map((s) => (
                    <div key={s.value} className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{pickLocale(s.label, locale)}</dt>
                      <dd className="text-right font-medium">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="specs">
            <div className="bg-card rounded-xl border">
              <dl className="divide-y">
                {specs.map((s) => (
                  <div key={s.value} className="flex justify-between gap-3 px-4 py-3 text-sm">
                    <dt className="text-muted-foreground">{pickLocale(s.label, locale)}</dt>
                    <dd className="text-right font-medium">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="grid gap-8 md:grid-cols-3">
              <aside className="space-y-4">
                <div className="bg-card rounded-xl border p-5 text-center">
                  <div className="text-5xl font-bold">{product.rating.toFixed(1)}</div>
                  <div className="mt-2 flex justify-center">
                    <Rating value={product.rating} size={18} />
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {t('reviewsBasedOn', { count: product.reviewCount })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {ratingBars.map((b) => (
                    <div key={b.star} className="flex items-center gap-2 text-xs">
                      <span className="inline-flex w-6 items-center gap-0.5">
                        {b.star} <Star size={10} className="fill-amber-400 text-amber-400" />
                      </span>
                      <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${b.pct}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground w-8 text-right">{b.pct}%</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full">
                  {t('writeReview')}
                </Button>
              </aside>
              <div className="space-y-4 md:col-span-2">
                {reviews.map((r) => (
                  <article key={r.id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={productImage(r.avatarSeed, 80)} alt={r.author} />
                          <AvatarFallback>{r.author[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{r.author}</div>
                          <div className="text-muted-foreground text-[11px]">
                            {formatRelative(r.createdAt)}
                            {r.verifiedPurchase && (
                              <span className="ml-2 inline-flex items-center gap-0.5 text-emerald-700">
                                <Check size={10} /> {t('verifiedPurchase')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Rating value={r.rating} size={14} />
                    </div>
                    {r.title && <div className="mt-3 text-sm font-medium">{r.title}</div>}
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{r.body}</p>
                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                      >
                        <ThumbsUp size={12} /> {t('helpful', { count: r.helpfulCount ?? 0 })}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="qa">
            <div className="space-y-4">
              {questions.map((q) => (
                <article key={q.id} className="bg-card rounded-xl border p-4">
                  <div className="flex items-start gap-3">
                    <HelpCircle size={18} className="text-primary mt-0.5 shrink-0" />
                    <div className="space-y-2">
                      <div>
                        <div className="text-muted-foreground text-xs">
                          {q.author} · {formatRelative(q.createdAt)}
                        </div>
                        <div className="mt-0.5 text-sm font-medium">{q.question}</div>
                      </div>
                      {q.answer && (
                        <div className="bg-muted rounded-md p-3">
                          <div className="text-primary text-xs font-semibold">
                            {q.answeredBy ?? t('answer')}
                          </div>
                          <div className="mt-1 text-sm">{q.answer}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
              <Button variant="outline" className="w-full">
                {t('askQuestion')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* Sticky add-to-cart bar — asosiy CTA ekrandan chiqsa paydo bo'ladi */}
      <div
        className={`bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur transition-transform duration-300 ${
          showSticky ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="container flex items-center gap-3 py-2.5">
          <div className="relative hidden h-12 w-12 shrink-0 overflow-hidden rounded-lg border sm:block">
            <Image
              src={productImage(product.imageSeed, 100)}
              alt={name}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="line-clamp-1 text-sm font-medium">{name}</div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">{formatMoney(product.price)}</span>
              {product.oldPrice && (
                <span className="text-muted-foreground text-xs line-through">
                  {formatMoney(product.oldPrice)}
                </span>
              )}
            </div>
          </div>
          <Button
            size="lg"
            className="h-11 shrink-0 rounded-full px-6 text-sm font-semibold"
            onClick={() => handleAdd(false)}
            disabled={!product.inStock}
          >
            <ShoppingCart size={16} className="mr-1.5" />
            {t('addToCart')}
          </Button>
        </div>
      </div>
    </div>
  );
}
