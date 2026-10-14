import { ChevronRight, Star, Store } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';

import { ProductCardClient } from '../../../../components/product/product-card-client';
import { ProductDetail } from '../../../../components/product/product-detail';
import { BreadcrumbJsonLd, ProductJsonLd } from '../../../../components/seo/structured-data';
import {
  fetchProductBySlug,
  fetchProductDetailExtras,
  fetchProducts,
} from '../../../../lib/catalog';
import { type Locale, type MockProduct, pickLocale, productImage } from '../../../../lib/mock-data';
import {
  buildProductDetail,
  getProductDetail,
  getRelatedProducts,
} from '../../../../lib/product-details';
import { notFoundMetadata } from '../../../../lib/seo';

import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

interface PageProps {
  params: { slug: string; locale: Locale };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const dbProduct = await fetchProductBySlug(params.slug);
  const detail = dbProduct ? buildProductDetail(dbProduct) : getProductDetail(params.slug);
  if (!detail) {
    const t = await getTranslations('product');
    return notFoundMetadata(t('notFound'));
  }
  const { product, description } = detail;
  const name = pickLocale(product.name, params.locale);
  // Tavsif sotuvchidan keladi. Yo'q bo'lsa mahsulot nomi ishlatiladi —
  // ilgari bu yerda o'ylab topilgan matn turardi va u Google natijalariga tushardi.
  const desc = description ? pickLocale(description, params.locale) : name;
  const img = product.imageUrl ?? productImage(product.imageSeed, 1200);
  return {
    title: name,
    description: desc.slice(0, 160),
    alternates: {
      canonical: `${SITE_URL}/${params.locale}/product/${product.slug}`,
      languages: {
        uz: `${SITE_URL}/uz/product/${product.slug}`,
        ru: `${SITE_URL}/ru/product/${product.slug}`,
        en: `${SITE_URL}/en/product/${product.slug}`,
      },
    },
    openGraph: {
      title: name,
      description: desc.slice(0, 160),
      type: 'website',
      images: [{ url: img, width: 1200, height: 1200, alt: name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: name,
      description: desc.slice(0, 160),
      images: [img],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const dbProduct = await fetchProductBySlug(params.slug);
  // Real rasm galereyasi + variantlar (rang/o'lcham) — DB'dan
  const extras = dbProduct ? await fetchProductDetailExtras(params.slug) : null;
  const detail = dbProduct
    ? buildProductDetail(dbProduct, extras ?? undefined)
    : getProductDetail(params.slug);
  if (!detail) notFound();

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('product');

  // O'xshash mahsulotlar — DB mahsuloti bo'lsa DB'dan (kartochka savatga to'g'ri UUID
  // beradi va checkout ishlaydi); aks holda mock fallback.
  //
  // Do'koni bor tovar uchun — BOSHQA do'konlardagi o'xshashlari, ishonchli
  // (reytingi yuqori) do'kon birinchi: xaridor shu tovarni boshqa joydan ham
  // solishtira oladi.
  let related: MockProduct[];
  const otherSellers = Boolean(dbProduct && detail.seller);
  if (dbProduct && dbProduct.categoryId) {
    const { items } = await fetchProducts({
      category: dbProduct.categoryId,
      limit: otherSellers ? 8 : 5,
      ...(otherSellers && detail.seller
        ? { excludeSeller: detail.seller.id, excludeId: dbProduct.id, sort: 'seller-rating' }
        : {}),
    });
    related = items.filter((p) => p.id !== dbProduct.id).slice(0, otherSellers ? 8 : 4);
  } else {
    related = getRelatedProducts(detail.product.id, 4);
  }
  const name = pickLocale(detail.product.name, locale);

  const url = `${SITE_URL}/${params.locale}/product/${detail.product.slug}`;

  return (
    <div className="space-y-10">
      {/* Reyting Google'ga FAQAT haqiqiy sharh bo'lganda yuboriladi: sharhsiz
          aggregateRating yuborish qidiruv tizimlari qoidalarini buzadi va
          natijalarda soxta yulduzcha ko'rsatadi. */}
      <ProductJsonLd
        name={name}
        description={
          detail.description ? pickLocale(detail.description, locale).slice(0, 500) : name
        }
        imageUrl={detail.product.imageUrl ?? productImage(detail.product.imageSeed, 800)}
        sku={extras?.sku ?? detail.product.slug}
        brand={detail.product.brand}
        price={detail.product.price}
        oldPrice={detail.product.oldPrice}
        currency={detail.product.currency}
        inStock={detail.product.inStock}
        rating={detail.product.reviewCount > 0 ? detail.product.rating : undefined}
        reviewCount={detail.product.reviewCount > 0 ? detail.product.reviewCount : undefined}
        url={url}
      />
      <BreadcrumbJsonLd
        items={[
          { name: t('breadcrumbHome'), url: `${SITE_URL}/${params.locale}` },
          { name: t('breadcrumbCatalog'), url: `${SITE_URL}/${params.locale}/catalog` },
          { name, url },
        ]}
      />

      <nav className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        <Link href="/" className="hover:text-foreground">
          {t('breadcrumbHome')}
        </Link>
        <ChevronRight size={14} />
        <Link href="/catalog" className="hover:text-foreground">
          {t('breadcrumbCatalog')}
        </Link>
        <ChevronRight size={14} />
        <span className="text-foreground line-clamp-1">{name}</span>
      </nav>

      <ProductDetail detail={detail} locale={locale} />

      {related.length > 0 && (
        <section className="border-t pt-8">
          <h2 className="text-2xl font-bold tracking-tight">
            {otherSellers ? t('otherSellers') : t('sameCategory')}
          </h2>
          {otherSellers && (
            <p className="text-muted-foreground mt-1 text-sm">{t('otherSellersHint')}</p>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {related.map((p) => (
              <div key={p.id} className="flex min-w-0 flex-col gap-1.5">
                <ProductCardClient product={p} locale={locale} />
                {otherSellers && p.seller && (
                  <p className="text-muted-foreground flex items-center gap-1 truncate px-1 text-xs">
                    <Store size={12} className="shrink-0" />
                    <span className="truncate">{p.seller.name}</span>
                    {p.seller.rating > 0 && (
                      <span className="text-foreground inline-flex shrink-0 items-center gap-0.5 font-medium">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        {p.seller.rating.toFixed(1)}
                      </span>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
