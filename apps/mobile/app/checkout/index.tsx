import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Coins,
  CreditCard,
  Home,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  Store,
  Tag,
  X,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationPicker } from '../../src/components/location-picker';
import {
  createOrder,
  fetchAddresses,
  fetchLoyalty,
  validatePromo,
  type ApiAddress,
  type PromoType,
} from '../../src/lib/api';
import { formatMoney, pickLocalized } from '../../src/lib/format';
import { isInTashkentCity } from '../../src/lib/geo';
import { haptics } from '../../src/lib/haptics';
import { usePickupPoints } from '../../src/lib/hooks';
import { COIN_VALUE_SOM, coinsForOrder } from '../../src/lib/loyalty';
import { productImage } from '../../src/lib/mock-data';
import { useCart } from '../../src/store/cart';
import { useLocale } from '../../src/store/locale';
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

type Step = 'delivery' | 'payment' | 'review';
type DeliveryType = 'TASHKENT_HOME' | 'REGION_PICKUP';
type HomeSpeed = 'STANDARD' | 'EXPRESS';

const STEPS: Array<{ id: Step; label: string; icon: typeof MapPin }> = [
  { id: 'delivery', label: 'Yetkazish', icon: Package },
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

function makeIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  // Bir checkout sessiyasi uchun barqaror key — qayta urinishlarda takroriy order bo'lmaydi
  const idempotencyKeyRef = React.useRef(makeIdempotencyKey());

  // To'g'ridan-to'g'ri kirishdan himoya — ro'yxatdan o'tmagan bo'lsa login'ga
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login?redirect=/checkout');
    }
  }, [isAuthenticated, router]);

  const [step, setStep] = React.useState<Step>('delivery');
  // null = hali tur tanlanmagan (1-oyna: faqat 2 ta tanlov ko'rinadi)
  const [deliveryType, setDeliveryType] = React.useState<DeliveryType | null>(null);
  const [homeSpeed, setHomeSpeed] = React.useState<HomeSpeed>('STANDARD');
  const [showRecipientModal, setShowRecipientModal] = React.useState(false);
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

  // Saqlangan manzillar — login user uchun
  const [savedAddresses, setSavedAddresses] = React.useState<ApiAddress[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = React.useState<string | null>(null);

  // Topshirish punktlari (REGION_PICKUP uchun)
  const locale = useLocale((s) => s.locale);
  const { data: pickupPoints = [] } = usePickupPoints();
  const [selectedPickupId, setSelectedPickupId] = React.useState<string | null>(null);
  const selectedPickup = pickupPoints.find((p) => p.id === selectedPickupId) ?? null;

  const fillFromSaved = React.useCallback((a: ApiAddress) => {
    setAddress({
      firstName: a.recipientName,
      lastName: '',
      phone: a.phone,
      region: a.region,
      city: a.city,
      street: [a.street, a.building].filter(Boolean).join(', '),
      apartment: a.apartment ?? '',
      latitude: a.latitude != null ? Number(a.latitude) : null,
      longitude: a.longitude != null ? Number(a.longitude) : null,
    });
    setSelectedAddressId(a.id);
    // Saqlangan pickup-manzil bo'lsa — punktni avtomatik tanlaymiz
    if (a.pickupPointId) setSelectedPickupId(a.pickupPointId);
  }, []);

  // Manzillarni yuklaymiz; default bo'lsa avtomatik tanlanadi
  React.useEffect(() => {
    let active = true;
    void fetchAddresses().then((list) => {
      if (!active) return;
      setSavedAddresses(list ?? []);
      if (list && list.length > 0) {
        const def = list.find((a) => a.isDefault) ?? list[0]!;
        fillFromSaved(def);
      }
    });
    return () => {
      active = false;
    };
  }, [fillFromSaved]);

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

  // Joylashuvga qarab yetkazish turi → backend deliveryMethod:
  //  Toshkent + Standart → HOME_DELIVERY, Toshkent + Express → EXPRESS,
  //  Viloyat → PICKUP_POINT.
  const deliveryMethod: 'HOME_DELIVERY' | 'PICKUP_POINT' | 'EXPRESS' =
    deliveryType === 'REGION_PICKUP'
      ? 'PICKUP_POINT'
      : homeSpeed === 'EXPRESS'
        ? 'EXPRESS'
        : 'HOME_DELIVERY';

  const hasLocation = address.latitude != null && address.longitude != null;
  const locationInTashkent = hasLocation && isInTashkentCity(address.latitude!, address.longitude!);
  // Uygacha tanlangan, lekin nuqta Toshkent shahar tashqarisida → ruxsat yo'q
  const homeOutsideTashkent =
    deliveryType === 'TASHKENT_HOME' && hasLocation && !locationInTashkent;

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const shippingFee =
    deliveryMethod === 'PICKUP_POINT'
      ? 0
      : deliveryMethod === 'EXPRESS'
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

  const recipientOk = Boolean(address.firstName.trim() && address.phone.length >= 12);
  const canNextFromDelivery =
    deliveryType === 'TASHKENT_HOME'
      ? Boolean(hasLocation && locationInTashkent && recipientOk)
      : deliveryType === 'REGION_PICKUP'
        ? Boolean(recipientOk && selectedPickupId)
        : false; // tur tanlanmagan

  const nextStep = () => {
    if (step === 'delivery' && !canNextFromDelivery) {
      haptics.warning();
      toast({
        title: homeOutsideTashkent
          ? 'Uygacha yetkazish faqat Toshkent shahar uchun'
          : "Ma'lumotlarni to`ldiring",
        variant: 'warning',
      });
      return;
    }
    haptics.light();
    const i = STEPS.findIndex((s) => s.id === step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]!.id);
  };

  // Toshkent tashqarisidan punktga o'tish — qulaylik tugmasi
  const switchToPickup = () => {
    haptics.light();
    setDeliveryType('REGION_PICKUP');
  };

  const placeOrder = async () => {
    setSubmitting(true);
    const result = await createOrder(
      {
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          variantId: it.variantId,
        })),
        recipientName: `${address.firstName.trim()} ${address.lastName.trim()}`.trim(),
        phone: address.phone.trim(),
        region:
          (deliveryMethod === 'PICKUP_POINT' ? selectedPickup?.region : address.region.trim()) ||
          'Toshkent',
        city:
          (deliveryMethod === 'PICKUP_POINT' ? selectedPickup?.city : address.city.trim()) ||
          'Toshkent',
        street:
          (deliveryMethod === 'PICKUP_POINT' ? selectedPickup?.street : address.street.trim()) ||
          'Punkt',
        apartment: address.apartment.trim() || undefined,
        latitude: deliveryMethod === 'PICKUP_POINT' ? undefined : (address.latitude ?? undefined),
        longitude: deliveryMethod === 'PICKUP_POINT' ? undefined : (address.longitude ?? undefined),
        deliveryMethod,
        pickupPointId:
          deliveryMethod === 'PICKUP_POINT' ? (selectedPickupId ?? undefined) : undefined,
        paymentProvider: payment,
        promoCode: appliedPromo?.code,
        redeemCoins: coinsToRedeem,
      },
      idempotencyKeyRef.current,
    );
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
      <Header
        onBack={() => {
          // Bo'lim ichida bo'lsa — turlar ro'yxatiga qaytadi (checkout'dan chiqmaydi)
          if (step === 'delivery' && deliveryType !== null) {
            haptics.light();
            setDeliveryType(null);
          } else if (step !== 'delivery') {
            haptics.light();
            const i = STEPS.findIndex((s) => s.id === step);
            setStep(STEPS[i - 1]!.id);
          } else {
            router.back();
          }
        }}
        title="Rasmiylashtirish"
      />

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
                    backgroundColor: done ? '#0A0A0C' : active ? '#531625' : '#E5E7EB',
                  }}
                >
                  {done ? (
                    <Check size={14} color="#C9A961" strokeWidth={3} />
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
                      backgroundColor: done ? '#0A0A0C' : '#E5E7EB',
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
        {/* 1-OYNA: faqat 2 ta tanlov — boshqa hech narsa yo'q */}
        {step === 'delivery' && deliveryType === null && (
          <View className="gap-3">
            <Text className="text-muted-foreground text-xs font-medium">
              Yetkazib berish turini tanlang
            </Text>
            <Pressable
              onPress={() => {
                haptics.select();
                setDeliveryType('TASHKENT_HOME');
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
                setDeliveryType('REGION_PICKUP');
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
        )}

        {/* 2-OYNA: tanlangan bo'lim — ikkinchi variant ko'rinmaydi */}
        {step === 'delivery' && deliveryType !== null && (
          <View className="gap-4">
            {/* Tanlangan tur — o'zgartirish (turlar ro'yxatiga qaytadi) */}
            <Pressable
              onPress={() => {
                haptics.light();
                setDeliveryType(null);
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
                    setShowMap(true);
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
                        Uygacha yetkazish faqat Toshkent shahar uchun amal qiladi. O&apos;zingizga
                        yaqin olib ketish punktini tanlang.
                      </Text>
                    </View>
                    <Button variant="outline" size="sm" onPress={switchToPickup}>
                      Olib ketish punktiga o&apos;tish
                    </Button>
                  </View>
                )}

                {hasLocation && locationInTashkent && (
                  <View className="gap-2">
                    <Text className="text-muted-foreground text-xs font-medium">
                      Yetkazish tezligi
                    </Text>
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
                          setHomeSpeed(opt.id);
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

            {/* REGION_PICKUP — punktни tanlash (DB'dan real punktlar) */}
            {deliveryType === 'REGION_PICKUP' && (
              <View className="gap-3">
                <Pressable
                  onPress={() => {
                    haptics.light();
                    router.push('/pickup-points' as never);
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
                          setSelectedPickupId(p.id);
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
                              <Text className="text-muted-foreground text-[11px]">
                                {p.workingHours}
                              </Text>
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
                          fillFromSaved(a);
                          setShowRecipientModal(true);
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
                                  <Text className="text-[10px] font-bold text-emerald-700">
                                    Asosiy
                                  </Text>
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
                    setShowRecipientModal(true);
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
                  setSelectedAddressId(null);
                  setAddress((a) => ({ ...a, firstName: '', lastName: '', phone: '+998 ' }));
                  setShowRecipientModal(true);
                }}
                className="border-border active:bg-muted flex-row items-center justify-center gap-2 rounded-2xl border border-dashed py-3"
              >
                <Plus size={16} color="#531625" />
                <Text className="text-primary text-sm font-semibold">Yangi qabul qiluvchi</Text>
              </Pressable>
            </View>
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
              <ShieldCheck size={14} color="#1F8A5B" />
              <Text className="text-muted-foreground flex-1 text-[11px]">
                Karta ma&apos;lumotlari to&apos;lov tizimida saqlanadi
              </Text>
            </View>
          </View>
        )}

        {step === 'review' && (
          <View className="gap-3">
            <ReviewBlock title="Qabul qiluvchi" onEdit={() => setStep('delivery')}>
              <Text className="text-sm">
                {address.firstName} {address.lastName} · {address.phone}
              </Text>
              <Text className="text-muted-foreground text-xs">
                {[address.region, address.city, address.street, address.apartment]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            </ReviewBlock>
            <ReviewBlock title="Yetkazib berish" onEdit={() => setStep('delivery')}>
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

      {/* Sticky footer — 1-oynada (tur tanlanmaganda) ko'rinmaydi */}
      {!(step === 'delivery' && deliveryType === null) && (
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
              <Text className="text-success text-sm font-medium">
                −{formatMoney(promoDiscount)}
              </Text>
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
          {/* Crimson pill — chapda label, o'ngda jami (1i) */}
          <Pressable
            onPress={step === 'review' ? placeOrder : nextStep}
            disabled={submitting}
            className={cn(
              'bg-primary h-[54px] flex-row items-center justify-between rounded-full px-6 active:opacity-85',
              submitting && 'opacity-60',
            )}
          >
            <Text className="text-base font-bold text-white">
              {step === 'review' ? 'Buyurtmani tasdiqlash' : "To'lovga o'tish"}
            </Text>
            <Text className="text-base font-bold text-white">{formatMoney(total)}</Text>
          </Pressable>
        </View>
      )}

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
            // Toshkent tashqarisi bo'lsa ogohlantiramiz (uygacha yetkazish ishlamaydi)
            if (deliveryType === 'TASHKENT_HOME' && !isInTashkentCity(loc.lat, loc.lng)) {
              haptics.warning();
            }
            setShowMap(false);
          }}
        />
      ) : null}

      {/* Qabul qiluvchi modal — matn kiritish shu yerda (asosiy ekran toza qoladi) */}
      {showRecipientModal ? (
        <View className="bg-background absolute inset-0" style={{ elevation: 20, zIndex: 20 }}>
          <View
            className="border-border flex-row items-center border-b px-3 pb-2"
            style={{ paddingTop: insets.top + 6 }}
          >
            <Pressable
              onPress={() => setShowRecipientModal(false)}
              hitSlop={8}
              className="active:bg-muted h-10 w-10 items-center justify-center rounded-full"
            >
              <X size={22} color="#0A0A0C" />
            </Pressable>
            <Text className="flex-1 text-center text-base font-semibold">Qabul qiluvchi</Text>
            <View className="w-10" />
          </View>
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input
                  label="Ism*"
                  value={address.firstName}
                  onChangeText={(t) => {
                    setSelectedAddressId(null);
                    setAddress((a) => ({ ...a, firstName: t }));
                  }}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Familiya"
                  value={address.lastName}
                  onChangeText={(t) => setAddress((a) => ({ ...a, lastName: t }))}
                />
              </View>
            </View>
            <Input
              label="Telefon*"
              value={address.phone}
              onChangeText={(t) => {
                setSelectedAddressId(null);
                setAddress((a) => ({ ...a, phone: t }));
              }}
              keyboardType="phone-pad"
            />
            {deliveryType === 'REGION_PICKUP' ? (
              <Text className="text-muted-foreground text-xs">
                Viloyat va shahar tanlangan topshirish punktidan olinadi.
              </Text>
            ) : null}
          </ScrollView>
          <View
            className="border-border bg-background border-t px-4 pt-3"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <Button
              fullWidth
              size="lg"
              onPress={() => {
                haptics.light();
                setShowRecipientModal(false);
              }}
            >
              Saqlash
            </Button>
          </View>
        </View>
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
