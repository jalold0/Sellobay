import { Link } from 'expo-router';
import { Heart, ShoppingBag, Star } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';

import { discountPercent, formatMoney, pickLocalized } from '../lib/format';
import { haptics } from '../lib/haptics';
import { type MockProduct, productImageSource } from '../lib/mock-data';
import { useT } from '../lib/useT';
import { useCart } from '../store/cart';
import { toast } from '../store/toast';
import { useWishlist } from '../store/wishlist';

import { AppImage } from './app-image';
import { Badge } from './badge';
import { cn } from './cn';

interface Props {
  product: MockProduct;
  locale?: 'uz' | 'ru' | 'en';
}

// Yetkazish signalining rangi (redizayn build() bilan bir xil qiymatlar).
function deliveryStyle(product: MockProduct): { bg: string; fg: string } {
  if (product.origin === 'global') return { bg: '#FAEEDA', fg: '#B45309' };
  if (product.delivery === 'tomorrow') return { bg: '#E1F5EE', fg: '#1F8A5B' };
  return { bg: '#F1F1F3', fg: '#6B6B73' };
}

// "2340" → "2.3k" (ijtimoiy isbot)
function formatSold(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

function ProductCardBase({ product, locale = 'uz' }: Props) {
  const { t } = useT();
  const name = pickLocalized(product.name, locale);
  const discount = discountPercent(product.price, product.oldPrice);
  const ds = deliveryStyle(product);
  const deliveryLabel =
    product.origin === 'global'
      ? `${product.deliveryDays ?? 14} kun`
      : product.delivery === 'tomorrow'
        ? t('product.deliveryTomorrow')
        : t('product.deliveryFastShort');
  const addItem = useCart((s) => s.addItem);
  const wishlistHas = useWishlist((s) => s.ids.includes(product.id));
  const toggleWishlist = useWishlist((s) => s.toggle);

  const onAddToCart = () => {
    if (!product.inStock) return;
    haptics.success();
    addItem({
      productId: product.id,
      name,
      brand: product.brand,
      slug: product.slug,
      imageSeed: product.imageSeed,
      imageUrl: product.imageUrl,
      unitPrice: product.price,
      oldPrice: product.oldPrice,
      currency: product.currency,
      quantity: 1,
    });
    toast({ title: t('product.addedToCart'), description: name, variant: 'success' });
  };

  return (
    <Link href={`/product/${product.slug}` as never} asChild>
      <Pressable
        className={cn(
          'border-border overflow-hidden rounded-2xl border bg-white',
          !product.inStock && 'opacity-80',
        )}
      >
        <View className="bg-muted relative aspect-square">
          <AppImage
            source={productImageSource(product)}
            className="h-full w-full"
            contentFit="cover"
          />
          {product.badge ? (
            <View className="absolute left-2 top-2">
              <Badge tone={product.badge.toLowerCase() as 'sale' | 'new' | 'top'}>
                {product.badge}
              </Badge>
            </View>
          ) : null}
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              haptics.select();
              toggleWishlist(product.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('product.addToWishlist')}
            className="absolute right-2 top-2 h-[30px] w-[30px] items-center justify-center rounded-full bg-white/90"
            style={{
              shadowColor: '#0A0A0C',
              shadowOpacity: 0.12,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            }}
            hitSlop={8}
          >
            <Heart
              size={15}
              color={wishlistHas ? '#762237' : '#6B6B73'}
              fill={wishlistHas ? '#762237' : 'transparent'}
            />
          </Pressable>
          {!product.inStock ? (
            <View className="absolute inset-0 items-center justify-center bg-black/40">
              <View className="rounded-full bg-white/95 px-3 py-1">
                <Text className="text-foreground text-xs font-semibold">
                  {t('product.outOfStock')}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View className="gap-1 px-[11px] pb-3 pt-2.5">
          <Text className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-neutral-300">
            {product.brand}
          </Text>
          <Text
            numberOfLines={2}
            className="text-foreground min-h-[34px] text-[13px] font-medium leading-[17px]"
          >
            {name}
          </Text>

          <View className="flex-row items-center gap-1">
            <Star size={11} color="#C9A961" fill="#C9A961" />
            <Text className="text-[11px] text-neutral-400">
              {product.rating.toFixed(1)}
              {product.soldCount
                ? ` · ${t('product.soldSuffix').replace('{count}', formatSold(product.soldCount))}`
                : ''}
            </Text>
          </View>

          <View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
            <View
              className="flex-row items-center gap-1 rounded-md px-1.5 py-0.5"
              style={{ backgroundColor: ds.bg }}
            >
              <View className="h-1 w-1 rounded-full" style={{ backgroundColor: ds.fg }} />
              <Text className="text-[9px] font-bold" style={{ color: ds.fg }}>
                {deliveryLabel}
              </Text>
            </View>
            {product.freeShipping ? (
              <Text className="text-success text-[9px] font-bold">{t('product.freeShip')}</Text>
            ) : null}
          </View>

          <View className="mt-1 flex-row items-baseline gap-1.5">
            <Text
              className="font-serif-bold text-[17px]"
              style={{ color: product.oldPrice ? '#531625' : '#0A0A0C' }}
            >
              {formatMoney(product.price)}
            </Text>
            {discount > 0 ? (
              <Text className="text-accent text-[11px] font-extrabold">−{discount}%</Text>
            ) : null}
          </View>
          {product.oldPrice ? (
            <Text className="text-[10px] text-neutral-300 line-through">
              {formatMoney(product.oldPrice)}
            </Text>
          ) : null}

          {product.inStock ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onAddToCart();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('product.addToCart')}
              className="bg-primary mt-2 h-[38px] flex-row items-center justify-center gap-1.5 rounded-xl active:opacity-85"
            >
              <ShoppingBag size={14} color="#fff" />
              <Text className="text-xs font-semibold text-white">
                {t('product.addToCartShort')}
              </Text>
            </Pressable>
          ) : (
            <View className="bg-chip mt-2 h-[38px] items-center justify-center rounded-xl">
              <Text className="text-xs font-semibold text-neutral-300">
                {t('product.outOfStock')}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

export const ProductCard = React.memo(ProductCardBase);
ProductCard.displayName = 'ProductCard';
