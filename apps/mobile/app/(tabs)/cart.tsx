import { useRouter } from 'expo-router';
import { ArrowRight, Minus, Plus, ShoppingBag, Ticket, Trash2, Truck } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMoney } from '../../src/lib/format';
import { haptics } from '../../src/lib/haptics';
import { productImage } from '../../src/lib/mock-data';
import { useT } from '../../src/lib/useT';
import { type CartItem, useCart } from '../../src/store/cart';
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
  const removeItem = useCart((s) => s.removeItem);
  const updateQuantity = useCart((s) => s.updateQuantity);
  const clear = useCart((s) => s.clear);

  const onCheckout = () => {
    if (!isAuthenticated) {
      toast({ title: t('auth.loginRequired'), duration: 2500 });
      router.push('/auth/login?redirect=/checkout');
      return;
    }
    router.push('/checkout');
  };

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <View className="bg-paper flex-1" style={{ paddingTop: insets.top }}>
        <View className="px-4 pt-4">
          <Text className="text-foreground font-serif text-2xl">{t('cart.title')}</Text>
        </View>
        <EmptyState
          icon={<ShoppingBag size={32} color="#762237" />}
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
    <View className="bg-paper flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-3.5">
        <View>
          <Text className="text-foreground font-serif text-2xl leading-7">{t('cart.title')}</Text>
          <Text className="text-muted-foreground mt-1 text-xs">
            {t('cart.itemsSummary')
              .replace('{items}', String(items.length))
              .replace('{units}', String(items.reduce((s, i) => s + i.quantity, 0)))}
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
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 220,
          gap: 10,
          paddingTop: 4,
        }}
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

        {/* Promokod */}
        <Pressable
          onPress={() => router.push('/checkout')}
          className="mt-0.5 flex-row items-center gap-2.5 rounded-2xl border border-dashed px-3.5 py-3"
          style={{ backgroundColor: '#FDFBF6', borderColor: '#E5C77A' }}
        >
          <Ticket size={18} color="#8a6d2f" />
          <Text className="flex-1 text-xs" style={{ color: '#8a6d2f' }}>
            Promokod kiriting
          </Text>
          <View className="rounded-full px-3.5 py-1.5" style={{ backgroundColor: '#C9A961' }}>
            <Text className="text-xs font-bold" style={{ color: '#3A0E19' }}>
              Qo'llash
            </Text>
          </View>
        </Pressable>
      </ScrollView>

      {/* Sticky footer */}
      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="border-border gap-2.5 border-t bg-white px-4 pt-3.5"
      >
        {subtotal < FREE_SHIPPING_THRESHOLD ? (
          <View
            className="flex-row items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ backgroundColor: '#FDF3F5' }}
          >
            <Truck size={15} color="#531625" />
            <Text className="text-primary text-[11px]">
              {t('cart.freeShipHint').replace(
                '{amount}',
                formatMoney(FREE_SHIPPING_THRESHOLD - subtotal),
              )}
            </Text>
          </View>
        ) : null}
        <View className="gap-1.5">
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground text-[13px]">{t('cart.subtotal')}</Text>
            <Text className="text-foreground text-[13px]">{formatMoney(subtotal)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground text-[13px]">{t('cart.shipping')}</Text>
            <Text
              className={
                shipping === 0
                  ? 'text-success text-[13px] font-semibold'
                  : 'text-foreground text-[13px]'
              }
            >
              {shipping === 0 ? t('cart.shippingFree') : formatMoney(shipping)}
            </Text>
          </View>
          <View className="border-border mt-1 flex-row items-center justify-between border-t pt-2">
            <Text className="text-foreground text-[15px] font-bold">{t('cart.total')}</Text>
            <Text className="text-foreground font-serif-bold text-lg">{formatMoney(total)}</Text>
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
  const router = useRouter();
  return (
    <View className="border-border flex-row gap-3 rounded-2xl border bg-white p-3">
      <Pressable onPress={() => router.push(`/product/${item.slug}` as never)}>
        <AppImage
          source={productImage(item.imageSeed, 200)}
          className="bg-muted h-[82px] w-[82px] rounded-xl"
          contentFit="cover"
        />
      </Pressable>
      <View className="flex-1 gap-1">
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <Text className="text-[10px] font-extrabold uppercase tracking-wide text-neutral-300">
              {item.brand}
            </Text>
            <Text
              numberOfLines={2}
              className="text-foreground text-[13px] font-medium leading-[17px]"
            >
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
            <Trash2 size={15} color="#9a9aa2" />
          </Pressable>
        </View>
        <View className="mt-auto flex-row items-end justify-between">
          <View className="border-border flex-row items-center rounded-full border">
            <Pressable
              onPress={() => {
                haptics.light();
                onQty(Math.max(1, item.quantity - 1));
              }}
              className="h-[30px] w-[30px] items-center justify-center"
            >
              <Minus size={13} color="#0A0A0C" />
            </Pressable>
            <Text className="min-w-[22px] text-center text-[13px] font-bold">{item.quantity}</Text>
            <Pressable
              onPress={() => {
                haptics.light();
                onQty(item.quantity + 1);
              }}
              className="h-[30px] w-[30px] items-center justify-center"
            >
              <Plus size={13} color="#0A0A0C" />
            </Pressable>
          </View>
          <Text className="text-foreground font-serif-bold text-base">
            {formatMoney(item.unitPrice * item.quantity)}
          </Text>
        </View>
      </View>
    </View>
  );
}
