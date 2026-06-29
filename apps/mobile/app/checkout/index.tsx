import { useRouter } from 'expo-router';
import {
  Check,
  ChevronLeft,
  Coins,
  CreditCard,
  MapPin,
  Package,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationPicker } from '../../src/components/location-picker';
import { createOrder, fetchLoyalty, validatePromo, type PromoType } from '../../src/lib/api';
import { formatMoney } from '../../src/lib/format';
import { haptics } from '../../src/lib/haptics';
import { COIN_VALUE_SOM, coinsForOrder } from '../../src/lib/loyalty';
import { productImage } from '../../src/lib/mock-data';
import { useCart } from '../../src/store/cart';
import { useSession } from '../../src/store/session';
import { toast } from '../../src/store/toast';
import { AppImage } from '../../src/ui/app-image';
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
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);

  // To'g'ridan-to'g'ri kirishdan himoya — ro'yxatdan o'tmagan bo'lsa login'ga
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login?redirect=/checkout');
    }
  }, [isAuthenticated, router]);

  const [step, setStep] = React.useState<Step>('address');
  const [address, setAddress] = React.useState({
    firstName: '',
    lastName: '',
    phone: '+998 ',
    region: '',
    city: '',
    street: '',
    apartment: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [showMap, setShowMap] = React.useState(false);
  const [shipping, setShipping] = React.useState<'HOME_DELIVERY' | 'PICKUP_POINT' | 'EXPRESS'>(
    'HOME_DELIVERY',
  );
  const [payment, setPayment] = React.useState<(typeof PAYMENT_OPTIONS)[number]['id']>('CLICK');
  const [submitting, setSubmitting] = React.useState(false);

  // Sello Coins — login bo'lsa real balans (Bearer). Aks holda 0 (redeem ko'rinmaydi).
  const [coinBalance, setCoinBalance] = React.useState(0);
  const [useCoins, setUseCoins] = React.useState(false);
  React.useEffect(() => {
    let active = true;
    fetchLoyalty()
      .then((data) => {
        if (active && data) setCoinBalance(data.coins);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Promokod
  const [promoInput, setPromoInput] = React.useState('');
  const [appliedPromo, setAppliedPromo] = React.useState<{
    code: string;
    type: PromoType;
    discount: number;
  } | null>(null);
  const [promoLoading, setPromoLoading] = React.useState(false);
  const [promoError, setPromoError] = React.useState('');

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const shippingFee =
    shipping === 'PICKUP_POINT'
      ? 0
      : shipping === 'EXPRESS'
        ? EXPRESS_FEE
        : subtotal >= FREE_SHIPPING_THRESHOLD
          ? 0
          : SHIPPING_FEE;
  const baseTotal = subtotal + shippingFee;
  // FREE_SHIPPING jonli (yetkazib berish o'zgarsa) — boshqalari subtotal'ga bog'liq, barqaror
  const promoDiscount = appliedPromo
    ? appliedPromo.type === 'FREE_SHIPPING'
      ? shippingFee
      : Math.min(appliedPromo.discount, subtotal)
    : 0;
  const afterPromo = baseTotal - promoDiscount;
  const redeemableCoins = Math.min(coinBalance, Math.floor(afterPromo / COIN_VALUE_SOM));
  const coinsToRedeem = useCoins ? redeemableCoins : 0;
  const coinDiscount = coinsToRedeem * COIN_VALUE_SOM;
  const total = afterPromo - coinDiscount;
  const stepIdx = STEPS.findIndex((s) => s.id === step);

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError('');
    const res = await validatePromo(code, subtotal, shippingFee);
    setPromoLoading(false);
    if (!res || !res.valid) {
      haptics.warning();
      setPromoError(res?.message ?? "Promokod qo'llanmadi");
      return;
    }
    haptics.success();
    setAppliedPromo({ code: res.code ?? code, type: res.type!, discount: res.discount ?? 0 });
    setPromoInput('');
    toast({ title: 'Promokod qo`llandi', variant: 'success' });
  };

  const clearPromo = () => {
    haptics.light();
    setAppliedPromo(null);
    setPromoError('');
  };

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
      haptics.warning();
      toast({ title: 'Majburiy maydonlarni to`ldiring', variant: 'warning' });
      return;
    }
    haptics.light();
    const i = STEPS.findIndex((s) => s.id === step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]!.id);
  };

  const placeOrder = async () => {
    setSubmitting(true);
    const result = await createOrder({
      items: items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        variantId: it.variantId,
      })),
      recipientName: `${address.firstName.trim()} ${address.lastName.trim()}`.trim(),
      phone: address.phone.trim(),
      region: address.region.trim() || 'Toshkent',
      city: address.city.trim(),
      street: address.street.trim(),
      apartment: address.apartment.trim() || undefined,
      latitude: address.latitude ?? undefined,
      longitude: address.longitude ?? undefined,
      deliveryMethod: shipping,
      paymentProvider: payment,
      promoCode: appliedPromo?.code,
      redeemCoins: coinsToRedeem,
    });
    setSubmitting(false);

    if (!result.success || !result.order) {
      haptics.error();
      toast({
        title: result.error?.message ?? 'Buyurtma yaratilmadi',
        variant: 'destructive',
      });
      return;
    }

    const orderNumber = result.order.number;
    haptics.success();
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

      {/* Compact stepper: 4 ta circle + ulanish chiziq + active step label */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {STEPS.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <React.Fragment key={s.id}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done ? '#059669' : active ? '#8B0020' : '#E5E7EB',
                  }}
                >
                  {done ? (
                    <Check size={14} color="#fff" strokeWidth={3} />
                  ) : (
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: active ? '#fff' : '#6B6B73',
                      }}
                    >
                      {i + 1}
                    </Text>
                  )}
                </View>
                {i < STEPS.length - 1 ? (
                  <View
                    style={{
                      flex: 1,
                      height: 2,
                      marginHorizontal: 4,
                      backgroundColor: done ? '#059669' : '#E5E7EB',
                      borderRadius: 1,
                    }}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </View>
        <Text
          style={{
            marginTop: 8,
            fontSize: 13,
            fontWeight: '600',
            textAlign: 'center',
            color: '#0A0A0C',
          }}
        >
          {STEPS[stepIdx]!.label}
          <Text style={{ color: '#6B6B73', fontWeight: '400' }}>
            {'  ·  '}
            {stepIdx + 1}/{STEPS.length}
          </Text>
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 200 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'address' && (
          <View className="gap-3">
            {/* Xaritadan tanlash */}
            <Pressable
              onPress={() => {
                haptics.light();
                setShowMap(true);
              }}
              className="border-primary bg-primary/5 flex-row items-center gap-2 rounded-xl border border-dashed p-3 active:opacity-80"
            >
              <MapPin size={18} color="#8B0020" />
              <View className="flex-1">
                <Text className="text-primary text-sm font-semibold">Xaritadan tanlash</Text>
                {address.latitude != null ? (
                  <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                    {[address.city, address.street].filter(Boolean).join(', ') ||
                      'Joylashuv tanlandi'}
                  </Text>
                ) : (
                  <Text className="text-muted-foreground text-xs">
                    Lokatsiya orqali manzilni belgilang
                  </Text>
                )}
              </View>
              <Text className="text-primary text-lg">›</Text>
            </Pressable>

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
                onPress={() => {
                  haptics.select();
                  setShipping(opt.id);
                }}
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

            {shipping === 'PICKUP_POINT' ? (
              <Pressable
                onPress={() => {
                  haptics.light();
                  router.push('/pickup-points' as never);
                }}
                className="border-border active:bg-muted mt-1 flex-row items-center gap-2 rounded-xl border p-3"
              >
                <MapPin size={16} color="#8B0020" />
                <Text className="text-foreground flex-1 text-sm font-medium">
                  Punktlarni xaritada ko&apos;rish
                </Text>
                <Text className="text-muted-foreground text-lg">›</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {step === 'payment' && (
          <View className="gap-2">
            {PAYMENT_OPTIONS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  haptics.select();
                  setPayment(p.id);
                }}
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
                  <Pressable onPress={clearPromo} hitSlop={8} className="active:opacity-70">
                    <X size={18} color="#047857" />
                  </Pressable>
                </View>
              ) : (
                <View className="flex-row items-end gap-2">
                  <View className="flex-1">
                    <Input
                      value={promoInput}
                      onChangeText={(v) => {
                        setPromoInput(v.toUpperCase());
                        if (promoError) setPromoError('');
                      }}
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
                    onPress={applyPromo}
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
        {/* Sello Coins redeem toggle — login + balans bo'lsa */}
        {redeemableCoins > 0 ? (
          <Pressable
            onPress={() => {
              haptics.select();
              setUseCoins((v) => !v);
            }}
            className={cn(
              'flex-row items-center gap-2 rounded-lg border p-2.5',
              useCoins ? 'border-amber-400 bg-amber-50' : 'border-border',
            )}
          >
            <View
              className={cn(
                'h-5 w-5 items-center justify-center rounded border-2',
                useCoins ? 'border-amber-500 bg-amber-500' : 'border-border',
              )}
            >
              {useCoins ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
            </View>
            <Coins size={15} color="#d97706" />
            <Text className="text-foreground flex-1 text-xs font-medium">
              Sello Coins ishlatish · {redeemableCoins} coin
            </Text>
            <Text className="text-xs font-semibold text-amber-700">
              −{formatMoney(redeemableCoins * COIN_VALUE_SOM)}
            </Text>
          </Pressable>
        ) : null}
        {promoDiscount > 0 ? (
          <View className="flex-row justify-between">
            <Text className="text-success text-sm">Promokod ({appliedPromo?.code})</Text>
            <Text className="text-success text-sm font-medium">−{formatMoney(promoDiscount)}</Text>
          </View>
        ) : null}
        {coinDiscount > 0 ? (
          <View className="flex-row justify-between">
            <Text className="text-success text-sm">Sello Coins chegirmasi</Text>
            <Text className="text-success text-sm font-medium">−{formatMoney(coinDiscount)}</Text>
          </View>
        ) : null}
        <View className="flex-row justify-between">
          <Text className="text-muted-foreground text-sm">Jami</Text>
          <Text className="text-base font-bold">{formatMoney(total)}</Text>
        </View>
        {/* Sello Coins earn hint — chegirmadan keyingi summa bo'yicha */}
        <View className="flex-row items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5">
          <Coins size={13} color="#d97706" />
          <Text className="text-[11px] font-medium text-amber-700">
            Bu buyurtma uchun +{coinsForOrder(total)} Sello Coin olasiz
          </Text>
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

      {showMap ? (
        <LocationPicker
          initial={
            address.latitude != null && address.longitude != null
              ? { lat: address.latitude, lng: address.longitude }
              : undefined
          }
          onClose={() => setShowMap(false)}
          onConfirm={(loc) => {
            setAddress((a) => ({
              ...a,
              latitude: loc.lat,
              longitude: loc.lng,
              region: loc.region ?? a.region,
              city: loc.city ?? a.city,
              street: loc.street ?? a.street,
            }));
            setShowMap(false);
          }}
        />
      ) : null}
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
