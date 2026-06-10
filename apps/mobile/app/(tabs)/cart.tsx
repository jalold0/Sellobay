import { useRouter } from 'expo-router';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMoney } from '../../src/lib/format';
import { productImage } from '../../src/lib/mock-data';
import { useCart, type CartItem } from '../../src/store/cart';
import { toast } from '../../src/store/toast';
import { Button } from '../../src/ui/button';
import { EmptyState } from '../../src/ui/empty-state';

const FREE_SHIPPING_THRESHOLD = 500_000;
const SHIPPING_FEE = 20_000;

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const items = useCart((s) => s.items);
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
          <Text className="text-foreground text-2xl font-bold">Savatcha</Text>
        </View>
        <EmptyState
          icon={<ShoppingBag size={32} color="#94a3b8" />}
          title="Savatcha bo`sh"
          description="Mahsulotlarni katalogdan tanlab savatga qo`shing"
          action={
            <Button fullWidth onPress={() => router.push('/catalog')}>
              Katalogga o&apos;tish
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
          <Text className="text-foreground text-2xl font-bold">Savatcha</Text>
          <Text className="text-muted-foreground text-xs">
            {items.length} ta · {items.reduce((s, i) => s + i.quantity, 0)} dona
          </Text>
        </View>
        <Pressable
          onPress={() => {
            clear();
            toast({ title: 'Savatcha tozalandi' });
          }}
          hitSlop={6}
        >
          <Text className="text-muted-foreground text-xs">Tozalash</Text>
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
              toast({ title: 'O`chirildi', description: item.name });
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
              Yana {formatMoney(FREE_SHIPPING_THRESHOLD - subtotal)} qo&apos;shing — tekin yetkazib
              berish!
            </Text>
          </View>
        ) : null}
        <View className="gap-1">
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground text-sm">Mahsulotlar</Text>
            <Text className="text-sm">{formatMoney(subtotal)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted-foreground text-sm">Yetkazib berish</Text>
            <Text className={shipping === 0 ? 'text-success text-sm font-semibold' : 'text-sm'}>
              {shipping === 0 ? 'Tekin' : formatMoney(shipping)}
            </Text>
          </View>
          <View className="border-border mt-1 flex-row justify-between border-t pt-2">
            <Text className="text-base font-bold">Jami</Text>
            <Text className="text-base font-bold">{formatMoney(total)}</Text>
          </View>
        </View>
        <Button
          fullWidth
          size="lg"
          onPress={() => router.push('/checkout')}
          rightIcon={<ArrowRight size={16} color="#fff" />}
        >
          Rasmiylashtirish
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
  return (
    <View className="border-border bg-card flex-row gap-3 rounded-2xl border p-3">
      <Image
        source={{ uri: productImage(item.imageSeed, 200) }}
        className="bg-muted h-20 w-20 rounded-lg"
        resizeMode="cover"
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
                {[item.color && `Rang: ${item.color}`, item.size && `O'lcham: ${item.size}`]
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
              onPress={() => onQty(Math.max(1, item.quantity - 1))}
              hitSlop={4}
              className="h-7 w-7 items-center justify-center"
            >
              <Minus size={12} color="#0A0A0C" />
            </Pressable>
            <Text className="min-w-5 text-center text-sm font-semibold">{item.quantity}</Text>
            <Pressable
              onPress={() => onQty(item.quantity + 1)}
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
