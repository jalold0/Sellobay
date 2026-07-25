// Yetkazish bosqichi: 1-oyna (tur tanlash) + 2-oyna (tanlangan tur tafsilotlari
// — joylashuv/tezlik yoki punkt tanlash) + qabul qiluvchi ro'yxati.
import { SHIPPING_FEE, EXPRESS_FEE, FREE_SHIPPING_THRESHOLD } from '@ecom/core-domain';
import { AlertTriangle, Check, Home, MapPin, Plus, Store } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, Text, View } from 'react-native';

import { type ApiAddress, type PickupPoint } from '../../lib/api';
import { formatMoney, pickLocalized } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import { Button } from '../../ui/button';
import { cn } from '../../ui/cn';

import { type AddressForm, type DeliveryType, type HomeSpeed } from './types';

import type { Locale } from '@ecom/i18n';

type Props = {
  deliveryType: DeliveryType | null;
  onChangeDeliveryType: (v: DeliveryType | null) => void;
  homeSpeed: HomeSpeed;
  onChangeHomeSpeed: (v: HomeSpeed) => void;
  address: AddressForm;
  hasLocation: boolean;
  locationInTashkent: boolean;
  homeOutsideTashkent: boolean;
  subtotal: number;
  pickupPoints: PickupPoint[];
  selectedPickupId: string | null;
  onSelectPickup: (id: string) => void;
  locale: Locale;
  savedAddresses: ApiAddress[] | null;
  selectedAddressId: string | null;
  onPickSaved: (a: ApiAddress) => void;
  onEditCurrent: () => void;
  onNewRecipient: () => void;
  onOpenMap: () => void;
  onOpenPickupMap: () => void;
  onSwitchToPickup: () => void;
};

