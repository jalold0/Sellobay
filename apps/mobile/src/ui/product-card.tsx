import { Link } from 'expo-router';
import { Heart, ShoppingBag, Star } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';

import { discountPercent, formatMoney, pickLocalized } from '../lib/format';
import { haptics } from '../lib/haptics';
import { type MockProduct, productImage } from '../lib/mock-data';
import { useCart } from '../store/cart';
import { useWishlist } from '../store/wishlist';
import { toast } from '../store/toast';
import { AppImage } from './app-image';
import { Badge } from './badge';
import { cn } from './cn';

interface Props {
  product: MockProduct;
  locale?: 'uz' | 'ru' | 'en';
}

export function ProductCard({ product, locale = 'uz' }: Props) {
  const name = pickLocalized(product.name, locale);
  const discount = discountPercent(product.price, product.oldPrice);
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
    toast({ title: 'Savatga qo`shildi', description: name, variant: 'success' });
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
          {/* Badges */}
          <View className="absolute left-2 top-2 gap-1">
            {product.badge ? (
              <Badge tone={product.badge.toLowerCase() as 'sale' | 'new' | 'top'}>
                {product.badge}
              </Badge>
            ) : null}
            {discount > 0 ? <Badge tone="sale">−{discount}%</Badge> : null}
          </View>
          {/* Wishlist */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              haptics.select();
              toggleWishlist(product.id);
            }}
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
                <Text className="text-foreground text-xs font-medium">Mavjud emas</Text>
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
          <View className="flex-row items-center gap-1">
            <Star size={11} color="#f59e0b" fill="#f59e0b" />
            <Text className="text-muted-foreground text-[11px]">
              {product.rating.toFixed(1)} ({product.reviewCount})
            </Text>
          </View>
          <View className="mt-1 flex-row items-end justify-between">
            <View className="flex-1">
              {product.oldPrice ? (
                <Text className="text-muted-foreground text-[10px] line-through">
                  {formatMoney(product.oldPrice)}
                </Text>
              ) : null}
              <Text
                className={cn(
                  'text-sm font-bold',
                  product.oldPrice ? 'text-accent' : 'text-foreground',
                )}
              >
                {formatMoney(product.price)}
              </Text>
            </View>
            {product.inStock ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  onAddToCart();
                }}
                hitSlop={6}
                className="bg-primary h-9 w-9 items-center justify-center rounded-full active:opacity-85"
              >
                <ShoppingBag size={14} color="#fff" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
