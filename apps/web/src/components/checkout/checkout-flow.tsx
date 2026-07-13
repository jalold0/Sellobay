'use client';

import { toast } from '@ecom/ui';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { looksLikeTashkentCityText } from '@ecom/utils';

import { formatMoney } from '../../lib/format';
import { COIN_VALUE_SOM, coinsForOrder } from '../../lib/loyalty';
import { productImage } from '../../lib/mock-data';
import { isOnlineProvider } from '../../lib/payments';
import { useCart } from '../../store/cart';

const SHIPPING_FEE = 20_000;
const EXPRESS_FEE = 50_000;
const FREE_SHIPPING_THRESHOLD = 500_000;

interface AddressForm {
  firstName: string;
  lastName: string;
  phone: string;
  region: string;
  city: string;
  street: string;
  apartment: string;
  notes: string;
}

type DeliveryType = 'TASHKENT_HOME' | 'REGION_PICKUP';
type HomeSpeed = 'STANDARD' | 'EXPRESS';
type PaymentProvider = 'CLICK' | 'PAYME' | 'UZUM_BANK' | 'UZCARD' | 'HUMO' | 'CASH_ON_DELIVERY';

interface PickupPointDTO {
  id: string;
  code: string;
  provider: string;
  name: Record<string, string> | string;
  region: string;
  city: string;
  district: string | null;
  street: string;
  building: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  workingHours: string | null;
}

interface PaymentCardDTO {
  number: string;
  holder: string;
  bank?: string;
}

/** Chek rasmini brauzerda kichraytirib JPEG data-URL qaytaradi (DB'da base64 saqlanadi). */
async function downscaleToDataUrl(file: File, maxDim = 1400, quality = 0.82): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => rej(new Error('read'));
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const im = new window.Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('img'));
    im.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

// 1d — 4 ta to'lov plitkasi (Karta / Payme / Click / Naqd)
const PAYMENT_TILES: {
  id: PaymentProvider;
  label: 'card' | 'payme' | 'click' | 'cashShort';
  sub: 'cardSub' | 'appConfirm' | 'onReceive';
  Icon: typeof CreditCard;
}[] = [
  { id: 'UZCARD', label: 'card', sub: 'cardSub', Icon: CreditCard },
  { id: 'PAYME', label: 'payme', sub: 'appConfirm', Icon: Smartphone },
  { id: 'CLICK', label: 'click', sub: 'appConfirm', Icon: CheckCircle2 },
  { id: 'CASH_ON_DELIVERY', label: 'cashShort', sub: 'onReceive', Icon: Banknote },
];

