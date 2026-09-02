'use client';

// Checkout orkestratori — barcha state/effektlar/placeOrder shu yerda,
// UI bo'limlari alohida komponentlarda (address/shipping/payment/summary).
// Split 2026-07-17: 943 qatorlik god-file'dan ajratildi, logika o'zgarmagan.

import {
  SHIPPING_FEE,
  EXPRESS_FEE,
  FREE_SHIPPING_THRESHOLD,
  looksLikeTashkentCityText,
} from '@ecom/core-domain';
import { toast } from '@ecom/ui';
import { Package, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { COIN_VALUE_SOM } from '../../lib/loyalty';
import { isOnlineProvider } from '../../lib/payments';
import { useCart } from '../../store/cart';

import { AddressSection } from './address-section';
import { Step } from './checkout-ui';
import { OrderSummary } from './order-summary';
import { PaymentSection } from './payment-section';
import { uploadReceipt } from './receipt-image';
import { ShippingSection } from './shipping-section';

import type {
  AddressForm,
  DeliveryType,
  HomeSpeed,
  PaymentCardDTO,
  PaymentProvider,
  PickupPointDTO,
} from './checkout-types';

// Haqiqiy DB mahsuloti = UUID. Mock/demo (p1..p12) yoki eskirgan savat elementlari emas.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function CheckoutFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('checkout');
  const allItems = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const removeItem = useCart((s) => s.removeItem);

  // Savatda lokal va global tovar bo'lsa, ular ALOHIDA buyurtma qilinadi
  // (turli muddat va yetkazish). Savat sahifasi qaysi guruh checkout qilinayotganini
  // `?scope=` bilan aytadi; berilmasa hammasi olinadi (aralash bo'lmagan holat).
  const scope = (searchParams.get('scope') ?? '').toUpperCase();
  const items = React.useMemo(() => {
    if (scope === 'GLOBAL') return allItems.filter((i) => i.isGlobal);
    if (scope === 'LOCAL') return allItems.filter((i) => !i.isGlobal);
    return allItems;
  }, [allItems, scope]);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [address, setAddress] = React.useState<AddressForm>({
    firstName: '',
    lastName: '',
    phone: '+998 ',
    region: '',
    city: '',
    street: '',
    apartment: '',
    notes: '',
  });
  const [deliveryType, setDeliveryType] = React.useState<DeliveryType>('TASHKENT_HOME');
  const [homeSpeed, setHomeSpeed] = React.useState<HomeSpeed>('STANDARD');
  const [payment, setPayment] = React.useState<PaymentProvider>('UZCARD');
  const [submitting, setSubmitting] = React.useState(false);

  // Karta orqali to'lov — platforma kartalari, chek (data-URL) va izoh.
  const [cards, setCards] = React.useState<PaymentCardDTO[]>([]);
  // Chek ikki qiymatga bo'lingan: `receiptPath` — serverga yuboriladigan ichki
  // yo'l, `receiptPreview` — faqat shu brauzerdagi ko'rinish (blob: manzil).
  // Rasmning o'zi yopiq saqlangani uchun uni ochiq havola bilan ko'rsatib
  // bo'lmaydi va ko'rsatishning hojati ham yo'q — mijoz o'zi tanlagan faylni ko'radi.
  const [receiptPath, setReceiptPath] = React.useState('');
  const [receiptPreview, setReceiptPreview] = React.useState('');
  const [receiptBusy, setReceiptBusy] = React.useState(false);

  // Ko'rinish uchun yaratilgan blob: manzil brauzer xotirasini egallaydi. Effekt
  // tozalash bosqichi ESKI manzilni bo'shatadi — chek almashtirilganda ham,
  // sahifa yopilganda ham. Shu bois setter ichida qo'shimcha revoke shart emas.
  React.useEffect(
    () => () => {
      if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    },
    [receiptPreview],
  );
  const [paymentNote, setPaymentNote] = React.useState('');
  const [copiedCard, setCopiedCard] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (payment !== 'UZCARD' || cards.length > 0) return;
    let active = true;
    fetch('/api/payment-cards', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (active && res?.success && res.data) setCards(res.data.cards as PaymentCardDTO[]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [payment, cards.length]);

  const onReceiptFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast({ title: t('payment.receiptRequired'), variant: 'destructive' });
      return;
    }
    setReceiptBusy(true);
    try {
      const uploaded = await uploadReceipt(file);
      setReceiptPath(uploaded.pathname);
      setReceiptPreview(uploaded.previewUrl);
    } catch (e) {
      // Serverdan kelgan aniq sabab (hajm, format, kvota) ko'rsatiladi —
      // umumiy "xato" mijozga nima qilishni aytmaydi.
      toast({
        title: e instanceof Error ? e.message : t('errors.failed'),
        variant: 'destructive',
      });
    }
    setReceiptBusy(false);
  };

  const copyCard = (num: string) => {
    void navigator.clipboard?.writeText(num.replace(/\s/g, ''));
    setCopiedCard(num);
    window.setTimeout(() => setCopiedCard((c) => (c === num ? null : c)), 1500);
  };

  // Sello Coins — login user balansi (guest uchun 0; 401 → 0)
  const [coinBalance, setCoinBalance] = React.useState(0);
  const [useCoins, setUseCoins] = React.useState(false);
  React.useEffect(() => {
    let active = true;
    fetch('/api/loyalty', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (active && res?.success && res.data) setCoinBalance(res.data.coins ?? 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Topshirish punktlari (REGION_PICKUP)
  const [pickupPoints, setPickupPoints] = React.useState<PickupPointDTO[]>([]);
  const [selectedPickupId, setSelectedPickupId] = React.useState<string | null>(null);
  const selectedPickup = pickupPoints.find((p) => p.id === selectedPickupId) ?? null;
  React.useEffect(() => {
    let active = true;
    fetch('/api/pickup-points')
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (active && res?.success && res.data) setPickupPoints(res.data.items ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Joylashuvga qarab yetkazish turi → backend deliveryMethod
  const deliveryMethod: 'HOME_DELIVERY' | 'PICKUP_POINT' | 'EXPRESS' =
    deliveryType === 'REGION_PICKUP'
      ? 'PICKUP_POINT'
      : homeSpeed === 'EXPRESS'
        ? 'EXPRESS'
        : 'HOME_DELIVERY';
  const homeOutsideTashkent =
    deliveryType === 'TASHKENT_HOME' &&
    Boolean(address.region.trim() || address.city.trim()) &&
    !looksLikeTashkentCityText(address.region, address.city);

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  // GLOBAL buyurtmada lokal yetkazish narxi YO'Q: kargo tovarni to'g'ridan-to'g'ri
  // mijoz manziliga olib boradi va bu xarajat tovar narxi ichida. Server ham
  // shunday hisoblaydi (`orders-server`) — ko'rsatilgan summa olinadigan summaga teng bo'lsin.
  const isGlobalOrder = items.length > 0 && items.every((i) => i.isGlobal);
  const shippingFee = isGlobalOrder
    ? 0
    : deliveryMethod === 'PICKUP_POINT'
      ? 0
      : deliveryMethod === 'EXPRESS'
        ? EXPRESS_FEE
        : subtotal >= FREE_SHIPPING_THRESHOLD
          ? 0
          : SHIPPING_FEE;
  const baseTotal = subtotal + shippingFee;
  const redeemableCoins = Math.min(coinBalance, Math.floor(baseTotal / COIN_VALUE_SOM));
  const coinsToRedeem = useCoins ? redeemableCoins : 0;
  const coinDiscount = coinsToRedeem * COIN_VALUE_SOM;
  const total = baseTotal - coinDiscount;

  if (!mounted) return <div className="h-96" aria-hidden />;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Package className="text-muted-foreground mx-auto h-12 w-12" />
        <h1 className="text-brand-ink mt-4 text-2xl font-bold">{t('emptyTitle')}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t('emptyHint')}</p>
        <Link
          href="/catalog"
          className="bg-primary hover:bg-primary/90 mt-6 inline-flex h-11 items-center rounded-full px-6 text-sm font-bold text-white transition"
        >
          {t('openCatalog')}
        </Link>
      </div>
    );
  }

  const canSubmit =
    Boolean(address.firstName.trim()) &&
    Boolean(address.lastName.trim()) &&
    address.phone.replace(/\D/g, '').length >= 12 &&
    (deliveryType === 'REGION_PICKUP'
      ? Boolean(selectedPickupId)
      : Boolean(address.city.trim() && address.street.trim()) && !homeOutsideTashkent);

  const placeOrder = async () => {
    if (!canSubmit) {
      toast({
        title:
          deliveryType === 'REGION_PICKUP' && !selectedPickupId
            ? t('shipping.selectPickup')
            : homeOutsideTashkent
              ? t('shipping.tashkentOnly')
              : t('errors.required'),
        variant: 'warning',
      });
      return;
    }
    // Karta orqali to'lov — chek majburiy.
    if (payment === 'UZCARD' && !receiptPath) {
      toast({ title: t('payment.receiptRequired'), variant: 'warning' });
      return;
    }
    // Eskirgan (mock/demo) savat elementlari — productId UUID emas. Bunday element
    // serverda "Invalid uuid" beradi. Ularni jimgina olib tashlab, foydalanuvchini
    // ogohlantiramiz (savatni yangilab qaytadan qo'shsin).
    const staleItems = items.filter((it) => !UUID_RE.test(it.productId));
    if (staleItems.length > 0) {
      staleItems.forEach((it) => removeItem(it.id));
      toast({ title: t('errors.staleItems'), variant: 'warning' });
      return;
    }
    setSubmitting(true);
    const payload = {
      items: items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        variantId: it.variantId ?? undefined,
      })),
      recipientName: `${address.firstName.trim()} ${address.lastName.trim()}`.trim(),
      phone: address.phone.trim(),
      region:
        (deliveryMethod === 'PICKUP_POINT' && selectedPickup
          ? selectedPickup.region
          : address.region.trim()) || 'Toshkent',
      city:
        (deliveryMethod === 'PICKUP_POINT' && selectedPickup
          ? selectedPickup.city
          : address.city.trim()) || 'Toshkent',
      street:
        (deliveryMethod === 'PICKUP_POINT' && selectedPickup
          ? selectedPickup.street
          : address.street.trim()) || 'Punkt',
      apartment: address.apartment.trim() || undefined,
      deliveryMethod,
      pickupPointId:
        deliveryMethod === 'PICKUP_POINT' ? (selectedPickupId ?? undefined) : undefined,
      paymentProvider: payment,
      paymentReceipt: payment === 'UZCARD' ? receiptPath : undefined,
      paymentNote: payment === 'UZCARD' && paymentNote.trim() ? paymentNote.trim() : undefined,
      notes: address.notes.trim() || undefined,
      redeemCoins: coinsToRedeem,
    };

    let result: {
      success: boolean;
      data?: { order: { number: string; id: string } };
      error?: { message: string };
    } = { success: false };
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      });
      result = await res.json();
    } catch {
      result = { success: false, error: { message: t('errors.network') } };
    }
    setSubmitting(false);

    if (!result.success || !result.data) {
      toast({ title: result.error?.message ?? t('errors.failed'), variant: 'destructive' });
      return;
    }

    const orderNumber = result.data.order.number;
    const orderId = result.data.order.id;
    // Faqat shu guruh buyurtma qilindi — boshqa guruh savatda qolishi kerak
    if (scope === 'GLOBAL' || scope === 'LOCAL') {
      items.forEach((it) => removeItem(it.id));
    } else {
      clear();
    }

    if (isOnlineProvider(payment)) {
      try {
        const payRes = await fetch('/api/payments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ orderId, provider: payment }),
        });
        const payJson = (await payRes.json()) as {
          success: boolean;
          data?: { online: boolean; checkoutUrl: string | null };
        };
        if (payJson.success && payJson.data?.checkoutUrl) {
          window.location.href = payJson.data.checkoutUrl;
          return;
        }
      } catch {
        // to'lov yaratishda xato — buyurtma baribir yaratildi, success'ga o'tamiz
      }
    }

    toast({
      title: t('success'),
      description: `№ ${orderNumber}`,
      variant: 'success',
      duration: 4000,
    });
    router.push(`/orders/success?number=${orderNumber}`);
  };

  return (
    // Konteynerdan chiqib, to'liq kenglik — #FAF9F7 fon (1d)
    <div className="bg-paper relative left-1/2 right-1/2 -mx-[50vw] -my-6 w-screen md:-my-10">
      {/* Header: logo + 3-bosqich progress + xavfsiz to'lov */}
      <header className="border-border flex items-center justify-between border-b bg-white px-5 py-4 md:px-12">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/sellobay-square.png?v9"
            alt="Sellobay"
            width={38}
            height={38}
            className="rounded-[9px]"
          />
          <span className="text-brand-ink hidden font-serif text-xl font-bold sm:inline">
            Sellobay
          </span>
        </Link>
        <ol className="flex items-center">
          <Step done label={t('steps.cart')} />
          <span className="bg-brand-ink mx-3 h-[1.5px] w-8 md:w-14" aria-hidden />
          <Step index="2" active label={t('steps.shipping')} />
          <span className="bg-border mx-3 h-[1.5px] w-8 md:w-14" aria-hidden />
          <Step index="3" label={t('steps.payment')} />
        </ol>
        <div className="text-muted-foreground hidden items-center gap-1.5 text-[12.5px] md:flex">
          <ShieldCheck size={15} className="text-primary" />
          {t('securePayment')}
        </div>
      </header>

      <div className="grid gap-6 px-5 pb-16 pt-8 md:grid-cols-[1fr_440px] md:gap-8 md:px-12 md:pb-20 md:pt-9">
        {/* Chap ustun */}
        <div className="flex flex-col gap-6">
          <AddressSection
            address={address}
            onChange={setAddress}
            homeOutsideTashkent={homeOutsideTashkent}
            onSwitchToPickup={() => setDeliveryType('REGION_PICKUP')}
          />

          <ShippingSection
            isGlobalOrder={isGlobalOrder}
            deliveryType={deliveryType}
            homeSpeed={homeSpeed}
            subtotal={subtotal}
            pickupPoints={pickupPoints}
            selectedPickupId={selectedPickupId}
            selectedPickup={selectedPickup}
            onSelectHome={(speed) => {
              setDeliveryType('TASHKENT_HOME');
              setHomeSpeed(speed);
            }}
            onSelectPickup={() => setDeliveryType('REGION_PICKUP')}
            onPickPoint={setSelectedPickupId}
          />

          <PaymentSection
            payment={payment}
            onSelectPayment={setPayment}
            total={total}
            cards={cards}
            copiedCard={copiedCard}
            onCopyCard={copyCard}
            receipt={receiptPreview}
            receiptBusy={receiptBusy}
            onReceiptFile={(f) => void onReceiptFile(f)}
            paymentNote={paymentNote}
            onPaymentNote={setPaymentNote}
          />
        </div>

        {/* O'ng ustun — sticky xulosa + premium karta */}
        <OrderSummary
          items={items}
          subtotal={subtotal}
          shippingFee={shippingFee}
          coinDiscount={coinDiscount}
          total={total}
          redeemableCoins={redeemableCoins}
          useCoins={useCoins}
          onToggleCoins={() => setUseCoins((v) => !v)}
          submitting={submitting}
          onPlaceOrder={() => void placeOrder()}
        />
      </div>
    </div>
  );
}
