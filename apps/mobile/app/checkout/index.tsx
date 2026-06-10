import { useRouter } from 'expo-router';
import { Check, ChevronLeft, CreditCard, MapPin, Package, ShieldCheck } from 'lucide-react-native';
import * as React from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMoney } from '../../src/lib/format';
import { productImage } from '../../src/lib/mock-data';
import { useCart } from '../../src/store/cart';
import { toast } from '../../src/store/toast';
import { Button } from '../../src/ui/button';
import { cn } from '../../src/ui/cn';
import { EmptyState } from '../../src/ui/empty-state';
import { Input } from '../../src/ui/input';

const SHIPPING_FEE = 20_000;
const EXPRESS_FEE = 50_000;
const FREE_SHIPPING_THRESHOLD = 500_000;

type Step = 'address' | 'shipping' | 'payment' | 'review';

const STEPS: Array<{ id: Step; label: string; icon: typeof MapPin }> = [
  { id: 'address', label: 'Manzil', icon: MapPin },
  { id: 'shipping', label: 'Yetkazib berish', icon: Package },
  { id: 'payment', label: "To'lov", icon: CreditCard },
  { id: 'review', label: 'Tasdiq', icon: Check },
];

const PAYMENT_OPTIONS = [
  { id: 'CLICK', label: 'Click', sub: 'Tezkor mobil to`lov', emoji: '💳' },
  { id: 'PAYME', label: 'Payme', sub: 'Onlayn to`lov', emoji: '💰' },
  { id: 'UZUM_BANK', label: 'Uzum Bank', sub: 'Bank ilovasi', emoji: '🏦' },
  { id: 'UZCARD', label: 'Uzcard', sub: 'Plastik karta', emoji: '💳' },
  { id: 'HUMO', label: 'Humo', sub: 'Plastik karta', emoji: '💳' },
  { id: 'CASH_ON_DELIVERY', label: 'Naqd', sub: 'Kuryerga', emoji: '💵' },
] as const;

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);

  const [step, setStep] = React.useState<Step>('address');
  const [address, setAddress] = React.useState({
    firstName: '',
    lastName: '',
    phone: '+998 ',
    city: '',
    street: '',
    apartment: '',
  });
  const [shipping, setShipping] = React.useState<'HOME_DELIVERY' | 'PICKUP_POINT' | 'EXPRESS'>(
    'HOME_DELIVERY',
  );
  const [payment, setPayment] = React.useState<(typeof PAYMENT_OPTIONS)[number]['id']>('CLICK');
  const [submitting, setSubmitting] = React.useState(false);

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const shippingFee =
    shipping === 'PICKUP_POINT'
      ? 0
      : shipping === 'EXPRESS'
        ? EXPRESS_FEE
        : subtotal >= FREE_SHIPPING_THRESHOLD
          ? 0
          : SHIPPING_FEE;
  const total = subtotal + shippingFee;
  const stepIdx = STEPS.findIndex((s) => s.id === step);

  if (items.length === 0) {
    return (
      <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
        <Header onBack={() => router.back()} title="Buyurtma" />
        <EmptyState
          icon={<Package size={32} color="#94a3b8" />}
          title="Savatcha bo`sh"
          description="Avval mahsulot qo`shing"
          action={
            <Button fullWidth onPress={() => router.replace('/(tabs)/catalog')}>
              Katalogga
            </Button>
          }
        />
      </View>
    );
  }

  const canNextFromAddress =
    address.firstName.trim() &&
    address.lastName.trim() &&
    address.phone.length >= 12 &&
    address.city.trim() &&
    address.street.trim();

  const nextStep = () => {
    if (step === 'address' && !canNextFromAddress) {
      toast({ title: 'Majburiy maydonlarni to`ldiring', variant: 'warning' });
      return;
    }
    const i = STEPS.findIndex((s) => s.id === step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]!.id);
  };

  const placeOrder = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    const orderNumber = `ORD-2026-${String(Math.floor(Math.random() * 99_999_999)).padStart(8, '0')}`;
    clear();
    toast({
      title: 'Buyurtma qabul qilindi!',
      description: `№ ${orderNumber}`,
      variant: 'success',
      duration: 4000,
    });
    router.replace(`/order-success?number=${orderNumber}` as never);
  };

  return (
    <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
      <Header onBack={() => router.back()} title="Rasmiylashtirish" />

      {/* Stepper */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, gap: 6 }}
      >
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < stepIdx;
          const active = i === stepIdx;
          return (
            <View
              key={s.id}
              className={cn(
                'flex-row items-center gap-1.5 rounded-full px-3 py-1.5',
                active ? 'bg-primary' : done ? 'bg-emerald-100' : 'bg-muted',
              )}
            >
              {done ? (
                <Check size={12} color="#059669" />
              ) : (
                <Icon size={12} color={active ? '#fff' : '#6B6B73'} />
              )}
              <Text
                className={cn(
                  'text-xs font-medium',
                  active ? 'text-white' : done ? 'text-emerald-700' : 'text-muted-foreground',
                )}
              >
                {i + 1}. {s.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 200 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'address' && (
          <View className="gap-3">
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input
                  label="Ism*"
                  value={address.firstName}
                  onChangeText={(t) => setAddress({ ...address, firstName: t })}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Familiya*"
                  value={address.lastName}
                  onChangeText={(t) => setAddress({ ...address, lastName: t })}
                />
              </View>
            </View>
            <Input
              label="Telefon*"
              value={address.phone}
              onChangeText={(t) => setAddress({ ...address, phone: t })}
              keyboardType="phone-pad"
            />
            <Input
              label="Shahar*"
              value={address.city}
              onChangeText={(t) => setAddress({ ...address, city: t })}
              placeholder="Toshkent"
            />
            <Input
              label="Ko'cha, uy*"
              value={address.street}
              onChangeText={(t) => setAddress({ ...address, street: t })}
              placeholder="Mustaqillik ko'chasi 12"
            />
            <Input
              label="Kvartira/podyezd"
              value={address.apartment}
              onChangeText={(t) => setAddress({ ...address, apartment: t })}
            />
          </View>
        )}

        {step === 'shipping' && (
          <View className="gap-2">
            {[
              {
                id: 'HOME_DELIVERY' as const,
                label: 'Uyga yetkazib berish',
                sub: '24-48 soat',
                price: subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE,
              },
              {
                id: 'EXPRESS' as const,
                label: 'Express',
                sub: '3 soat ichida',
                price: EXPRESS_FEE,
              },
              {
                id: 'PICKUP_POINT' as const,
                label: 'Olib ketish punkti',
                sub: 'Tekin, sizga yaqin',
                price: 0,
              },
            ].map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => setShipping(opt.id)}
                className={cn(
                  'flex-row items-center justify-between rounded-2xl border-2 p-4',
                  shipping === opt.id ? 'border-primary bg-primary/5' : 'border-border',
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

        {step === 'payment' && (
          <View className="gap-2">
            {PAYMENT_OPTIONS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setPayment(p.id)}
                className={cn(
                  'flex-row items-center gap-3 rounded-2xl border-2 p-3.5',
                  payment === p.id ? 'border-primary bg-primary/5' : 'border-border',
                )}
              >
                <View className="bg-muted h-10 w-10 items-center justify-center rounded-lg">
                  <Text className="text-lg">{p.emoji}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-medium">{p.label}</Text>
                  <Text className="text-muted-foreground text-xs">{p.sub}</Text>
                </View>
                {payment === p.id ? <Check size={16} color="#0A0A0C" /> : null}
              </Pressable>
            ))}
            <View className="bg-muted mt-2 flex-row items-center gap-2 rounded-md p-2.5">
              <ShieldCheck size={14} color="#10b981" />
              <Text className="text-muted-foreground flex-1 text-[11px]">
                Karta ma&apos;lumotlari to&apos;lov tizimida saqlanadi
              </Text>
            </View>
          </View>
        )}

        {step === 'review' && (
          <View className="gap-3">
            <ReviewBlock title="Manzil" onEdit={() => setStep('address')}>
              <Text className="text-sm">
                {address.firstName} {address.lastName} · {address.phone}
              </Text>
              <Text className="text-muted-foreground text-xs">
                {[address.city, address.street, address.apartment].filter(Boolean).join(', ')}
              </Text>
            </ReviewBlock>
            <ReviewBlock title="Yetkazib berish" onEdit={() => setStep('shipping')}>
              <Text className="text-sm">
                {shipping === 'HOME_DELIVERY'
                  ? 'Uyga'
                  : shipping === 'EXPRESS'
                    ? 'Express'
                    : 'Pickup'}
              </Text>
            </ReviewBlock>
            <ReviewBlock title="To`lov" onEdit={() => setStep('payment')}>
              <Text className="text-sm">
                {PAYMENT_OPTIONS.find((p) => p.id === payment)?.label}
              </Text>
            </ReviewBlock>
            <ReviewBlock title={`Mahsulotlar (${items.length})`}>
              {items.map((it) => (
                <View key={it.id} className="flex-row items-center gap-2 py-1">
                  <Image
                    source={{ uri: productImage(it.imageSeed, 100) }}
                    className="bg-muted h-10 w-10 rounded-md"
                  />
                  <View className="flex-1">
                    <Text numberOfLines={1} className="text-xs">
                      {it.name}
                    </Text>
                    <Text className="text-muted-foreground text-[11px]">
                      {it.quantity} × {formatMoney(it.unitPrice)}
                    </Text>
                  </View>
                  <Text className="text-xs font-medium">
                    {formatMoney(it.unitPrice * it.quantity)}
                  </Text>
                </View>
              ))}
            </ReviewBlock>
          </View>
        )}
      </ScrollView>

      {/* Sticky footer */}
      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="border-border bg-background absolute inset-x-0 bottom-0 gap-2 border-t px-4 pt-3"
      >
        <View className="flex-row justify-between">
          <Text className="text-muted-foreground text-sm">Jami</Text>
          <Text className="text-base font-bold">{formatMoney(total)}</Text>
        </View>
        {step === 'review' ? (
          <Button fullWidth size="lg" loading={submitting} onPress={placeOrder}>
            Buyurtmani tasdiqlash
          </Button>
        ) : (
          <Button fullWidth size="lg" onPress={nextStep}>
            Davom etish
          </Button>
        )}
      </View>
    </View>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View className="flex-row items-center px-3">
      <Pressable
        onPress={onBack}
        hitSlop={8}
        className="active:bg-muted h-10 w-10 items-center justify-center rounded-full"
      >
        <ChevronLeft size={22} color="#0A0A0C" />
      </Pressable>
      <Text className="flex-1 text-center text-base font-semibold">{title}</Text>
      <View className="w-10" />
    </View>
  );
}

function ReviewBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="border-border bg-card rounded-2xl border p-3">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
          {title}
        </Text>
        {onEdit ? (
          <Pressable onPress={onEdit} hitSlop={4}>
            <Text className="text-primary text-xs">O&apos;zgartirish</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}