export function CheckoutFlow() {
  const router = useRouter();
  const t = useTranslations('checkout');
  const locale = useLocale();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
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
  const [receipt, setReceipt] = React.useState('');
  const [receiptBusy, setReceiptBusy] = React.useState(false);
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
      setReceipt(await downscaleToDataUrl(file));
    } catch {
      toast({ title: t('errors.failed'), variant: 'destructive' });
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
  const pickName = (n: PickupPointDTO['name']) =>
    typeof n === 'string' ? n : (n[locale] ?? n.uz ?? Object.values(n)[0] ?? '');

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
  const shippingFee =
    deliveryMethod === 'PICKUP_POINT'
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
        <h1 className="text-brand-ink mt-4 font-serif text-2xl font-semibold">{t('emptyTitle')}</h1>
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
    if (payment === 'UZCARD' && !receipt) {
      toast({ title: t('payment.receiptRequired'), variant: 'warning' });
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
      paymentReceipt: payment === 'UZCARD' ? receipt : undefined,
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
    clear();

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
          {/* Manzil */}
          <section className="border-border rounded-[18px] border bg-white p-6 md:p-7">
            <h2 className="text-brand-ink mb-5 font-serif text-xl font-semibold">
              {t('address.title')}
            </h2>

            {homeOutsideTashkent && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="flex-1">
                  <p className="text-xs leading-5 text-amber-800">{t('shipping.tashkentOnly')}</p>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('REGION_PICKUP')}
                    className="text-primary mt-1.5 text-xs font-semibold hover:underline"
                  >
                    {t('shipping.switchToPickup')}
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-3.5 sm:grid-cols-2">
              <TextField
                label={t('address.firstName')}
                value={address.firstName}
                onChange={(v) => setAddress({ ...address, firstName: v })}
              />
              <TextField
                label={t('address.lastName')}
                value={address.lastName}
                onChange={(v) => setAddress({ ...address, lastName: v })}
              />
              <TextField
                label={t('address.phone')}
                value={address.phone}
                onChange={(v) => setAddress({ ...address, phone: v })}
                placeholder={t('address.phonePlaceholder')}
              />
              <TextField
                label={t('address.region')}
                value={address.region}
                onChange={(v) => setAddress({ ...address, region: v })}
                placeholder={t('address.regionPlaceholder')}
              />
              <TextField
                label={t('address.city')}
                value={address.city}
                onChange={(v) => setAddress({ ...address, city: v })}
                placeholder={t('address.cityPlaceholder')}
              />
              <TextField
                label={t('address.street')}
                value={address.street}
                onChange={(v) => setAddress({ ...address, street: v })}
                placeholder={t('address.streetPlaceholder')}
              />
              <TextField
                label={t('address.apartment')}
                value={address.apartment}
                onChange={(v) => setAddress({ ...address, apartment: v })}
                placeholder={t('address.apartmentPlaceholder')}
                className="sm:col-span-2"
              />
              <TextField
                label={t('address.notes')}
                value={address.notes}
                onChange={(v) => setAddress({ ...address, notes: v })}
                placeholder={t('address.notesPlaceholder')}
                className="sm:col-span-2"
              />
            </div>
          </section>

          {/* Yetkazish usuli */}
          <section className="border-border rounded-[18px] border bg-white p-6 md:p-7">
            <h2 className="text-brand-ink mb-[18px] font-serif text-xl font-semibold">
              {t('shipping.methodTitle')}
            </h2>
            <div className="flex flex-col gap-3">
              <DeliveryRow
                selected={deliveryType === 'TASHKENT_HOME' && homeSpeed === 'STANDARD'}
                onSelect={() => {
                  setDeliveryType('TASHKENT_HOME');
                  setHomeSpeed('STANDARD');
                }}
                title={t('shipping.courierRow')}
                sub={t('shipping.courierWindow')}
                price={
                  subtotal >= FREE_SHIPPING_THRESHOLD
                    ? t('shipping.free')
                    : formatMoney(SHIPPING_FEE)
                }
              />
              <DeliveryRow
                selected={deliveryType === 'REGION_PICKUP'}
                onSelect={() => setDeliveryType('REGION_PICKUP')}
                title={t('shipping.pickupRow')}
                sub={
                  selectedPickup
                    ? [selectedPickup.city, selectedPickup.street].filter(Boolean).join(', ')
                    : t('shipping.regionPickupSub')
                }
                price={t('shipping.freeBepul')}
                priceTone="success"
              />
              <DeliveryRow
                selected={deliveryType === 'TASHKENT_HOME' && homeSpeed === 'EXPRESS'}
                onSelect={() => {
                  setDeliveryType('TASHKENT_HOME');
                  setHomeSpeed('EXPRESS');
                }}
                title={t('shipping.expressRow')}
                sub={t('shipping.expressTashkent')}
                price={formatMoney(EXPRESS_FEE)}
                chip={t('shipping.expressChip')}
              />
            </div>

            {/* REGION_PICKUP tanlanganda — punkt ro'yxati */}
            {deliveryType === 'REGION_PICKUP' && (
              <div className="mt-4 space-y-2">
                <div className="text-muted-foreground text-xs font-medium">
                  {t('shipping.selectPickup')}
                </div>
                {pickupPoints.length === 0 ? (
                  <div className="bg-muted text-muted-foreground rounded-xl p-3 text-xs">
                    {t('shipping.pickupSoon')}
                  </div>
                ) : (
                  pickupPoints.map((p) => {
                    const sel = selectedPickupId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPickupId(p.id)}
                        className={`w-full rounded-xl border-2 p-3 text-left transition ${
                          sel ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <MapPin
                            className={`mt-0.5 h-4 w-4 shrink-0 ${sel ? 'text-primary' : 'text-muted-foreground'}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-brand-ink flex-1 truncate text-sm font-semibold">
                                {pickName(p.name)}
                              </span>
                              <span className="bg-muted rounded-full px-2 py-0.5 text-[10px] font-bold">
                                {p.provider}
                              </span>
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {[p.region, p.city, p.street].filter(Boolean).join(', ')}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </section>

          {/* To'lov usuli */}
          <section className="border-border rounded-[18px] border bg-white p-6 md:p-7">
            <h2 className="text-brand-ink mb-[18px] font-serif text-xl font-semibold">
              {t('payment.methodTitle')}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PAYMENT_TILES.map((tile) => {
                const active = payment === tile.id;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => setPayment(tile.id)}
                    className={`flex flex-col items-center gap-2 rounded-[14px] border-2 px-3.5 py-[18px] transition ${
                      active
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-foreground/30'
                    }`}
                  >
                    <tile.Icon
                      size={22}
                      strokeWidth={1.8}
                      className={active ? 'text-primary' : 'text-[#3a3a40]'}
                    />
                    <span className="text-brand-ink text-[12.5px] font-bold">
                      {t(`payment.${tile.label}`)}
                    </span>
                    <span className="text-muted-foreground text-center text-[10.5px] leading-tight">
                      {t(`payment.${tile.sub}`)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Karta orqali to'lov — kartalar + chek yuklash */}
            {payment === 'UZCARD' ? (
              <div className="border-primary/30 bg-primary/[0.03] mt-4 space-y-4 rounded-[14px] border p-4">
                <div>
                  <h3 className="text-brand-ink text-sm font-bold">
                    {t('payment.cardTransferTitle')}
                  </h3>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {t('payment.cardTransferHint')}
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5 text-sm">
                  <span className="text-muted-foreground">{t('payment.amountToTransfer')}</span>
                  <span className="text-brand-ink font-bold">{formatMoney(total)}</span>
                </div>

                <div className="space-y-2">
                  {cards.map((c) => (
                    <div
                      key={c.number}
                      className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-brand-ink font-mono text-[15px] font-semibold tracking-wide">
                          {c.number}
                        </div>
                        <div className="text-muted-foreground truncate text-[11px]">
                          {c.holder}
                          {c.bank ? ` · ${c.bank}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyCard(c.number)}
                        className="text-primary ml-3 shrink-0 text-xs font-semibold hover:underline"
                      >
                        {copiedCard === c.number ? t('payment.copied') : t('payment.copyCard')}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Chek yuklash */}
                <div>
                  <label
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm font-semibold transition ${
                      receipt
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-border text-brand-ink hover:border-primary/50'
                    }`}
                  >
                    {receiptBusy ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : receipt ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <CreditCard size={16} />
                    )}
                    {receiptBusy
                      ? t('payment.receiptProcessing')
                      : receipt
                        ? `${t('payment.receiptUploaded')} · ${t('payment.replaceReceipt')}`
                        : t('payment.uploadReceipt')}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => void onReceiptFile(e.target.files?.[0])}
                    />
                  </label>
                  {receipt ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={receipt}
                      alt="receipt"
                      className="mt-2 max-h-40 rounded-lg border object-contain"
                    />
                  ) : null}
                </div>

                <div>
                  <label className="text-muted-foreground mb-1 block text-xs">
                    {t('payment.receiptNoteLabel')}
                  </label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder={t('payment.receiptNotePlaceholder')}
                    maxLength={300}
                    className="border-border focus:border-primary w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none"
                  />
                </div>
              </div>
            ) : null}

            <div className="text-muted-foreground bg-muted mt-4 flex items-start gap-2 rounded-xl p-3 text-xs">
              <ShieldCheck size={13} className="text-primary mt-0.5 shrink-0" />
              {t('payment.secureNote')}
            </div>
          </section>
        </div>

        {/* O'ng ustun — sticky xulosa + premium karta */}
        <aside className="flex flex-col gap-4 lg:self-start">
          <div className="border-border rounded-[18px] border bg-white p-6 md:p-7 lg:sticky lg:top-24">
            <h2 className="text-brand-ink mb-[18px] font-serif text-xl font-semibold">
              {t('summaryTitle', { count: items.length })}
            </h2>

            <ul className="flex flex-col gap-3.5">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3.5">
                  <div className="bg-soft relative h-[72px] w-[60px] shrink-0 overflow-hidden rounded-[10px]">
                    <Image
                      src={i.imageUrl ?? productImage(i.imageSeed, 120)}
                      alt={i.name}
                      fill
                      sizes="60px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-brand-ink line-clamp-2 text-[13px] font-semibold leading-[1.35]">
                      {i.name}
                    </div>
                    <div className="mt-1 text-[11.5px] text-[#9a9aa2]">
                      {t('pcs', { count: i.quantity })}
                    </div>
                  </div>
                  <span className="text-brand-ink whitespace-nowrap text-[13.5px] font-extrabold">
                    {formatMoney(i.quantity * i.unitPrice)}
                  </span>
                </li>
              ))}
            </ul>

            {/* Sello Coins toggle — dashed-gold chip uslubida */}
            {redeemableCoins > 0 && (
              <button
                type="button"
                onClick={() => setUseCoins((v) => !v)}
                className={`mt-5 flex w-full items-center gap-2.5 rounded-xl border-[1.5px] p-3 text-left text-[13px] font-semibold transition ${
                  useCoins
                    ? 'border-brand-gold bg-promo text-brand-gold-text'
                    : 'border-brand-gold bg-promo text-brand-gold-text hover:bg-promo/70 border-dashed'
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                    useCoins ? 'border-brand-gold bg-brand-gold text-white' : 'border-brand-gold'
                  }`}
                >
                  {useCoins ? <CheckCircle2 size={12} /> : null}
                </span>
                <span className="flex-1">
                  {t('useCoinsAvail', {
                    coins: redeemableCoins,
                    som: formatMoney(redeemableCoins * COIN_VALUE_SOM),
                  })}
                </span>
              </button>
            )}

            {/* Totallar */}
            <div className="border-border mt-5 flex flex-col gap-2.5 border-t pt-[18px] text-[13.5px] text-[#4a4a52]">
              <div className="flex justify-between">
                <span>{t('summaryItemsCount', { count: items.length })}</span>
                <span className="text-brand-ink font-semibold">{formatMoney(subtotal)}</span>
              </div>
              {coinDiscount > 0 && (
                <div className="flex justify-between">
                  <span>{t('coinDiscount')}</span>
                  <span className="text-primary font-semibold">− {formatMoney(coinDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t('summaryShipping')}</span>
                <span className="text-brand-ink font-semibold">
                  {shippingFee === 0 ? t('shipping.freeBepul') : formatMoney(shippingFee)}
                </span>
              </div>
              <div className="border-border flex items-baseline justify-between border-t pt-3">
                <span className="text-brand-ink text-[14.5px] font-bold">{t('summaryTotal')}</span>
                <span className="text-brand-ink font-serif text-2xl font-bold">
                  {formatMoney(total)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={placeOrder}
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 mt-[22px] flex h-[54px] w-full items-center justify-center gap-2.5 rounded-full text-[15px] font-bold text-white transition disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {t('goToPayment')}
                  <ArrowRight size={16} strokeWidth={2.2} />
                </>
              )}
            </button>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-[#9a9aa2]">
              <ShieldCheck size={13} />
              {t('sslNote')}
            </div>
          </div>

          {/* Premium ball karta */}
          <div className="bg-brand-ink flex items-center gap-3 rounded-2xl px-5 py-4">
            <span className="text-brand-gold text-lg">◆</span>
            <span className="text-[12.5px] leading-[1.5] text-white/85">
              {t('premiumPoints', { points: coinsForOrder(total) })}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Step({
  index,
  label,
  active,
  done,
}: {
  index?: string;
  label: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={`grid h-[26px] w-[26px] place-items-center rounded-full text-xs font-extrabold ${
          done
            ? 'bg-brand-ink text-brand-gold'
            : active
              ? 'bg-primary text-white'
              : 'border-[1.5px] border-[#d5d5d9] text-[#9a9aa2]'
        }`}
      >
        {done ? '✓' : index}
      </span>
      <span
        className={`hidden text-[13px] font-bold sm:inline ${
          done ? 'text-brand-ink' : active ? 'text-primary' : 'font-semibold text-[#9a9aa2]'
        }`}
      >
        {label}
      </span>
    </li>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-brand-ink mb-1.5 block text-xs font-semibold">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-border text-brand-ink focus:border-primary focus:ring-primary/15 h-11 w-full rounded-xl border bg-white px-3.5 text-sm outline-none transition placeholder:text-[#9a9aa2] focus:ring-2"
      />
    </div>
  );
}

function DeliveryRow({
  selected,
  onSelect,
  title,
  sub,
  price,
  priceTone,
  chip,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  sub: string;
  price: string;
  priceTone?: 'success';
  chip?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-4 rounded-[14px] border-2 p-4 text-left transition ${
        selected ? 'border-primary' : 'border-border hover:border-foreground/20'
      }`}
    >
      <span
        className={`h-5 w-5 shrink-0 rounded-full ${
          selected ? 'border-primary border-[6px]' : 'border-[1.5px] border-[#d5d5d9]'
        }`}
      />
      <div className="flex-1">
        <div className="text-brand-ink flex items-center gap-2 text-sm font-bold">
          {title}
          {chip && (
            <span className="bg-brand-gold text-brand-crimson-deep rounded-full px-2 py-[3px] text-[10px] font-extrabold">
              {chip}
            </span>
          )}
        </div>
        <div className="text-muted-foreground mt-0.5 text-[12.5px]">{sub}</div>
      </div>
      <span
        className={`whitespace-nowrap text-sm font-extrabold ${
          priceTone === 'success' ? 'text-success' : 'text-brand-ink'
        }`}
      >
        {price}
      </span>
    </button>
  );
}
