import { Link } from 'expo-router';
import { Heart, Plane, ShoppingBag, Star, Ticket, Truck, Zap } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';

import { discountPercent, formatMoney, pickLocalized } from '../lib/format';
import { haptics } from '../lib/haptics';
import { type MockProduct, productImage } from '../lib/mock-data';
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

// Yetkazish signalining USLUBI (Coupang "Tomorrow/Rocket" analogi). Matn i18n
// orqali komponentda hisoblanadi — bu funksiya faqat rang/ikonka qaytaradi.
function getDeliveryStyle(product: MockProduct) {
  if (product.origin === 'global') {
    return { Icon: Plane, bg: 'bg-amber-50', text: 'text-amber-700', iconColor: '#B45309' };
  }
  if (product.delivery === 'tomorrow') {
    return { Icon: Zap, bg: 'bg-emerald-50', text: 'text-emerald-700', iconColor: '#16A34A' };
  }
  return { Icon: Truck, bg: 'bg-muted', text: 'text-muted-foreground', iconColor: '#6B6B73' };
}

// "2340" → "2.3k" (Coupang/Temu ijtimoiy isbot ko'rinishi)
function formatSold(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

function ProductCardBase({ product, locale = 'uz' }: Props) {
  const { t } = useT();
  const name = pickLocalized(product.name, locale);
  const discount = discountPercent(product.price, product.oldPrice);
  const ds = getDeliveryStyle(product);
  const deliveryLabel =
    product.origin === 'global'
      ? `${product.deliveryDays ?? 14} kun`
      : product.delivery === 'tomorrow'
        ? t('product.deliveryTomorrow')
        : t('product.deliveryFast');
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
          'border-border bg-card flex-1 overflow-hidden rounded-xl border',
          !product.inStock && 'opacity-70',
        )}
      >
        <View className="bg-muted relative aspect-square">
          <AppImage
            source={productImage(product.imageSeed, 400)}
            className="h-full w-full"
            contentFit="cover"
          />
          {/* Badge (SALE/NEW/TOP) — chegirma % endi narx yonida ko'rsatiladi */}
          {product.badge ? (
            <View className="absolute left-2 top-2">
              <Badge tone={product.badge.toLowerCase() as 'sale' | 'new' | 'top'}>
                {product.badge}
              </Badge>
            </View>
          ) : null}
          {/* Wishlist */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              haptics.select();
              toggleWishlist(product.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('product.addToWishlist')}
            className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-white/90"
            hitSlop={8}
          >
            <Heart
              size={14}
              color={wishlistHas ? '#B30029' : '#6B6B73'}
              fill={wishlistHas ? '#B30029' : 'transparent'}
            />
          </Pressable>
          {!product.inStock ? (
            <View className="absolute inset-0 items-center justify-center bg-black/40">
              <View className="rounded-full bg-white/95 px-3 py-1">
                <Text className="text-foreground text-xs font-medium">
                  {t('product.outOfStock')}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
        <View className="gap-1 p-3">
          <Text className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            {product.brand}
          </Text>
          <Text numberOfLines={2} className="text-foreground text-sm font-medium">
            {name}
          </Text>
          {/* Reyting + ijtimoiy isbot (sotilganlar soni) */}
          <View className="flex-row items-center gap-1">
            <Star size={11} color="#f59e0b" fill="#f59e0b" />
            <Text className="text-muted-foreground text-[11px]">
              {product.rating.toFixed(1)} ({product.reviewCount})
            </Text>
            {product.soldCount ? (
              <Text className="text-muted-foreground text-[11px]">
                {' · '}
                {t('product.soldSuffix').replace('{count}', formatSold(product.soldCount))}
              </Text>
            ) : null}
          </View>
          {/* Yetkazish / ishonch signallari */}
          <View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
            <View className={cn('flex-row items-center gap-1 rounded px-1.5 py-0.5', ds.bg)}>
              <ds.Icon size={9} color={ds.iconColor} />
              <Text className={cn('text-[9px] font-bold', ds.text)}>{deliveryLabel}</Text>
            </View>
            {product.freeShipping ? (
              <View className="flex-row items-center gap-0.5">
                <Truck size={9} color="#0284c7" />
                <Text className="text-[9px] font-semibold text-sky-600">
                  {t('product.freeShip')}
                </Text>
              </View>
            ) : null}
          </View>
          {/* Kupon chip (mock — kupon tizimi keyin ulanadi) */}
          {product.couponAmount ? (
            <View className="mt-1 flex-row">
              <View className="flex-row items-center gap-1 rounded border border-dashed border-red-400 px-1.5 py-0.5">
                <Ticket size={9} color="#ef4444" />
                <Text className="text-[9px] font-bold text-red-500">
                  {t('product.couponSuffix').replace('{amount}', formatMoney(product.couponAmount))}
                </Text>
              </View>
            </View>
          ) : null}
          {/* Narx — ustuvor, yonida inline chegirma % */}
          <View className="mt-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-foreground text-base font-black">
                {formatMoney(product.price)}
              </Text>
              {discount > 0 ? (
                <Text className="text-[11px] font-bold text-red-500">−{discount}%</Text>
              ) : null}
            </View>
            {product.oldPrice ? (
              <Text className="text-muted-foreground text-[10px] line-through">
                {formatMoney(product.oldPrice)}
              </Text>
            ) : null}
          </View>
          {/* To'liq kenglikdagi savat tugmasi — 44px (WCAG tap target) */}
          {product.inStock ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onAddToCart();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('product.addToCart')}
              className="bg-primary mt-2 h-11 flex-row items-center justify-center gap-1.5 rounded-xl active:opacity-85"
            >
              <ShoppingBag size={16} color="#fff" />
              <Text className="text-sm font-semibold text-white">
                {t('product.addToCartShort')}
              </Text>
            </Pressable>
          ) : (
            <View className="bg-muted mt-2 h-11 items-center justify-center rounded-xl">
              <Text className="text-muted-foreground text-sm font-medium">
                {t('product.outOfStock')}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

// React.memo — grid/ro'yxatlarda ota qayta render bo'lganda (qidiruv, sort,
// filtr) faqat o'zgargan kartalar qayta chiziladi. `product` React Query'dan
// barqaror referens bilan keladi, shuning uchun taqqoslash to'g'ri ishlaydi.
export const ProductCard = React.memo(ProductCardBase);
ProductCard.displayName = 'ProductCard';
