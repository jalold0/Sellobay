// JSON-LD structured data — SEO uchun zarur.
// Google'ga sahifa tarkibini aniq tushuntiradi.

import { jsonLdHtml } from '../../lib/json-ld';
import { siteUrl } from '../../lib/site-url';

interface OrgProps {}

export function OrganizationJsonLd(_props: OrgProps = {}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Sellobay',
    url: siteUrl(),
    logo: `${siteUrl()}/icon-512.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+998-71-200-00-00',
      contactType: 'customer service',
      areaServed: 'UZ',
      availableLanguage: ['uz', 'ru', 'en'],
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'UZ',
      addressLocality: 'Toshkent',
    },
    sameAs: ['https://www.instagram.com/', 'https://www.facebook.com/', 'https://t.me/'],
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }} />
  );
}

interface ProductJsonLdProps {
  name: string;
  description: string;
  imageUrl: string;
  sku: string;
  brand: string;
  price: number;
  oldPrice?: number;
  currency?: string;
  inStock?: boolean;
  rating?: number;
  reviewCount?: number;
  url: string;
}

export function ProductJsonLd(p: ProductJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    image: p.imageUrl,
    sku: p.sku,
    brand: { '@type': 'Brand', name: p.brand },
    offers: {
      '@type': 'Offer',
      url: p.url,
      priceCurrency: p.currency ?? 'UZS',
      price: p.price,
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      ...(p.oldPrice && p.oldPrice > p.price
        ? {
            priceValidUntil: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
          }
        : {}),
    },
    ...(p.rating !== undefined && p.reviewCount !== undefined
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: p.rating,
            reviewCount: p.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }} />
  );
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }} />
  );
}
