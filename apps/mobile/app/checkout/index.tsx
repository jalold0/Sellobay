// Checkout ekrani — orkestr: holat, effektlar, hisob-kitob va submit shu yerda.
// Seksiya UI'lari src/components/checkout/* da (delivery/payment/review/footer/modal).
import { SHIPPING_FEE, EXPRESS_FEE, FREE_SHIPPING_THRESHOLD } from '@ecom/core-domain';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Package } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CheckoutFooter } from '../../src/components/checkout/checkout-footer';
import { Header, Stepper } from '../../src/components/checkout/checkout-ui';
import { DeliveryStep } from '../../src/components/checkout/delivery-step';
import { PaymentStep } from '../../src/components/checkout/payment-step';
import { RecipientModal } from '../../src/components/checkout/recipient-modal';
import { ReviewStep } from '../../src/components/checkout/review-step';
import {
  makeIdempotencyKey,
  STEPS,
  type DeliveryType,
  type HomeSpeed,
  type PaymentId,
  type Step,
} from '../../src/components/checkout/types';
import { LocationPicker } from '../../src/components/location-picker';
import {
  createOrder,
  fetchAddresses,
  fetchLoyalty,
  fetchPaymentCards,
  validatePromo,
  type ApiAddress,
  type PaymentCard,
  type PromoType,
} from '../../src/lib/api';
import { isInTashkentCity } from '../../src/lib/geo';
import { haptics } from '../../src/lib/haptics';
import { usePickupPoints } from '../../src/lib/hooks';
import { COIN_VALUE_SOM } from '../../src/lib/loyalty';
import { useT } from '../../src/lib/useT';
import { useCart } from '../../src/store/cart';
import { useLocale } from '../../src/store/locale';
import { useSession } from '../../src/store/session';
import { toast } from '../../src/store/toast';
import { Button } from '../../src/ui/button';
import { EmptyState } from '../../src/ui/empty-state';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
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

  const [payment, setPayment] = React.useState<PaymentId>('CLICK');
  const [submitting, setSubmitting] = React.useState(false);

  // Karta orqali to'lov (UZCARD): platforma kartalari + chek (data-URL) + izoh
  const [cards, setCards] = React.useState<PaymentCard[]>([]);
  const [receipt, setReceipt] = React.useState<string | null>(null);
  const [receiptNote, setReceiptNote] = React.useState('');
  React.useEffect(() => {
    if (payment !== 'UZCARD' || cards.length > 0) return;
    let active = true;
    fetchPaymentCards().then((c) => {
      if (active) setCards(c);
    });
    return () => {
      active = false;
    };
  }, [payment, cards.length]);

  const pickReceipt = async () => {
    haptics.light();
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
    });
    const asset = res.assets?.[0];
    if (res.canceled || !asset?.base64) return;
    const mime =
      asset.mimeType && /^image\/(jpeg|png|webp)$/.test(asset.mimeType)
        ? asset.mimeType
        : 'image/jpeg';
    setReceipt(`data:${mime};base64,${asset.base64}`);
    haptics.success();
  };

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
          icon={<Package size={32} color="#762237" />}
          title={t('cart.empty')}
          description={t('checkout.emptyTitle')}
          action={
            <Button fullWidth onPress={() => router.replace('/(tabs)/catalog')}>
              {t('checkout.openCatalog')}
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
    // Karta o'tkazma tanlangan bo'lsa — chek (kvitansiya) rasmi majburiy
    if (step === 'payment' && payment === 'UZCARD' && !receipt) {
      haptics.warning();
      toast({ title: 'Chek (kvitansiya) rasmini yuklang', variant: 'warning' });
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
        paymentReceipt: payment === 'UZCARD' ? (receipt ?? undefined) : undefined,
        paymentNote: payment === 'UZCARD' && receiptNote.trim() ? receiptNote.trim() : undefined,
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

      <Stepper stepIdx={stepIdx} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 200 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'delivery' && (
          <DeliveryStep
            deliveryType={deliveryType}
            onChangeDeliveryType={setDeliveryType}
            homeSpeed={homeSpeed}
            onChangeHomeSpeed={setHomeSpeed}
            address={address}
            hasLocation={hasLocation}
            locationInTashkent={locationInTashkent}
            homeOutsideTashkent={homeOutsideTashkent}
            subtotal={subtotal}
            pickupPoints={pickupPoints}
            selectedPickupId={selectedPickupId}
            onSelectPickup={setSelectedPickupId}
            locale={locale}
            savedAddresses={savedAddresses}
            selectedAddressId={selectedAddressId}
            onPickSaved={(a) => {
              fillFromSaved(a);
              setShowRecipientModal(true);
            }}
            onEditCurrent={() => setShowRecipientModal(true)}
            onNewRecipient={() => {
              setSelectedAddressId(null);
              setAddress((a) => ({ ...a, firstName: '', lastName: '', phone: '+998 ' }));
              setShowRecipientModal(true);
            }}
            onOpenMap={() => setShowMap(true)}
            onOpenPickupMap={() => router.push('/pickup-points' as never)}
            onSwitchToPickup={switchToPickup}
          />
        )}

        {step === 'payment' && (
          <PaymentStep
            payment={payment}
            onSelectPayment={setPayment}
            cards={cards}
            receipt={receipt}
            onPickReceipt={() => void pickReceipt()}
            onRemoveReceipt={() => setReceipt(null)}
            receiptNote={receiptNote}
            onChangeReceiptNote={setReceiptNote}
            total={total}
          />
        )}

        {step === 'review' && (
          <ReviewStep
            address={address}
            deliveryType={deliveryType}
            deliveryMethod={deliveryMethod}
            selectedPickup={selectedPickup}
            locale={locale}
            payment={payment}
            items={items}
            onEditDelivery={() => setStep('delivery')}
            onEditPayment={() => setStep('payment')}
            promoInput={promoInput}
            onChangePromoInput={(v) => {
              setPromoInput(v.toUpperCase());
              if (promoError) setPromoError('');
            }}
            appliedPromo={appliedPromo}
            promoDiscount={promoDiscount}
            promoLoading={promoLoading}
            promoError={promoError}
            onApplyPromo={() => void applyPromo()}
            onClearPromo={clearPromo}
          />
        )}
      </ScrollView>

      {/* Sticky footer — 1-oynada (tur tanlanmaganda) ko'rinmaydi */}
      {!(step === 'delivery' && deliveryType === null) && (
        <CheckoutFooter
          bottomInset={insets.bottom}
          redeemableCoins={redeemableCoins}
          useCoins={useCoins}
          onToggleCoins={() => setUseCoins((v) => !v)}
          promoDiscount={promoDiscount}
          appliedPromoCode={appliedPromo?.code}
          coinDiscount={coinDiscount}
          total={total}
          submitting={submitting}
          isReview={step === 'review'}
          onPress={step === 'review' ? () => void placeOrder() : nextStep}
        />
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

      {showRecipientModal ? (
        <RecipientModal
          topInset={insets.top}
          bottomInset={insets.bottom}
          address={address}
          deliveryType={deliveryType}
          onChangeFirstName={(v) => {
            setSelectedAddressId(null);
            setAddress((a) => ({ ...a, firstName: v }));
          }}
          onChangeLastName={(v) => setAddress((a) => ({ ...a, lastName: v }))}
          onChangePhone={(v) => {
            setSelectedAddressId(null);
            setAddress((a) => ({ ...a, phone: v }));
          }}
          onClose={() => setShowRecipientModal(false)}
        />
      ) : null}
    </View>
  );
}
