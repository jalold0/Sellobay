// Buyurtma detali ekrani — orkestr: React Query hooklar, bekor/qaytarish
// amallari va bo'limlar renderi. i18n lug'ati, UI bo'laklar va tahrir modali
// src/components/orders/* da.
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Package, Pencil, Phone, Undo2, X } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { L, STATUS_BADGE } from '../../src/components/orders/order-detail-i18n';
import { DetailHeader, Row } from '../../src/components/orders/order-detail-ui';
import { OrderEditModal } from '../../src/components/orders/order-edit-modal';
import { formatDate, formatMoney, pickLocalized } from '../../src/lib/format';
import { haptics } from '../../src/lib/haptics';
import { useCancelOrder, useOrder, useReturnOrder } from '../../src/lib/hooks';
import { useT } from '../../src/lib/useT';
import { useLocale } from '../../src/store/locale';
import { toast } from '../../src/store/toast';
import { AppImage } from '../../src/ui/app-image';
import { Button } from '../../src/ui/button';
import { cn } from '../../src/ui/cn';

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const locale = useLocale((s) => s.locale);
  const tr = L[locale] ?? L.uz;
  const { id } = useLocalSearchParams<{ id: string }>();

  // React Query — unmount'ni o'zi boshqaradi (mounted-guard kerak emas),
  // bekor/tahrir mutatsiyalari keshni yangilaydi (ro'yxat stale qolmaydi).
  const { data: order, isLoading: loading } = useOrder(id);
  const cancelMutation = useCancelOrder();
  const returnMutation = useReturnOrder();
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState(false);

  const onCancel = () => {
    Alert.alert(tr.cancelConfirm, tr.cancelDesc, [
      { text: tr.no, style: 'cancel' },
      {
        text: tr.yes,
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          const res = await cancelMutation.mutateAsync(id);
          if (!res.success) {
            haptics.error();
            toast({ title: res.error?.message ?? tr.cancelled, variant: 'destructive' });
            return;
          }
          haptics.success();
          toast({ title: tr.cancelled, variant: 'success' });
          // kesh invalidatsiyasi useCancelOrder ichida bajariladi
        },
      },
    ]);
  };

  const onReturn = () => {
    Alert.alert(tr.returnConfirm, tr.returnDesc, [
      { text: tr.no, style: 'cancel' },
      {
        text: tr.returnYes,
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          const res = await returnMutation.mutateAsync({ id });
          if (!res.success) {
            haptics.error();
            toast({ title: res.error?.message ?? tr.returned, variant: 'destructive' });
            return;
          }
          haptics.success();
          toast({ title: tr.returned, variant: 'success' });
          // kesh invalidatsiyasi useReturnOrder ichida bajariladi
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
        <DetailHeader title={tr.title} onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#531625" />
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
        <DetailHeader title={tr.title} onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-8">
          <Package size={32} color="#94a3b8" />
          <Text className="text-muted-foreground mt-3 text-center">{tr.notEditable}</Text>
        </View>
      </View>
    );
  }

  const badge = STATUS_BADGE[order.status] ?? STATUS_BADGE.PENDING;
  const addr = order.shippingAddress;
  const discount = Number(order.discountTotal);
  const shipping = Number(order.shippingTotal);
  const deliveryLabel =
    order.deliveryMethod === 'PICKUP_POINT'
      ? tr.pickup
      : order.deliveryMethod === 'EXPRESS'
        ? tr.express
        : tr.home;

  return (
    <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
      <DetailHeader title={order.number} onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: insets.bottom + (order.editable || order.returnable ? 100 : 32),
          gap: 14,
        }}
      >
        {/* Status */}
        <View className="border-border bg-card flex-row items-center justify-between rounded-2xl border p-4">
          <View className={cn('rounded-full px-3 py-1', badge.bg)}>
            <Text className={cn('text-xs font-bold', badge.text)}>
              {t(`order.status.${order.status}`)}
            </Text>
          </View>
          <Text className="text-muted-foreground text-xs">{formatDate(order.placedAt)}</Text>
        </View>

        {/* Items */}
        <View className="border-border bg-card rounded-2xl border p-4">
          <Text className="text-muted-foreground mb-2 text-[10px] font-bold uppercase tracking-widest">
            {tr.items} ({order.itemCount})
          </Text>
          {order.items.map((it, i) => (
            <View
              key={it.id}
              className={cn('flex-row items-center gap-3 py-2', i > 0 && 'border-border border-t')}
            >
              <View className="bg-muted h-12 w-12 overflow-hidden rounded-lg">
                {it.imageUrl ? (
                  <AppImage
                    source={{ uri: it.imageUrl }}
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <View className="h-full w-full items-center justify-center">
                    <Package size={18} color="#cbd5e1" />
                  </View>
                )}
              </View>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={2} className="text-foreground text-sm">
                  {pickLocalized(it.nameSnapshot, locale)}
                </Text>
                <Text className="text-muted-foreground text-xs">
                  {it.quantity} × {formatMoney(Number(it.unitPrice))}
                </Text>
              </View>
              <Text className="text-foreground text-sm font-medium">
                {formatMoney(Number(it.totalPrice))}
              </Text>
            </View>
          ))}
        </View>

        {/* Topshirish punkti (PICKUP_POINT) */}
        {order.pickupPoint ? (
          <View className="border-border bg-card gap-1.5 rounded-2xl border p-4">
            <Text className="text-muted-foreground mb-1 text-[10px] font-bold uppercase tracking-widest">
              {tr.pickup}
            </Text>
            <View className="flex-row items-start gap-2">
              <MapPin size={14} color="#94a3b8" style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-foreground text-xs font-semibold">
                  {pickLocalized(order.pickupPoint.name, locale)} · {order.pickupPoint.provider}
                </Text>
                <Text className="text-muted-foreground text-xs">
                  {[
                    order.pickupPoint.region,
                    order.pickupPoint.city,
                    order.pickupPoint.district,
                    order.pickupPoint.street,
                    order.pickupPoint.building,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
                {order.pickupPoint.workingHours ? (
                  <Text className="text-muted-foreground text-xs">
                    {order.pickupPoint.workingHours}
                  </Text>
                ) : null}
              </View>
            </View>
            {addr ? (
              <View className="flex-row items-center gap-2">
                <Phone size={14} color="#94a3b8" />
                <Text className="text-muted-foreground text-xs">
                  {addr.recipientName} · {addr.phone}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Address (uygacha/express) */}
        {addr && !order.pickupPoint ? (
          <View className="border-border bg-card gap-1.5 rounded-2xl border p-4">
            <Text className="text-muted-foreground mb-1 text-[10px] font-bold uppercase tracking-widest">
              {tr.delivery}
            </Text>
            <View className="flex-row items-start gap-2">
              <MapPin size={14} color="#94a3b8" style={{ marginTop: 2 }} />
              <View className="flex-1">
                <Text className="text-foreground text-xs font-semibold">{deliveryLabel}</Text>
                <Text className="text-muted-foreground text-xs">
                  {[
                    addr.region,
                    addr.city,
                    addr.district,
                    addr.street,
                    addr.building,
                    addr.apartment,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <Phone size={14} color="#94a3b8" />
              <Text className="text-muted-foreground text-xs">
                {addr.recipientName} · {addr.phone}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Totals */}
        <View className="border-border bg-card gap-2 rounded-2xl border p-4">
          <Row label={tr.subtotal} value={formatMoney(Number(order.subtotal))} />
          <Row label={tr.shipping} value={shipping === 0 ? tr.free : formatMoney(shipping)} />
          {discount > 0 ? (
            <Row
              label={order.promoCode ? `${tr.discount} (${order.promoCode})` : tr.discount}
              value={`−${formatMoney(discount)}`}
              accent
            />
          ) : null}
          <View className="border-border mt-1 flex-row items-center justify-between border-t pt-2">
            <Text className="text-foreground font-bold">{tr.total}</Text>
            <Text className="text-foreground text-base font-black">
              {formatMoney(Number(order.grandTotal))}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Actions — faqat PENDING (sotuvchi qabul qilguncha) */}
      {order.editable ? (
        <View
          style={{ paddingBottom: insets.bottom + 12 }}
          className="border-border bg-background absolute inset-x-0 bottom-0 flex-row gap-2 border-t px-4 pt-3"
        >
          <View className="flex-1">
            <Button
              variant="outline"
              fullWidth
              leftIcon={<Pencil size={16} color="#0A0A0C" />}
              onPress={() => {
                haptics.light();
                setEditing(true);
              }}
            >
              {tr.edit}
            </Button>
          </View>
          <View className="flex-1">
            <Button
              variant="destructive"
              fullWidth
              loading={cancelMutation.isPending}
              leftIcon={<X size={16} color="#fff" />}
              onPress={onCancel}
            >
              {tr.cancel}
            </Button>
          </View>
        </View>
      ) : null}

      {/* Qaytarish — faqat DELIVERED (14 kun oynasi ichida) */}
      {!order.editable && order.returnable ? (
        <View
          style={{ paddingBottom: insets.bottom + 12 }}
          className="border-border bg-background absolute inset-x-0 bottom-0 border-t px-4 pt-3"
        >
          <Button
            variant="outline"
            fullWidth
            loading={returnMutation.isPending}
            leftIcon={<Undo2 size={16} color="#0A0A0C" />}
            onPress={onReturn}
          >
            {tr.return}
          </Button>
        </View>
      ) : null}

      {editing ? (
        <OrderEditModal
          order={order}
          tr={tr}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            // React Query keshini yangilaymiz → ekran + ro'yxat darhol mos keladi
            qc.setQueryData(['order', id], updated);
            void qc.invalidateQueries({ queryKey: ['orders'] });
            setEditing(false);
            haptics.success();
            toast({ title: tr.saved, variant: 'success' });
          }}
        />
      ) : null}
    </View>
  );
}
