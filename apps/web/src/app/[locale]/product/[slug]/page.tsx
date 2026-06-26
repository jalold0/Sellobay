import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { ProductCardClient } from '../../../../components/product/product-card-client';
import { ProductDetail } from '../../../../components/product/product-detail';
import { BreadcrumbJsonLd, ProductJsonLd } from '../../../../components/seo/structured-data';
import { type Locale, pickLocale, productImage } from '../../../../lib/mock-data';
import { getProductDetail, getRelatedProducts } from '../../../../lib/product-details';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

interface PageProps {
  params: { slug: string; locale: Locale };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const detail = getProductDetail(params.slug);
  if (!detail) return { title: 'Mahsulot topilmadi' };
  const { product, description } = detail;
  const name = pickLocale(product.name, params.locale);
  const desc = pickLocale(description, params.locale);
  const img = productImage(product.imageSeed, 1200);
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

export default function ProductDetailPage({ params }: PageProps) {
  const detail = getProductDetail(params.slug);
  if (!detail) notFound();

  const locale = useLocale() as Locale;
  const t = useTranslations('product');
  const related = getRelatedProducts(detail.product.id, 4);
  const name = pickLocale(detail.product.name, locale);

  const url = `${SITE_URL}/${params.locale}/product/${detail.product.slug}`;

  return (
    <div className="space-y-10">
      <ProductJsonLd
        name={name}
        description={pickLocale(detail.description, locale).slice(0, 500)}
        imageUrl={productImage(detail.product.imageSeed, 800)}
        sku={`ECM-${detail.product.id.toUpperCase()}`}
        brand={detail.product.brand}
        price={detail.product.price}
        oldPrice={detail.product.oldPrice}
        currency={detail.product.currency}
        inStock={detail.product.inStock}
        rating={detail.product.rating}
        reviewCount={detail.product.reviewCount}
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
          <h2 className="mb-5 text-2xl font-bold tracking-tight">{t('sameCategory')}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {related.map((p) => (
              <ProductCardClient key={p.id} product={p} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
