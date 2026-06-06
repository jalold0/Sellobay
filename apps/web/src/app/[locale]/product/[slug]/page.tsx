import { Badge, Button, Rating } from '@ecom/ui';
import { Check, ChevronRight, Heart, Minus, Plus, ShieldCheck, ShoppingCart, Truck, Undo2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  brands,
  findById,
  findBySlug,
  pickLocale,
  productImage,
  products,
  type Locale,
} from '../../../../lib/mock-data';

function formatPrice(value: number, locale: string = 'uz-UZ'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'UZS',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductDetailPage({ params }: { params: { slug: string; locale: Locale } }) {
  const product = findBySlug(products, params.slug);
  if (!product) notFound();

  const locale = useLocale() as Locale;
  const name = pickLocale(product.name, locale);
  const brand = findById(brands, product.brandId);
  const related = products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4);
  const gallery = [
    product.imageSeed,
    `${product.imageSeed}-2`,
    `${product.imageSeed}-3`,
    `${product.imageSeed}-4`,
  ];
  const colors = ['#0f172a', '#ef4444', '#3b82f6', '#f59e0b'];
  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];

  return (
    <div className="space-y-10">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Bosh sahifa</Link>
        <ChevronRight size={14} />
        <Link href="/catalog" className="hover:text-foreground">Katalog</Link>
        <ChevronRight size={14} />
        <span className="line-clamp-1 text-foreground">{name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-2xl border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productImage(product.imageSeed, 600)}
              alt={name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {gallery.map((seed, i) => (
              <button
                key={i}
                type="button"
                className="aspect-square overflow-hidden rounded-lg border-2 border-transparent transition hover:border-primary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={productImage(seed, 150)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-5">
          {brand && (
            <Link
              href={`/catalog?brand=${brand.slug}`}
              className="inline-block text-xs font-semibold uppercase tracking-widest text-primary hover:underline"
            >
              {brand.name}
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{name}</h1>
            <div className="mt-2 flex items-center gap-3">
              <Rating value={product.rating} reviewCount={product.reviewCount} size={16} showValue />
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">SKU: ECM-{product.id.toUpperCase()}</span>
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
                  {formatPrice(product.oldPrice)}
                </div>
              )}
              <div className="text-3xl font-bold text-foreground">{formatPrice(product.price)}</div>
            </div>
            {product.oldPrice && (
              <Badge className="bg-rose-600 text-white hover:bg-rose-600">
                −{Math.round(100 - (product.price / product.oldPrice) * 100)}%
              </Badge>
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
          <div>
            <div className="mb-2 text-sm font-semibold">Rangi: <span className="font-normal text-muted-foreground">Qora</span></div>
            <div className="flex gap-2">
              {colors.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  className={`h-9 w-9 rounded-full border-2 ${i === 0 ? 'border-primary' : 'border-input'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">O&apos;lcham: <span className="font-normal text-muted-foreground">M</span></span>
              <button className="text-xs text-primary hover:underline">O&apos;lchov jadvali</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  className={`h-10 w-12 rounded-md border text-sm font-medium transition ${
                    i === 1
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background hover:border-primary'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & buttons */}
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex h-12 items-center rounded-full border border-input">
              <button type="button" className="grid h-12 w-12 place-items-center text-muted-foreground hover:text-foreground">
                <Minus size={16} />
              </button>
              <input
                type="number"
                defaultValue={1}
                min={1}
                className="h-full w-12 bg-transparent text-center text-sm outline-none"
              />
              <button type="button" className="grid h-12 w-12 place-items-center text-muted-foreground hover:text-foreground">
                <Plus size={16} />
              </button>
            </div>
            <Button size="lg" className="h-12 flex-1 rounded-full text-base font-semibold">
              <ShoppingCart size={18} className="mr-2" />
              Savatga qo&apos;shish
            </Button>
            <Button size="lg" variant="outline" className="h-12 w-12 rounded-full p-0" aria-label="Wishlist">
              <Heart size={18} />
            </Button>
          </div>

          <Button asChild size="lg" variant="secondary" className="h-12 w-full rounded-full text-base font-semibold">
            <Link href="/checkout">⚡ Hozir sotib olish</Link>
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
        <div className="border-b">
          <nav className="flex gap-6">
            {[
              { id: 'description', label: 'Tavsifi' },
              { id: 'specs', label: 'Xususiyatlari' },
              { id: 'reviews', label: `Sharhlar (${product.reviewCount})` },
              { id: 'qa', label: 'Savol-javoblar' },
            ].map((t, i) => (
              <button
                key={t.id}
                type="button"
                className={`-mb-px border-b-2 pb-3 text-sm font-medium transition ${
                  i === 0
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="grid gap-6 pt-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4 text-sm leading-relaxed">
            <p>
              {name} — bu zamonaviy texnologiyalar va premium materiallar uyg&apos;unligidan tug&apos;ilgan mahsulot.
              Har bir detal o&apos;ylab tayyorlangan: ergonomik dizayn, chidamli komponentlar va estetik ko&apos;rinish.
            </p>
            <p>
              Kundalik foydalanish uchun ham, maxsus tadbirlar uchun ham mos keladi. Klassik va zamonaviy
              uslublarni birlashtirgan ushbu model uzoq yillar davomida o&apos;z ko&apos;rinishini saqlab qoladi.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Premium material</li>
              <li>Zamonaviy va minimalist dizayn</li>
              <li>Qulay foydalanish</li>
              <li>Asl mahsulot kafolati</li>
            </ul>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 text-sm font-semibold">Asosiy xususiyatlar</div>
            <dl className="space-y-2 text-sm">
              {[
                ['Brend', product.brand],
                ['Modeli', name],
                ['SKU', `ECM-${product.id.toUpperCase()}`],
                ['Kafolat', '12 oy'],
                ['Reyting', `${product.rating.toFixed(1)} / 5.0`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t pt-8">
          <h2 className="mb-5 text-2xl font-bold tracking-tight">Shu kategoriyada</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {related.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
                className="group rounded-xl border bg-card transition hover:shadow"
              >
                <div className="aspect-square overflow-hidden rounded-t-xl bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={productImage(p.imageSeed)}
                    alt={pickLocale(p.name, locale)}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <div className="text-xs text-muted-foreground">{p.brand}</div>
                  <div className="line-clamp-1 text-sm font-medium">{pickLocale(p.name, locale)}</div>
                  <div className="mt-1 text-sm font-bold">{formatPrice(p.price)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
