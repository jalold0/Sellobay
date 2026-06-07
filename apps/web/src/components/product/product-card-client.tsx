'use client';

import { ProductCard, toast, type ProductCardProps } from '@ecom/ui';
import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';

import { type MockProduct, pickLocale, productImage } from '../../lib/mock-data';
import { useCart } from '../../store/cart';
import { useWishlist } from '../../store/wishlist';

const NextLink = (props: { href: string; className?: string; children: React.ReactNode }) => (
  // typedRoutes muammosini oldini olish uchun any
  <Link href={props.href as never} className={props.className} prefetch={false}>
    {props.children}
  </Link>
);

const NextImageWrapper = (props: {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}) => (
  <Image
    src={props.src}
    alt={props.alt}
    width={props.width ?? 400}
    height={props.height ?? 400}
    className={props.className}
    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
  />
);

interface Props extends Pick<ProductCardProps, 'className'> {
  product: MockProduct;
  locale: 'uz' | 'ru' | 'en';
  priority?: boolean;
}

export function ProductCardClient({ product, locale, className }: Props) {
  const name = pickLocale(product.name, locale);
  const addItem = useCart((s) => s.addItem);
  const toggleWishlist = useWishlist((s) => s.toggle);

  const onAddToCart = React.useCallback(() => {
    addItem({
      productId: product.id,
      name,
      brand: product.brand,
      slug: product.slug,
      imageSeed: product.imageSeed,
      unitPrice: product.price,
      oldPrice: product.oldPrice,
      currency: product.currency,
      quantity: 1,
    });
    toast({ title: 'Savatga qo`shildi', description: name, variant: 'success', duration: 2500 });
  }, [addItem, name, product]);

  const onToggleWishlist = React.useCallback(() => {
    toggleWishlist(product.id);
    toast({ title: 'Sevimlilar yangilandi', duration: 1500 });
  }, [toggleWishlist, product.id]);

  return (
    <ProductCard
      name={name}
      brand={product.brand}
      imageUrl={productImage(product.imageSeed)}
      href={`/product/${product.slug}`}
      price={product.price}
      oldPrice={product.oldPrice}
      currency={product.currency}
      rating={product.rating}
      reviewCount={product.reviewCount}
      badge={product.badge}
      inStock={product.inStock}
      onAddToCart={product.inStock ? onAddToCart : undefined}
      onToggleWishlist={onToggleWishlist}
      LinkComponent={NextLink}
      ImageComponent={NextImageWrapper}
      className={className}
    />
  );
}