export function DeliveryStep(props: Props) {
  const {
    deliveryType,
    onChangeDeliveryType,
    homeSpeed,
    onChangeHomeSpeed,
    address,
    hasLocation,
    locationInTashkent,
    homeOutsideTashkent,
    subtotal,
    pickupPoints,
    selectedPickupId,
    onSelectPickup,
    locale,
    savedAddresses,
    selectedAddressId,
    onPickSaved,
    onEditCurrent,
    onNewRecipient,
    onOpenMap,
    onOpenPickupMap,
    onSwitchToPickup,
  } = props;

  // 1-OYNA: faqat 2 ta tanlov — boshqa hech narsa yo'q
  if (deliveryType === null) {
    return (
      <View className="gap-3">
        <Text className="text-muted-foreground text-xs font-medium">
          Yetkazib berish turini tanlang
        </Text>
        <Pressable
          onPress={() => {
            haptics.select();
            onChangeDeliveryType('TASHKENT_HOME');
          }}
          className="border-border active:bg-muted flex-row items-center gap-3 rounded-2xl border-2 p-4"
        >
          <Home size={24} color="#531625" />
          <View className="flex-1">
            <Text className="font-semibold">Toshkent shahar — uyga</Text>
            <Text className="text-muted-foreground text-xs">Eshigingizgacha yetkazamiz</Text>
          </View>
          <Text className="text-muted-foreground text-xl">›</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            haptics.select();
            onChangeDeliveryType('REGION_PICKUP');
          }}
          className="border-border active:bg-muted flex-row items-center gap-3 rounded-2xl border-2 p-4"
        >
          <Store size={24} color="#531625" />
          <View className="flex-1">
            <Text className="font-semibold">Viloyatlar — olib ketish punkti</Text>
            <Text className="text-muted-foreground text-xs">
              Sizga yaqin punktdan olasiz · tekin
            </Text>
          </View>
          <Text className="text-muted-foreground text-xl">›</Text>
        </Pressable>
      </View>
    );
  }

  // 2-OYNA: tanlangan bo'lim — ikkinchi variant ko'rinmaydi
  return (
    <View className="gap-4">
      {/* Tanlangan tur — o'zgartirish (turlar ro'yxatiga qaytadi) */}
      <Pressable
        onPress={() => {
          haptics.light();
          onChangeDeliveryType(null);
        }}
        className="bg-muted flex-row items-center gap-2 rounded-xl p-3 active:opacity-80"
      >
        {deliveryType === 'TASHKENT_HOME' ? (
          <Home size={18} color="#531625" />
        ) : (
          <Store size={18} color="#531625" />
        )}
        <Text className="flex-1 text-sm font-semibold">
          {deliveryType === 'TASHKENT_HOME'
            ? 'Toshkent shahar — uyga'
            : 'Viloyatlar — olib ketish punkti'}
        </Text>
        <Text className="text-primary text-xs font-medium">O&apos;zgartirish</Text>
      </Pressable>

      {/* TASHKENT_HOME — joylashuv + tezlik */}
      {deliveryType === 'TASHKENT_HOME' && (
        <View className="gap-3">
          <Pressable
            onPress={() => {
              haptics.light();
              onOpenMap();
            }}
            className="border-primary bg-primary/5 flex-row items-center gap-2 rounded-xl border border-dashed p-3 active:opacity-80"
          >
            <MapPin size={18} color="#531625" />
            <View className="flex-1">
              <Text className="text-primary text-sm font-semibold">
                Xaritadan joylashuvni tanlash
              </Text>
              {hasLocation ? (
                <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                  {[address.city, address.street].filter(Boolean).join(', ') ||
                    'Joylashuv tanlandi'}
                </Text>
              ) : (
                <Text className="text-muted-foreground text-xs">
                  Uyingiz joylashuvini belgilang
                </Text>
              )}
            </View>
            <Text className="text-primary text-lg">›</Text>
          </Pressable>

          {homeOutsideTashkent && (
            <View className="gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
              <View className="flex-row items-start gap-2">
                <AlertTriangle size={16} color="#d97706" style={{ marginTop: 1 }} />
                <Text className="flex-1 text-xs leading-4 text-amber-800">
                  Uygacha yetkazish faqat Toshkent shahar uchun amal qiladi. O&apos;zingizga yaqin
                  olib ketish punktini tanlang.
                </Text>
              </View>
              <Button variant="outline" size="sm" onPress={onSwitchToPickup}>
                Olib ketish punktiga o&apos;tish
              </Button>
            </View>
          )}

          {hasLocation && locationInTashkent && (
            <View className="gap-2">
              <Text className="text-muted-foreground text-xs font-medium">Yetkazish tezligi</Text>
              {[
                {
                  id: 'STANDARD' as const,
                  label: 'Standart',
                  sub: '24-48 soat',
                  price: subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE,
                },
                {
                  id: 'EXPRESS' as const,
                  label: 'Express',
                  sub: '3 soat ichida',
                  price: EXPRESS_FEE,
                },
              ].map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    haptics.select();
                    onChangeHomeSpeed(opt.id);
                  }}
                  className={cn(
                    'flex-row items-center justify-between rounded-2xl border-2 p-4',
                    homeSpeed === opt.id ? 'border-primary bg-primary/5' : 'border-border',
                  )}
                >
                  <View className="flex-1">
                    <Text className="font-semibold">{opt.label}</Text>
                    <Text className="text-muted-foreground text-xs">{opt.sub}</Text>
                  </View>
                  <Text className="font-semibold">
                    {opt.price === 0 ? 'Tekin' : formatMoney(opt.price)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* REGION_PICKUP — punktni tanlash (DB'dan real punktlar) */}
      {deliveryType === 'REGION_PICKUP' && (
        <View className="gap-3">
          <Pressable
            onPress={() => {
              haptics.light();
              onOpenPickupMap();
            }}
            className="border-primary bg-primary/5 flex-row items-center gap-2 rounded-xl border border-dashed p-3 active:opacity-80"
          >
            <MapPin size={18} color="#531625" />
            <View className="flex-1">
              <Text className="text-primary text-sm font-semibold">
                Punktlarni xaritada ko&apos;rish
              </Text>
              <Text className="text-muted-foreground text-xs">
                Xaritadan o&apos;zingizga yaqin punktni toping
              </Text>
            </View>
            <Text className="text-primary text-lg">›</Text>
          </Pressable>

          <Text className="text-muted-foreground text-xs font-medium">
            Topshirish punktini tanlang
          </Text>
          {pickupPoints.length === 0 ? (
            <View className="bg-muted rounded-lg p-3">
              <Text className="text-muted-foreground text-xs">Punktlar yuklanmoqda...</Text>
            </View>
          ) : (
            pickupPoints.map((p) => {
              const sel = selectedPickupId === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    haptics.select();
                    onSelectPickup(p.id);
                  }}
                  className={cn(
                    'rounded-2xl border-2 p-3',
                    sel ? 'border-primary bg-primary/5' : 'border-border',
                  )}
                >
                  <View className="flex-row items-start gap-2">
                    <MapPin
                      size={16}
                      color={sel ? '#531625' : '#94a3b8'}
                      style={{ marginTop: 2 }}
                    />
                    <View className="min-w-0 flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-foreground flex-1 text-sm font-semibold">
                          {pickLocalized(p.name, locale)}
                        </Text>
                        <View className="bg-muted rounded-full px-2 py-0.5">
                          <Text className="text-muted-foreground text-[10px] font-bold">
                            {p.provider}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-muted-foreground text-xs">
                        {[p.region, p.city, p.street].filter(Boolean).join(', ')}
                      </Text>
                      {p.workingHours ? (
                        <Text className="text-muted-foreground text-[11px]">{p.workingHours}</Text>
                      ) : null}
                    </View>
                    {sel ? <Check size={18} color="#531625" /> : null}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      )}

      {/* Qabul qiluvchi — ro'yxat + tahrir modal (matn kiritish faqat modalda) */}
      <View className="gap-2">
        <Text className="text-muted-foreground text-xs font-medium">Qabul qiluvchi</Text>
        {savedAddresses && savedAddresses.length > 0
          ? savedAddresses.map((a) => {
              const selected = selectedAddressId === a.id;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => {
                    haptics.select();
                    onPickSaved(a);
                  }}
                  className={cn(
                    'rounded-2xl border-2 p-3',
                    selected ? 'border-primary bg-primary/5' : 'border-border',
                  )}
                >
                  <View className="flex-row items-start gap-2">
                    <MapPin
                      size={16}
                      color={selected ? '#531625' : '#94a3b8'}
                      style={{ marginTop: 2 }}
                    />
                    <View className="min-w-0 flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-foreground text-sm font-semibold">
                          {a.recipientName}
                        </Text>
                        {a.isDefault ? (
                          <View className="rounded-full bg-emerald-100 px-2 py-0.5">
                            <Text className="text-[10px] font-bold text-emerald-700">Asosiy</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-muted-foreground text-xs">{a.phone}</Text>
                    </View>
                    {selected ? <Check size={18} color="#531625" /> : null}
                  </View>
                </Pressable>
              );
            })
          : null}

        {/* Qo'lda kiritilgan joriy qabul qiluvchi (saqlanganlardan emas) */}
        {address.firstName.trim() && !selectedAddressId ? (
          <Pressable
            onPress={() => {
              haptics.light();
              onEditCurrent();
            }}
            className="border-primary bg-primary/5 rounded-2xl border-2 p-3"
          >
            <View className="flex-row items-center gap-2">
              <MapPin size={16} color="#531625" style={{ marginTop: 2 }} />
              <View className="min-w-0 flex-1">
                <Text className="text-foreground text-sm font-semibold">
                  {[address.firstName, address.lastName].filter(Boolean).join(' ')}
                </Text>
                <Text className="text-muted-foreground text-xs">{address.phone}</Text>
              </View>
              <Text className="text-primary text-xs font-medium">Tahrirlash</Text>
            </View>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => {
            haptics.light();
            onNewRecipient();
          }}
          className="border-border active:bg-muted flex-row items-center justify-center gap-2 rounded-2xl border border-dashed py-3"
        >
          <Plus size={16} color="#531625" />
          <Text className="text-primary text-sm font-semibold">Yangi qabul qiluvchi</Text>
        </Pressable>
      </View>
    </View>
  );
}
