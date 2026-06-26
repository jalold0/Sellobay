import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Check,
  ChevronLeft,
  Heart,
  Minus,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  Undo2,
} from 'lucide-react-native';
import * as React from 'react';
import { FlatList, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { discountPercent, formatMoney, pickLocalized } from '../../src/lib/format';
import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/lib/useT';
import { useProduct, useProducts } from '../../src/lib/hooks';
import { productImage, type MockProduct } from '../../src/lib/mock-data';
import { useCart } from '../../src/store/cart';
import { toast } from '../../src/store/toast';
import { useWishlist } from '../../src/store/wishlist';
import { AppImage } from '../../src/ui/app-image';
import { Badge } from '../../src/ui/badge';
import { Button } from '../../src/ui/button';
import { cn } from '../../src/ui/cn';
import { ProductCard } from '../../src/ui/product-card';
import { Skeleton } from '../../src/ui/skeleton';

const GALLERY_EXTRAS = ['-2', '-3', '-4', '-5'];
const COLORS = [
  { id: 'black', label: 'Qora', hex: '#0A0A0C' },
  { id: 'red', label: 'Qizil', hex: '#ef4444' },
  { id: 'blue', label: "Ko'k", hex: '#3b82f6' },
  { id: 'amber', label: 'Sariq', hex: '#f59e0b' },
];
const SIZES_CLOTHING = ['XS', 'S', 'M', 'L', 'XL'];
const SIZES_FOOTWEAR = ['38', '39', '40', '41', '42', '43', '44'];

export default function ProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, locale } = useT();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  // Jonli API'dan — slug bo'yicha (xato bo'lsa mock fallback)
  const { data: product, isLoading } = useProduct(slug);
  const [activeImage, setActiveImage] = React.useState(0);
  const [color, setColor] = React.useState(COLORS[0].id);
  const [size, setSize] = React.useState<string | undefined>(undefined);
  const [qty, setQty] = React.useState(1);

  const addItem = useCart((s) => s.addItem);
  const productId = product?.id ?? '';
  const wishlistHas = useWishlist((s) => (productId ? s.ids.includes(productId) : false));
  const toggleWishlist = useWishlist((s) => s.toggle);

  // O'xshash mahsulotlar — bir kategoriyadan
  const { data: relatedAll = [] } = useProducts({
    category: product?.categoryId || undefined,
    limit: 6,
  });

  if (isLoading) {
    return (
      <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
        {/* Hero rasm skeleton */}
        <Skeleton className="aspect-square w-full rounded-none" />
        <View className="flex-row gap-2 px-4 pt-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-16 rounded-lg" />
          ))}
        </View>
        <View className="gap-3 px-4 pt-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-3 w-32" />
          <View className="border-border border-y py-4">
            <Skeleton className="h-8 w-40" />
          </View>
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View
        className="bg-background flex-1 items-center justify-center"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-muted-foreground text-base">{t('common.empty')}</Text>
        <Button
          variant="outline"
          onPress={() => router.back()}
          className="mt-3"
          style={{ marginTop: 12 }}
        >
          {t('common.back')}
        </Button>
      </View>
    );
  }

  const name = pickLocalized(product.name, locale);
  const discount = discountPercent(product.price, product.oldPrice);
  const gallery = [product.imageSeed, ...GALLERY_EXTRAS.map((s) => `${product.imageSeed}${s}`)];
  // categoryId endi slug ('shoes' / 'clothing') — API'dan keladi
  const isFootwear = product.categoryId === 'shoes' || product.categoryId === 'c2';
  const isClothing = product.categoryId === 'clothing' || product.categoryId === 'c1';
  const sizes = isFootwear ? SIZES_FOOTWEAR : isClothing ? SIZES_CLOTHING : [];
  const related = relatedAll.filter((p: MockProduct) => p.id !== product.id).slice(0, 4);
  const selectedColor = COLORS.find((c) => c.id === color);

  const onAdd = (buyNow = false) => {
    if (sizes.length > 0 && !size) {
      haptics.warning();
      toast({ title: "O'lcham tanlang", variant: 'warning' });
      return;
    }
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
      quantity: qty,
      color: selectedColor?.label,
      size,
    });
    toast({
      title: t('product.addedToCart'),
      description: `${qty} × ${name}`,
      variant: 'success',
    });
    if (buyNow) router.push('/checkout');
  };

  const onShare = async () => {
    try {
      await Share.share({ message: `${name} — ${formatMoney(product.price)}` });
    } catch {
      // user cancelled
    }
  };

  return (
    <View className="bg-background flex-1">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero image */}
        <View className="bg-muted relative">
          <AppImage
            source={productImage(gallery[activeImage]!, 800)}
            style={{ width: '100%', aspectRatio: 1 }}
            contentFit="cover"
          />
          {/* Top bar overlay */}
          <View
            pointerEvents="box-none"
            style={{ top: insets.top + 8 }}
            className="absolute inset-x-3 flex-row items-center justify-between"
          >
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/90 active:opacity-75"
              hitSlop={6}
            >
              <ChevronLeft size={20} color="#0A0A0C" />
            </Pressable>
            <View className="flex-row gap-2">
              <Pressable
                onPress={onShare}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/90 active:opacity-75"
                hitSlop={6}
              >
                <Share2 size={18} color="#0A0A0C" />
              </Pressable>
              <Pressable
                onPress={() => {
                  haptics.select();
                  toggleWishlist(product.id);
                }}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/90 active:opacity-75"
                hitSlop={6}
              >
                <Heart
                  size={18}
                  color={wishlistHas ? '#B30029' : '#0A0A0C'}
                  fill={wishlistHas ? '#B30029' : 'transparent'}
                />
              </Pressable>
            </View>
          </View>
          {/* Discount badge */}
          {discount > 0 ? (
            <View className="absolute bottom-3 left-3">
              <Badge tone="sale">−{discount}%</Badge>
            </View>
          ) : null}
          {/* Gallery dots */}
          <View className="absolute bottom-3 right-3 flex-row gap-1">
            {gallery.map((_, i) => (
              <View
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === activeImage ? 'bg-primary w-4' : 'w-1.5 bg-white/70',
                )}
              />
            ))}
          </View>
        </View>

        {/* Thumbnail strip */}
        <FlatList
          data={gallery}
          keyExtractor={(s) => s}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => {
                haptics.select();
                setActiveImage(index);
              }}
            >
              <AppImage
                source={productImage(item, 200)}
                className={cn(
                  'bg-muted h-16 w-16 rounded-lg border-2',
                  index === activeImage ? 'border-primary' : 'border-transparent',
                )}
                contentFit="cover"
              />
            </Pressable>
          )}
        />

        {/* Info */}
        <View className="gap-3 px-4 pt-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-primary text-xs font-bold uppercase tracking-widest">
              {product.brand}
            </Text>
            <Text className="text-muted-foreground text-xs">·</Text>
            <Text className="text-muted-foreground text-xs">
              SKU: ECM-{product.id.toUpperCase()}
            </Text>
          </View>
          <Text className="text-foreground text-xl font-bold leading-tight">{name}</Text>
          <View className="flex-row items-center gap-1">
            <Star size={13} color="#f59e0b" fill="#f59e0b" />
            <Text className="text-sm font-medium">{product.rating.toFixed(1)}</Text>
            <Text className="text-muted-foreground text-xs">
              ({t('product.reviewsCount').replace('{count}', String(product.reviewCount))})
            </Text>
          </View>

          {/* Price */}
          <View className="border-border flex-row items-end justify-between border-y py-4">
            <View>
              {product.oldPrice ? (
                <Text className="text-muted-foreground text-xs line-through">
                  {formatMoney(product.oldPrice)}
                </Text>
              ) : null}
              <View className="flex-row items-baseline gap-2">
                <Text className="text-foreground text-2xl font-black">
                  {formatMoney(product.price)}
                </Text>
                {discount > 0 ? (
                  <View className="bg-accent rounded-md px-1.5 py-0.5">
                    <Text className="text-[10px] font-bold text-white">−{discount}%</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View className="flex-row items-center gap-1">
              {product.inStock ? (
                <>
                  <Check size={12} color="#10b981" />
                  <Text className="text-success text-xs font-medium">{t('product.inStock')}</Text>
                </>
              ) : (
                <Text className="text-muted-foreground text-xs">{t('product.outOfStock')}</Text>
              )}
            </View>
          </View>

          {/* Color */}
          <View>
            <Text className="text-sm font-semibold">
              {t('product.color')}:{' '}
              <Text className="text-muted-foreground font-normal">{selectedColor?.label}</Text>
            </Text>
            <View className="mt-2 flex-row gap-2">
              {COLORS.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setColor(c.id)}
                  className={cn(
                    'h-9 w-9 rounded-full border-2',
                    c.id === color ? 'border-primary' : 'border-border',
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </View>
          </View>

          {/* Sizes */}
          {sizes.length > 0 ? (
            <View>
              <Text className="text-sm font-semibold">
                {t('product.size')}:{' '}
                <Text className="text-muted-foreground font-normal">
                  {size ?? t('product.selectSize')}
                </Text>
              </Text>
              <View className="mt-2 flex-row flex-wrap gap-2">
                {sizes.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setSize(s)}
                    className={cn(
                      'h-10 min-w-12 items-center justify-center rounded-lg border px-3',
                      s === size
                        ? 'border-primary bg-primary'
                        : 'border-border bg-card active:bg-muted',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-sm font-medium',
                        s === size ? 'text-white' : 'text-foreground',
                      )}
                    >
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* Quantity */}
          <View className="flex-row items-center gap-3">
            <Text className="text-sm font-semibold">{t('product.quantity')}:</Text>
            <View className="border-border flex-row items-center gap-2 rounded-full border">
              <Pressable
                onPress={() => {
                  haptics.light();
                  setQty((q) => Math.max(1, q - 1));
                }}
                className="h-9 w-9 items-center justify-center"
                hitSlop={4}
              >
                <Minus size={14} color="#0A0A0C" />
              </Pressable>
              <Text className="min-w-6 text-center text-base font-semibold">{qty}</Text>
              <Pressable
                onPress={() => {
                  haptics.light();
                  setQty((q) => q + 1);
                }}
                className="h-9 w-9 items-center justify-center"
                hitSlop={4}
              >
                <Plus size={14} color="#0A0A0C" />
              </Pressable>
            </View>
          </View>

          {/* Delivery info */}
          <View className="border-border bg-card mt-2 gap-2 rounded-2xl border p-3">
            {[
              { icon: Truck, text: t('product.deliveryFast') },
              { icon: Undo2, text: t('product.deliveryReturn') },
              { icon: ShieldCheck, text: t('product.deliveryAuthentic') },
            ].map((d) => {
              const Icon = d.icon;
              return (
                <View key={d.text} className="flex-row items-center gap-2">
                  <Icon size={14} color="#0A0A0C" />
                  <Text className="text-foreground flex-1 text-xs">{d.text}</Text>
                </View>
              );
            })}
          </View>

          {/* Description */}
          <View className="mt-2">
            <Text className="text-sm font-semibold">{t('product.description')}</Text>
            <Text className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {name} — premium material va zamonaviy dizayn uyg&apos;unligi. Har bir detal
              o&apos;ylab tayyorlangan: ergonomik shakl, chidamli komponentlar va estetik
              ko&apos;rinish.
            </Text>
          </View>

          {/* Specs */}
          <View className="border-border bg-card mt-2 rounded-2xl border">
            {[
              [t('catalog.brand'), product.brand],
              ['SKU', `ECM-${product.id.toUpperCase()}`],
              [t('product.warranty'), '12 oy'],
              [t('catalog.sortBy.rating'), `${product.rating.toFixed(1)} / 5.0`],
            ].map(([k, v], i, arr) => (
              <View
                key={k}
                className={cn(
                  'flex-row justify-between px-4 py-3',
                  i < arr.length - 1 && 'border-border border-b',
                )}
              >
                <Text className="text-muted-foreground text-xs">{k}</Text>
                <Text className="text-xs font-medium">{v}</Text>
              </View>
            ))}
          </View>

          {/* Related */}
          {related.length > 0 ? (
            <View className="mt-4">
              <Text className="mb-3 text-base font-bold">{t('product.sameCategory')}</Text>
              <FlatList
                data={related}
                keyExtractor={(p) => p.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
                renderItem={({ item }) => (
                  <View style={{ width: 160 }}>
                    <ProductCard product={item} />
                  </View>
                )}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky bottom actions */}
      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="border-border bg-background absolute inset-x-0 bottom-0 border-t px-4 pt-3"
      >
        <View className="flex-row gap-2">
          <Button
            variant="outline"
            size="lg"
            onPress={() => onAdd(false)}
            disabled={!product.inStock}
            leftIcon={<ShoppingBag size={16} color="#0A0A0C" />}
            style={{ flex: 1 }}
          >
            {t('product.addToCart')}
          </Button>
          <Button
            size="lg"
            onPress={() => onAdd(true)}
            disabled={!product.inStock}
            style={{ flex: 1.5 }}
          >
            {t('product.buyNow')}
          </Button>
        </View>
      </View>
    </View>
  );
}
