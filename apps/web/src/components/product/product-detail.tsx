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
  Check,
  Heart,
  HelpCircle,
  Minus,
  Plus,
  ShieldCheck,
  Share2,
  ShoppingCart,
  Star,
  ThumbsUp,
  Truck,
  Undo2,
} from 'lucide-react';
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
  const { product, gallery, colors, sizes, description, features, specs, reviews, questions, ratingBreakdown } =
    detail;
  const name = pickLocale(product.name, locale);

  const [activeImageIdx, setActiveImageIdx] = React.useState(0);
  const [color, setColor] = React.useState(colors[0]?.id);
  const [size, setSize] = React.useState(sizes.find((s) => s.inStock !== false)?.id);
  const [quantity, setQuantity] = React.useState(1);

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
      toast({ title: 'O`lcham tanlang', variant: 'warning' });
      return;
    }
    if (selectedSize && selectedSize.inStock === false) {
      toast({ title: 'Bu o`lcham hozircha mavjud emas', variant: 'destructive' });
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
      title: 'Savatga qo`shildi',
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
      toast({ title: 'Havola nusxalandi', variant: 'success', duration: 1500 });
    }
  };

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted">
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
              className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-foreground shadow-sm transition hover:bg-white"
              aria-label="Sevimlilar"
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
                  i === activeImageIdx ? 'border-primary' : 'border-transparent hover:border-input'
                }`}
                aria-label={`Rasm ${i + 1}`}
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
              className="text-xs font-semibold uppercase tracking-widest text-primary hover:underline"
            >
              {product.brand}
            </Link>
            <span className="text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">SKU: ECM-{product.id.toUpperCase()}</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{name}</h1>
            <div className="mt-2 flex items-center gap-3">
              <Rating value={product.rating} reviewCount={product.reviewCount} size={16} showValue />
              <Link href="#reviews" className="text-sm text-muted-foreground hover:underline">
                ({product.reviewCount} sharh)
              </Link>
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
                <div className="text-sm text-muted-foreground line-through">
                  {formatMoney(product.oldPrice)}
                </div>
              )}
              <div className="text-3xl font-bold text-foreground">{formatMoney(product.price)}</div>
            </div>
            {discount > 0 && (
              <Badge className="bg-rose-600 text-white hover:bg-rose-600">−{discount}%</Badge>
            )}
            <div className="ml-auto flex items-center gap-2 text-sm">
              {product.inStock ? (
                <>
                  <Check size={16} className="text-emerald-600" />
                  <span className="text-emerald-700">Omborda mavjud</span>
                </>
              ) : (
                <span className="text-muted-foreground">Mavjud emas</span>
              )}
            </div>
          </div>

          {/* Color */}
          {colors.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold">
                Rang:{' '}
                <span className="font-normal text-muted-foreground">{selectedColor?.label}</span>
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
                    aria-label={`Rang: ${c.label}`}
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
                  O&apos;lcham:{' '}
                  <span className="font-normal text-muted-foreground">
                    {selectedSize?.label ?? '—'}
                  </span>
                </span>
                <button type="button" className="text-xs text-primary hover:underline">
                  O&apos;lchov jadvali
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
                            ? 'cursor-not-allowed border-input bg-muted text-muted-foreground line-through opacity-60'
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
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex h-12 items-center rounded-full border border-input">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="grid h-12 w-12 place-items-center text-muted-foreground hover:text-foreground"
                aria-label="Kamaytirish"
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
                className="grid h-12 w-12 place-items-center text-muted-foreground hover:text-foreground"
                aria-label="Oshirish"
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
              Savatga qo&apos;shish
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-12 rounded-full p-0"
              onClick={() => toggleWishlist(product.id)}
              aria-label="Sevimlilar"
            >
              <Heart
                size={18}
                className={wishlistHas ? 'fill-rose-500 text-rose-500' : ''}
              />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-12 rounded-full p-0"
              onClick={handleShare}
              aria-label="Ulashish"
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
            ⚡ Hozir sotib olish
          </Button>

          {/* Delivery info */}
          <div className="space-y-2 rounded-xl border bg-card p-4 text-sm">
            {[
              { icon: Truck, text: 'Tezkor yetkazib berish — Toshkent bo`yicha 24 soat ichida' },
              { icon: Undo2, text: '14 kun ichida hech qanday savol-javobsiz qaytarish' },
              { icon: ShieldCheck, text: '100% asl mahsulot kafolati' },
            ].map((d) => (
              <div key={d.text} className="flex items-center gap-3">
                <d.icon size={18} className="shrink-0 text-primary" />
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
            <TabsTrigger value="description">Tavsifi</TabsTrigger>
            <TabsTrigger value="specs">Xususiyatlari</TabsTrigger>
            <TabsTrigger value="reviews" id="reviews">
              Sharhlar ({product.reviewCount})
            </TabsTrigger>
            <TabsTrigger value="qa">Savol-javoblar ({questions.length})</TabsTrigger>
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
              <div className="rounded-xl border bg-card p-4 text-sm">
                <div className="mb-3 font-semibold">Tezkor xususiyatlari</div>
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
            <div className="rounded-xl border bg-card">
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
                <div className="rounded-xl border bg-card p-5 text-center">
                  <div className="text-5xl font-bold">{product.rating.toFixed(1)}</div>
                  <div className="mt-2 flex justify-center">
                    <Rating value={product.rating} size={18} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {product.reviewCount} sharh asosida
                  </div>
                </div>
                <div className="space-y-1.5">
                  {ratingBars.map((b) => (
                    <div key={b.star} className="flex items-center gap-2 text-xs">
                      <span className="inline-flex w-6 items-center gap-0.5">
                        {b.star} <Star size={10} className="fill-amber-400 text-amber-400" />
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${b.pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">{b.pct}%</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full">
                  Sharh yozish
                </Button>
              </aside>
              <div className="space-y-4 md:col-span-2">
                {reviews.map((r) => (
                  <article key={r.id} className="rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={productImage(r.avatarSeed, 80)} alt={r.author} />
                          <AvatarFallback>{r.author[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{r.author}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatRelative(r.createdAt)}
                            {r.verifiedPurchase && (
                              <span className="ml-2 inline-flex items-center gap-0.5 text-emerald-700">
                                <Check size={10} /> Tasdiqlangan xarid
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Rating value={r.rating} size={14} />
                    </div>
                    {r.title && <div className="mt-3 text-sm font-medium">{r.title}</div>}
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
                    <div className="mt-3 flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <ThumbsUp size={12} /> Foydali ({r.helpfulCount ?? 0})
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
                <article key={q.id} className="rounded-xl border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <HelpCircle size={18} className="mt-0.5 shrink-0 text-primary" />
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {q.author} · {formatRelative(q.createdAt)}
                        </div>
                        <div className="mt-0.5 text-sm font-medium">{q.question}</div>
                      </div>
                      {q.answer && (
                        <div className="rounded-md bg-muted p-3">
                          <div className="text-xs font-semibold text-primary">
                            {q.answeredBy ?? "Javob"}
                          </div>
                          <div className="mt-1 text-sm">{q.answer}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
              <Button variant="outline" className="w-full">
                Savol berish
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
