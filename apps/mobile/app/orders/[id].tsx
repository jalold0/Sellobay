import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronLeft, MapPin, Package, Pencil, Phone, X } from 'lucide-react-native';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  cancelOrder,
  fetchOrder,
  updateOrder,
  type OrderDetail,
  type UpdateOrderInput,
} from '../../src/lib/api';
import { formatDate, formatMoney, pickLocalized } from '../../src/lib/format';
import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/lib/useT';
import { useLocale, type Locale } from '../../src/store/locale';
import { toast } from '../../src/store/toast';
import { AppImage } from '../../src/ui/app-image';
import { Button } from '../../src/ui/button';
import { cn } from '../../src/ui/cn';
import { Input } from '../../src/ui/input';

const L: Record<Locale, Record<string, string>> = {
  uz: {
    title: 'Buyurtma',
    edit: 'Tahrirlash',
    cancel: 'Bekor qilish',
    cancelConfirm: 'Buyurtmani bekor qilasizmi?',
    cancelDesc: 'Ishlatilgan Sello Coins va promokod qaytariladi.',
    no: 'Yo‘q',
    yes: 'Ha, bekor qilish',
    cancelled: 'Buyurtma bekor qilindi',
    saved: 'O‘zgarishlar saqlandi',
    delivery: 'Yetkazib berish',
    home: 'Manzilga',
    express: 'Express',
    pickup: 'Topshirish punkti',
    recipient: 'Qabul qiluvchi',
    items: 'Mahsulotlar',
    subtotal: 'Mahsulotlar',
    shipping: 'Yetkazib berish',
    discount: 'Chegirma',
    total: 'Jami',
    free: 'Tekin',
    promo: 'Promokod',
    editTitle: 'Buyurtmani tahrirlash',
    name: 'Ism familiya',
    phone: 'Telefon',
    city: 'Shahar',
    street: 'Ko‘cha, uy',
    apt: 'Kvartira/podyezd',
    save: 'Saqlash',
    notEditable: 'Bu buyurtmani endi tahrirlab bo‘lmaydi',
  },
  ru: {
    title: 'Заказ',
    edit: 'Изменить',
    cancel: 'Отменить',
    cancelConfirm: 'Отменить заказ?',
    cancelDesc: 'Использованные Sello Coins и промокод вернутся.',
    no: 'Нет',
    yes: 'Да, отменить',
    cancelled: 'Заказ отменён',
    saved: 'Изменения сохранены',
    delivery: 'Доставка',
    home: 'На адрес',
    express: 'Экспресс',
    pickup: 'Пункт выдачи',
    recipient: 'Получатель',
    items: 'Товары',
    subtotal: 'Товары',
    shipping: 'Доставка',
    discount: 'Скидка',
    total: 'Итого',
    free: 'Бесплатно',
    promo: 'Промокод',
    editTitle: 'Изменить заказ',
    name: 'Имя и фамилия',
    phone: 'Телефон',
    city: 'Город',
    street: 'Улица, дом',
    apt: 'Квартира/подъезд',
    save: 'Сохранить',
    notEditable: 'Этот заказ больше нельзя изменить',
  },
  en: {
    title: 'Order',
    edit: 'Edit',
    cancel: 'Cancel',
    cancelConfirm: 'Cancel this order?',
    cancelDesc: 'Used Sello Coins and promo code will be refunded.',
    no: 'No',
    yes: 'Yes, cancel',
    cancelled: 'Order cancelled',
    saved: 'Changes saved',
    delivery: 'Delivery',
    home: 'Home delivery',
    express: 'Express',
    pickup: 'Pickup point',
    recipient: 'Recipient',
    items: 'Items',
    subtotal: 'Items',
    shipping: 'Shipping',
    discount: 'Discount',
    total: 'Total',
    free: 'Free',
    promo: 'Promo code',
    editTitle: 'Edit order',
    name: 'Full name',
    phone: 'Phone',
    city: 'City',
    street: 'Street, house',
    apt: 'Apartment/entrance',
    save: 'Save',
    notEditable: 'This order can no longer be edited',
  },
};

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-700' },
  CONFIRMED: { bg: 'bg-sky-100', text: 'text-sky-700' },
  PAID: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  PROCESSING: { bg: 'bg-sky-100', text: 'text-sky-700' },
  PACKED: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  SHIPPED: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  OUT_FOR_DELIVERY: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  DELIVERED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CANCELLED: { bg: 'bg-rose-100', text: 'text-rose-700' },
  RETURNED: { bg: 'bg-rose-100', text: 'text-rose-700' },
  REFUNDED: { bg: 'bg-muted', text: 'text-muted-foreground' },
};

