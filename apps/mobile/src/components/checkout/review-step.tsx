// Tasdiq bosqichi: qabul qiluvchi / yetkazish / to'lov bloklari,
// promokod kiritish va mahsulotlar ro'yxati.
import { Tag, X } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';

import { type PickupPoint, type PromoType } from '../../lib/api';
import { formatMoney, pickLocalized } from '../../lib/format';
import { productImage } from '../../lib/mock-data';
import { type CartItem } from '../../store/cart';
import { AppImage } from '../../ui/app-image';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

import { ReviewBlock } from './checkout-ui';
import { PAYMENT_OPTIONS, type AddressForm, type DeliveryType, type PaymentId } from './types';

import type { Locale } from '@ecom/i18n';

type Props = {
  address: AddressForm;
  deliveryType: DeliveryType | null;
  deliveryMethod: 'HOME_DELIVERY' | 'PICKUP_POINT' | 'EXPRESS';
  selectedPickup: PickupPoint | null;
  locale: Locale;
  payment: PaymentId;
  items: CartItem[];
  onEditDelivery: () => void;
  onEditPayment: () => void;
  promoInput: string;
  onChangePromoInput: (v: string) => void;
  appliedPromo: { code: string; type: PromoType; discount: number } | null;
  promoDiscount: number;
  promoLoading: boolean;
  promoError: string;
  onApplyPromo: () => void;
  onClearPromo: () => void;
};

export function ReviewStep({
  address,
  deliveryType,
  deliveryMethod,
  selectedPickup,
  locale,
  payment,
  items,
  onEditDelivery,
  onEditPayment,
  promoInput,
  onChangePromoInput,
  appliedPromo,
  promoDiscount,
  promoLoading,
  promoError,
  onApplyPromo,
  onClearPromo,
}: Props) {
  return (
    <View className="gap-3">
      <ReviewBlock title="Qabul qiluvchi" onEdit={onEditDelivery}>
        <Text className="text-sm">
          {address.firstName} {address.lastName} · {address.phone}
        </Text>
        <Text className="text-muted-foreground text-xs">
          {[address.region, address.city, address.street, address.apartment]
            .filter(Boolean)
            .join(', ')}
        </Text>
      </ReviewBlock>
      <ReviewBlock title="Yetkazib berish" onEdit={onEditDelivery}>
        <Text className="text-sm">
          {deliveryType === 'REGION_PICKUP'
            ? `Olib ketish${selectedPickup ? ` — ${pickLocalized(selectedPickup.name, locale)}` : ''}`
            : deliveryMethod === 'EXPRESS'
              ? 'Toshkent — Express'
              : 'Toshkent — uyga'}
        </Text>
        {deliveryType === 'REGION_PICKUP' && selectedPickup ? (
          <Text className="text-muted-foreground text-xs">
            {[selectedPickup.region, selectedPickup.city, selectedPickup.street]
              .filter(Boolean)
              .join(', ')}
          </Text>
        ) : null}
      </ReviewBlock>
      <ReviewBlock title="To`lov" onEdit={onEditPayment}>
        <Text className="text-sm">{PAYMENT_OPTIONS.find((p) => p.id === payment)?.label}</Text>
      </ReviewBlock>

      {/* Promokod */}
      <View className="border-border bg-card rounded-2xl border p-3">
        <View className="mb-2 flex-row items-center gap-1.5">
          <Tag size={13} color="#6B6B73" />
          <Text className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
            Promokod
          </Text>
        </View>
        {appliedPromo ? (
          <View className="flex-row items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5">
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-emerald-800">{appliedPromo.code}</Text>
              <Text className="text-xs text-emerald-700">−{formatMoney(promoDiscount)}</Text>
            </View>
            <Pressable onPress={onClearPromo} hitSlop={8} className="active:opacity-70">
              <X size={18} color="#047857" />
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-end gap-2">
            <View className="flex-1">
              <Input
                value={promoInput}
                onChangeText={onChangePromoInput}
                placeholder="Promokod kiriting"
                autoCapitalize="characters"
                autoCorrect={false}
                error={promoError || undefined}
              />
            </View>
            <Button
              variant="outline"
              loading={promoLoading}
              disabled={!promoInput.trim()}
              onPress={onApplyPromo}
              style={{ marginBottom: promoError ? 22 : 0 }}
            >
              Qo&apos;llash
            </Button>
          </View>
        )}
      </View>
      <ReviewBlock title={`Mahsulotlar (${items.length})`}>
        {items.map((it) => (
          <View key={it.id} className="flex-row items-center gap-2 py-1">
            <AppImage
              source={productImage(it.imageSeed, 100)}
              className="bg-muted h-10 w-10 rounded-md"
              contentFit="cover"
            />
            <View className="flex-1">
              <Text numberOfLines={1} className="text-xs">
                {it.name}
              </Text>
              <Text className="text-muted-foreground text-[11px]">
                {it.quantity} × {formatMoney(it.unitPrice)}
              </Text>
            </View>
            <Text className="text-xs font-medium">{formatMoney(it.unitPrice * it.quantity)}</Text>
          </View>
        ))}
      </ReviewBlock>
    </View>
  );
}
