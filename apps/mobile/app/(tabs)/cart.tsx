import { useRouter } from 'expo-router';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMoney } from '../../src/lib/format';
import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/lib/useT';
import { productImage } from '../../src/lib/mock-data';
import { useCart, type CartItem } from '../../src/store/cart';
import { useSession } from '../../src/store/session';
import { toast } from '../../src/store/toast';
import { AppImage } from '../../src/ui/app-image';
import { Button } from '../../src/ui/button';
import { EmptyState } from '../../src/ui/empty-state';

const FREE_SHIPPING_THRESHOLD = 500_000;
const SHIPPING_FEE = 20_000;

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  const items = useCart((s) => s.items);

  // Buyurtma rasmiylashtirish — faqat ro'yxatdan o'tgan mijozlar uchun.
  // Mehmon ko'rishi/savatga qo'shishi mumkin, lekin checkout'da login talab qilinadi.
  const onCheckout = () => {
    if (!isAuthenticated) {
      toast({ title: t('auth.loginRequired'), duration: 2500 });
      router.push('/auth/login?redirect=/checkout');
      return;
    }
    router.push('/checkout');
  };
  const removeItem = useCart((s) => s.removeItem);
  const updateQuantity = useCart((s) => s.updateQuantity);
  const clear = useCart((s) => s.clear);

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
        <View className="px-4 pt-4">
          <Text className="text-foreground text-2xl font-bold">{t('cart.title')}</Text>
        </View>
        <EmptyState
          icon={<ShoppingBag size={32} color="#94a3b8" />}
          title={t('cart.empty')}
          description={t('cart.emptyHint')}
          action={
            <Button fullWidth onPress={() => router.push('/catalog')}>
              {t('cart.openCatalog')}
            </Button>
          }
        />
      </View>
    );
  }

  return (
    <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
        <View>
          <Text className="text-foreground text-2xl font-bold">{t('cart.title')}</Text>
          <Text className="text-muted-foreground text-xs">
            {items.length} ta · {items.reduce((s, i) => s + i.quantity, 0)} dona
          </Text>
        </View>
        <Pressable
          onPress={() => {
            clear();
            toast({ title: t('cart.cleared') });
          }}
          hitSlop={6}
        >
          <Text className="text-muted-foreground text-xs">{t('common.clear')}</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 200, gap: 10 }}
      >
        {items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            onRemove={() => {
              removeItem(item.id);
              toast({ title: t('cart.itemRemoved'), description: item.name });
            }}
            onQty={(q) => updateQuantity(item.id, q)}
          />
        ))}
      </ScrollView>

      {/* Sticky footer */}
      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="border-border bg-background gap-3 border-t px-4 pt-4"
      >
        {subtotal < FREE_SHIPPING_THRESHOLD ? (
          <View className="rounded-md bg-amber-50 p-2.5">
            <Text className="text-xs text-amber-800">
              {t('cart.freeShipHint').replace(
                '{amount}',
                formatMoney(FREE_SHIPPING_THRESHOLD - subtotal),
              )}
            </Text>
          </View>
        ) : null}
        <View className="gap-1">
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground text-sm">{t('cart.subtotal')}</Text>
            <Text className="text-sm">{formatMoney(subtotal)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground text-sm">{t('cart.shipping')}</Text>
            <Text className={shipping === 0 ? 'text-success text-sm font-semibold' : 'text-sm'}>
              {shipping === 0 ? t('cart.shippingFree') : formatMoney(shipping)}
            </Text>
          </View>
          <View className="border-border mt-1 flex-row justify-between border-t pt-2">
            <Text className="text-base font-bold">{t('cart.total')}</Text>
            <Text className="text-base font-bold">{formatMoney(total)}</Text>
          </View>
        </View>
        <Button
          fullWidth
          size="lg"
          onPress={onCheckout}
          rightIcon={<ArrowRight size={16} color="#fff" />}
        >
          {t('cart.checkout')}
        </Button>
      </View>
    </View>
  );
}

function CartItemRow({
  item,
  onRemove,
  onQty,
}: {
  item: CartItem;
  onRemove: () => void;
  onQty: (q: number) => void;
}) {
  const { t } = useT();
  return (
    <View className="border-border bg-card flex-row gap-3 rounded-2xl border p-3">
      <AppImage
        source={productImage(item.imageSeed, 200)}
        className="bg-muted h-20 w-20 rounded-lg"
        contentFit="cover"
      />
      <View className="flex-1 gap-1">
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <Text className="text-muted-foreground text-[10px] font-bold uppercase tracking-wide">
              {item.brand}
            </Text>
            <Text numberOfLines={2} className="text-foreground text-sm font-medium">
              {item.name}
            </Text>
            {item.color || item.size ? (
              <Text className="text-muted-foreground text-[11px]">
                {[
                  item.color && `${t('cart.color')}: ${item.color}`,
                  item.size && `${t('cart.size')}: ${item.size}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={onRemove}
            hitSlop={6}
            className="active:bg-muted h-7 w-7 items-center justify-center rounded-full"
          >
            <Trash2 size={14} color="#6B6B73" />
          </Pressable>
        </View>
        <View className="mt-auto flex-row items-end justify-between">
          <View className="border-border flex-row items-center gap-2 rounded-full border">
            <Pressable
              onPress={() => {
                haptics.light();
                onQty(Math.max(1, item.quantity - 1));
              }}
              hitSlop={4}
              className="h-7 w-7 items-center justify-center"
            >
              <Minus size={12} color="#0A0A0C" />
            </Pressable>
            <Text className="min-w-5 text-center text-sm font-semibold">{item.quantity}</Text>
            <Pressable
              onPress={() => {
                haptics.light();
                onQty(item.quantity + 1);
              }}
              hitSlop={4}
              className="h-7 w-7 items-center justify-center"
            >
              <Plus size={12} color="#0A0A0C" />
            </Pressable>
          </View>
          <Text className="text-foreground text-sm font-bold">
            {formatMoney(item.unitPrice * item.quantity)}
          </Text>
        </View>
      </View>
    </View>
  );
}