const DELIVERY_OPTIONS: Array<{ id: UpdateOrderInput['deliveryMethod']; key: string }> = [
  { id: 'HOME_DELIVERY', key: 'home' },
  { id: 'EXPRESS', key: 'express' },
  { id: 'PICKUP_POINT', key: 'pickup' },
];

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const locale = useLocale((s) => s.locale);
  const tr = L[locale] ?? L.uz;
  const { id } = useLocalSearchParams<{ id: string }>();

  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) return;
    const data = await fetchOrder(id);
    setOrder(data);
    setLoading(false);
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onCancel = () => {
    Alert.alert(tr.cancelConfirm, tr.cancelDesc, [
      { text: tr.no, style: 'cancel' },
      {
        text: tr.yes,
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          setCancelling(true);
          const res = await cancelOrder(id);
          setCancelling(false);
          if (!res.success) {
            haptics.error();
            toast({ title: res.error?.message ?? tr.cancelled, variant: 'destructive' });
            return;
          }
          haptics.success();
          toast({ title: tr.cancelled, variant: 'success' });
          await load();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
        <DetailHeader title={tr.title} onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#8B0020" />
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
          paddingBottom: insets.bottom + (order.editable ? 100 : 32),
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

        {/* Address */}
        {addr ? (
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
              loading={cancelling}
              leftIcon={<X size={16} color="#fff" />}
              onPress={onCancel}
            >
              {tr.cancel}
            </Button>
          </View>
        </View>
      ) : null}

      {editing ? (
        <EditModal
          order={order}
          tr={tr}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setOrder(updated);
            setEditing(false);
            haptics.success();
            toast({ title: tr.saved, variant: 'success' });
          }}
        />
      ) : null}
    </View>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-muted-foreground text-sm">{label}</Text>
      <Text className={cn('text-sm', accent ? 'text-success font-medium' : 'text-foreground')}>
        {value}
      </Text>
    </View>
  );
}

function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View className="flex-row items-center px-3 pb-1">
      <Pressable
        onPress={onBack}
        hitSlop={8}
        className="active:bg-muted h-10 w-10 items-center justify-center rounded-full"
      >
        <ChevronLeft size={22} color="#0A0A0C" />
      </Pressable>
      <Text numberOfLines={1} className="flex-1 text-center text-base font-semibold">
        {title}
      </Text>
      <View className="w-10" />
    </View>
  );
}

function EditModal({
  order,
  tr,
  onClose,
  onSaved,
}: {
  order: OrderDetail;
  tr: Record<string, string>;
  onClose: () => void;
  onSaved: (o: OrderDetail) => void;
}) {
  const insets = useSafeAreaInsets();
  const a = order.shippingAddress;
  const [form, setForm] = React.useState({
    recipientName: a?.recipientName ?? '',
    phone: a?.phone ?? '',
    city: a?.city ?? '',
    street: a?.street ?? '',
    apartment: a?.apartment ?? '',
  });
  const [method, setMethod] = React.useState<UpdateOrderInput['deliveryMethod']>(
    order.deliveryMethod as UpdateOrderInput['deliveryMethod'],
  );
  const [saving, setSaving] = React.useState(false);

  const onSave = async () => {
    setSaving(true);
    const res = await updateOrder(order.id, {
      recipientName: form.recipientName.trim() || undefined,
      phone: form.phone.trim() || undefined,
      city: form.city.trim() || undefined,
      street: form.street.trim() || undefined,
      apartment: form.apartment.trim() || null,
      deliveryMethod: method,
    });
    setSaving(false);
    if (!res.success || !res.order) {
      haptics.error();
      toast({ title: res.error?.message ?? tr.saved, variant: 'destructive' });
      return;
    }
    onSaved(res.order);
  };

  return (
    <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} style={{ elevation: 10 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable
          className="bg-background gap-3 rounded-t-3xl p-5"
          style={{ paddingBottom: insets.bottom + 20 }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-foreground text-lg font-bold">{tr.editTitle}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color="#6B6B73" />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
            <View className="gap-3">
              <Input
                label={tr.name}
                value={form.recipientName}
                onChangeText={(v) => setForm({ ...form, recipientName: v })}
              />
              <Input
                label={tr.phone}
                value={form.phone}
                onChangeText={(v) => setForm({ ...form, phone: v })}
                keyboardType="phone-pad"
              />
              <Input
                label={tr.city}
                value={form.city}
                onChangeText={(v) => setForm({ ...form, city: v })}
              />
              <Input
                label={tr.street}
                value={form.street}
                onChangeText={(v) => setForm({ ...form, street: v })}
              />
              <Input
                label={tr.apt}
                value={form.apartment}
                onChangeText={(v) => setForm({ ...form, apartment: v })}
              />

              <Text className="text-muted-foreground text-xs font-medium">{tr.delivery}</Text>
              <View className="gap-2">
                {DELIVERY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      haptics.select();
                      setMethod(opt.id);
                    }}
                    className={cn(
                      'flex-row items-center justify-between rounded-xl border-2 p-3',
                      method === opt.id ? 'border-primary bg-primary/5' : 'border-border',
                    )}
                  >
                    <Text className="text-foreground text-sm font-medium">{tr[opt.key]}</Text>
                    {method === opt.id ? <Check size={16} color="#8B0020" /> : null}
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          <Button fullWidth size="lg" loading={saving} onPress={onSave}>
            {tr.save}
          </Button>
        </Pressable>
      </KeyboardAvoidingView>
    </Pressable>
  );
}
