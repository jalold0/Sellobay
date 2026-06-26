'use client';

import { Button, Input, Label, Separator, toast } from '@ecom/ui';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  CreditCard,
  MapPin,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { formatMoney } from '../../lib/format';
import { COIN_VALUE_SOM, coinsForOrder } from '../../lib/loyalty';
import { productImage } from '../../lib/mock-data';
import { useCart } from '../../store/cart';

const SHIPPING_FEE = 20_000;
const EXPRESS_FEE = 50_000;
const FREE_SHIPPING_THRESHOLD = 500_000;

type Step = 'address' | 'shipping' | 'payment' | 'review';

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

interface ShippingForm {
  method: 'HOME_DELIVERY' | 'PICKUP_POINT' | 'EXPRESS';
  date: 'asap' | 'tomorrow' | 'scheduled';
}

interface PaymentForm {
  provider: 'CLICK' | 'PAYME' | 'UZUM_BANK' | 'UZCARD' | 'HUMO' | 'CASH_ON_DELIVERY';
}

const STEP_KEYS: Step[] = ['address', 'shipping', 'payment', 'review'];
const STEP_ICONS: Record<Step, typeof MapPin> = {
  address: MapPin,
  shipping: Package,
  payment: CreditCard,
  review: Check,
};

const PAYMENT_OPTIONS: {
  id: PaymentForm['provider'];
  key: 'click' | 'payme' | 'uzumBank' | 'uzcard' | 'humo' | 'cash';
  emoji: string;
}[] = [
  { id: 'CLICK', key: 'click', emoji: '💳' },
  { id: 'PAYME', key: 'payme', emoji: '💰' },
  { id: 'UZUM_BANK', key: 'uzumBank', emoji: '🏦' },
  { id: 'UZCARD', key: 'uzcard', emoji: '💳' },
  { id: 'HUMO', key: 'humo', emoji: '💳' },
  { id: 'CASH_ON_DELIVERY', key: 'cash', emoji: '💵' },
];

export function CheckoutFlow() {
  const router = useRouter();
  const t = useTranslations('checkout');
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [step, setStep] = React.useState<Step>('address');
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
  const [shipping, setShipping] = React.useState<ShippingForm>({
    method: 'HOME_DELIVERY',
    date: 'asap',
  });
  const [payment, setPayment] = React.useState<PaymentForm>({ provider: 'CLICK' });
  const [submitting, setSubmitting] = React.useState(false);

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

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const shippingFee =
    shipping.method === 'PICKUP_POINT'
      ? 0
      : shipping.method === 'EXPRESS'
        ? EXPRESS_FEE
        : subtotal >= FREE_SHIPPING_THRESHOLD
          ? 0
          : SHIPPING_FEE;
  const baseTotal = subtotal + shippingFee;
  // Ishlatish mumkin bo'lgan coinlar: balansdan va summadan oshmaydi
  const redeemableCoins = Math.min(coinBalance, Math.floor(baseTotal / COIN_VALUE_SOM));
  const coinsToRedeem = useCoins ? redeemableCoins : 0;
  const coinDiscount = coinsToRedeem * COIN_VALUE_SOM;
  const total = baseTotal - coinDiscount;

  const stepIdx = STEP_KEYS.indexOf(step);

  if (!mounted) return <div className="h-96" aria-hidden />;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Package className="text-muted-foreground mx-auto h-12 w-12" />
        <h1 className="mt-4 text-2xl font-bold">{t('emptyTitle')}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{t('emptyHint')}</p>
        <Button asChild className="mt-6">
          <Link href="/catalog">{t('openCatalog')}</Link>
        </Button>
      </div>
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
      toast({ title: t('errors.required'), variant: 'warning' });
      return;
    }
    const i = STEP_KEYS.indexOf(step);
    if (i < STEP_KEYS.length - 1) setStep(STEP_KEYS[i + 1]!);
  };
  const prevStep = () => {
    const i = STEP_KEYS.indexOf(step);
    if (i > 0) setStep(STEP_KEYS[i - 1]!);
  };

  const placeOrder = async () => {
    setSubmitting(true);
    const payload = {
      items: items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        variantId: it.variantId ?? undefined,
      })),
      recipientName: `${address.firstName.trim()} ${address.lastName.trim()}`.trim(),
      phone: address.phone.trim(),
      region: address.region.trim() || 'Toshkent',
      city: address.city.trim(),
      street: address.street.trim(),
      apartment: address.apartment.trim() || undefined,
      deliveryMethod: shipping.method,
      paymentProvider: payment.provider,
      notes: address.notes.trim() || undefined,
      redeemCoins: coinsToRedeem,
    };

    let result: {
      success: boolean;
      data?: { order: { number: string } };
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
      toast({
        title: result.error?.message ?? t('errors.failed'),
        variant: 'destructive',
      });
      return;
    }

    const orderNumber = result.data.order.number;
    clear();
    toast({
      title: t('success'),
      description: `№ ${orderNumber}`,
      variant: 'success',
      duration: 4000,
    });
    router.push(`/orders/success?number=${orderNumber}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>

      <ol className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEP_KEYS.map((s, i) => {
          const Icon = STEP_ICONS[s];
          const done = i < stepIdx;
          const active = i === stepIdx;
          return (
            <React.Fragment key={s}>
              <li
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : done
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {done ? <Check size={14} /> : <Icon size={14} />}
                <span className="whitespace-nowrap">
                  {i + 1}. {t(`steps.${s}`)}
                </span>
              </li>
              {i < STEP_KEYS.length - 1 && (
                <span className="bg-border h-px w-4 shrink-0 sm:w-8" aria-hidden />
              )}
            </React.Fragment>
          );
        })}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="bg-card space-y-4 rounded-xl border p-5 md:p-6">
          {step === 'address' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="text-primary h-4 w-4" />
                <h2 className="text-base font-semibold">{t('address.title')}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t('address.firstName')}>
                  <Input
                    value={address.firstName}
                    onChange={(e) => setAddress({ ...address, firstName: e.target.value })}
                  />
                </Field>
                <Field label={t('address.lastName')}>
                  <Input
                    value={address.lastName}
                    onChange={(e) => setAddress({ ...address, lastName: e.target.value })}
                  />
                </Field>
                <Field label={t('address.phone')}>
                  <Input
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    placeholder={t('address.phonePlaceholder')}
                  />
                </Field>
                <Field label={t('address.region')}>
                  <Input
                    value={address.region}
                    onChange={(e) => setAddress({ ...address, region: e.target.value })}
                    placeholder={t('address.regionPlaceholder')}
                  />
                </Field>
                <Field label={t('address.city')}>
                  <Input
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    placeholder={t('address.cityPlaceholder')}
                  />
                </Field>
                <Field label={t('address.street')}>
                  <Input
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    placeholder={t('address.streetPlaceholder')}
                  />
                </Field>
                <Field label={t('address.apartment')} className="sm:col-span-2">
                  <Input
                    value={address.apartment}
                    onChange={(e) => setAddress({ ...address, apartment: e.target.value })}
                    placeholder={t('address.apartmentPlaceholder')}
                  />
                </Field>
                <Field label={t('address.notes')} className="sm:col-span-2">
                  <Input
                    value={address.notes}
                    onChange={(e) => setAddress({ ...address, notes: e.target.value })}
                    placeholder={t('address.notesPlaceholder')}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 'shipping' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Package className="text-primary h-4 w-4" />
                <h2 className="text-base font-semibold">{t('shipping.title')}</h2>
              </div>
              <div className="space-y-2">
                {[
                  {
                    id: 'HOME_DELIVERY' as const,
                    label: t('shipping.home'),
                    sub: t('shipping.homeSub'),
                    price: subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE,
                  },
                  {
                    id: 'EXPRESS' as const,
                    label: t('shipping.express'),
                    sub: t('shipping.expressSub'),
                    price: EXPRESS_FEE,
                  },
                  {
                    id: 'PICKUP_POINT' as const,
                    label: t('shipping.pickup'),
                    sub: t('shipping.pickupSub'),
                    price: 0,
                  },
                ].map((opt) => {
                  const active = shipping.method === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setShipping((s) => ({ ...s, method: opt.id }))}
                      className={`flex w-full items-center justify-between rounded-lg border-2 p-4 text-left transition ${
                        active
                          ? 'border-primary bg-primary/5'
                          : 'border-input hover:border-foreground/30'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-muted-foreground text-xs">{opt.sub}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {opt.price === 0 ? t('shipping.free') : formatMoney(opt.price)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="text-primary h-4 w-4" />
                <h2 className="text-base font-semibold">{t('payment.title')}</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {PAYMENT_OPTIONS.map((p) => {
                  const active = payment.provider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPayment({ provider: p.id })}
                      className={`flex items-center gap-3 rounded-lg border-2 p-3.5 text-left transition ${
                        active
                          ? 'border-primary bg-primary/5'
                          : 'border-input hover:border-foreground/30'
                      }`}
                    >
                      <div className="bg-muted grid h-10 w-10 shrink-0 place-items-center rounded-md text-xl">
                        {p.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{t(`payment.${p.key}`)}</div>
                        <div className="text-muted-foreground truncate text-xs">
                          {t(`payment.${p.key}Sub`)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="bg-secondary/40 text-muted-foreground rounded-md p-3 text-xs">
                <ShieldCheck size={12} className="mr-1 inline text-emerald-600" />
                {t('payment.secureNote')}
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">{t('review.title')}</h2>

              <ReviewBlock
                title={t('review.addressLabel')}
                editLabel={t('review.edit')}
                onEdit={() => setStep('address')}
              >
                <div>
                  {address.firstName} {address.lastName} · {address.phone}
                </div>
                <div className="text-muted-foreground">
                  {[address.region, address.city, address.street, address.apartment]
                    .filter(Boolean)
                    .join(', ')}
                </div>
                {address.notes && (
                  <div className="text-muted-foreground">
                    {t('address.notesLabel')}: {address.notes}
                  </div>
                )}
              </ReviewBlock>

              <ReviewBlock
                title={t('review.shippingLabel')}
                editLabel={t('review.edit')}
                onEdit={() => setStep('shipping')}
              >
                <div>
                  {shipping.method === 'HOME_DELIVERY'
                    ? t('shipping.home')
                    : shipping.method === 'EXPRESS'
                      ? t('shipping.express')
                      : t('shipping.pickup')}
                </div>
              </ReviewBlock>

              <ReviewBlock
                title={t('review.paymentLabel')}
                editLabel={t('review.edit')}
                onEdit={() => setStep('payment')}
              >
                <div>
                  {(() => {
                    const opt = PAYMENT_OPTIONS.find((p) => p.id === payment.provider);
                    return opt ? t(`payment.${opt.key}`) : '';
                  })()}
                </div>
              </ReviewBlock>

              <ReviewBlock
                title={t('review.itemsLabel', { count: items.length })}
                editLabel={t('review.edit')}
              >
                <ul className="-my-2 divide-y">
                  {items.map((i) => (
                    <li key={i.id} className="flex items-center gap-3 py-2">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded">
                        <Image
                          src={productImage(i.imageSeed, 100)}
                          alt={i.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{i.name}</div>
                        <div className="text-muted-foreground text-xs">
                          {i.quantity} × {formatMoney(i.unitPrice)}
                        </div>
                      </div>
                      <div className="text-sm font-medium">
                        {formatMoney(i.quantity * i.unitPrice)}
                      </div>
                    </li>
                  ))}
                </ul>
              </ReviewBlock>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={stepIdx === 0}
              className="gap-1"
              type="button"
            >
              <ChevronLeft size={16} /> {t('back')}
            </Button>
            {step === 'review' ? (
              <Button onClick={placeOrder} disabled={submitting} size="lg">
                {submitting ? t('submitting') : t('placeOrder')}
              </Button>
            ) : (
              <Button onClick={nextStep} size="lg" className="gap-1">
                {t('next')} <ChevronRight size={16} />
              </Button>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="bg-card space-y-3 rounded-xl border p-5">
            <div className="text-base font-semibold">{t('summary')}</div>
            <ul className="space-y-2 text-sm">
              {items.slice(0, 3).map((i) => (
                <li key={i.id} className="flex justify-between gap-2">
                  <span className="text-muted-foreground line-clamp-1">
                    {i.quantity} × {i.name}
                  </span>
                  <span className="whitespace-nowrap">{formatMoney(i.quantity * i.unitPrice)}</span>
                </li>
              ))}
              {items.length > 3 && (
                <li className="text-muted-foreground text-xs">
                  {t('summaryMore', { count: items.length - 3 })}
                </li>
              )}
            </ul>
            <Separator />
            <div className="space-y-1 text-sm">
              <Row label={t('summaryItems')} value={formatMoney(subtotal)} />
              <Row
                label={t('summaryShipping')}
                value={shippingFee === 0 ? t('shipping.free') : formatMoney(shippingFee)}
                highlight={shippingFee === 0}
              />
              {coinDiscount > 0 && (
                <Row label={t('coinDiscount')} value={`−${formatMoney(coinDiscount)}`} highlight />
              )}
            </div>

            {/* Sello Coins redeem toggle — faqat balans > 0 bo'lsa */}
            {redeemableCoins > 0 && (
              <button
                type="button"
                onClick={() => setUseCoins((v) => !v)}
                className={`flex w-full items-center gap-2.5 rounded-lg border p-3 text-left transition ${
                  useCoins
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
                    : 'border-input hover:border-amber-300'
                }`}
              >
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded border-2 ${
                    useCoins ? 'border-amber-500 bg-amber-500 text-white' : 'border-input'
                  }`}
                >
                  {useCoins ? <Check size={13} /> : null}
                </span>
                <Coins size={16} className="shrink-0 text-amber-500" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{t('useCoinsTitle')}</span>
                  <span className="text-muted-foreground block text-xs">
                    {t('useCoinsAvail', {
                      coins: redeemableCoins,
                      som: formatMoney(redeemableCoins * COIN_VALUE_SOM),
                    })}
                  </span>
                </span>
              </button>
            )}

            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>{t('summaryTotal')}</span>
              <span>{formatMoney(total)}</span>
            </div>
            {/* Sello Coins earn hint — conversion + signup driver */}
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              <Coins size={14} className="shrink-0" />
              <span>{t('coinsEarn', { coins: coinsForOrder(total) })}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? 'font-medium text-emerald-700' : ''}>{value}</span>
    </div>
  );
}

function ReviewBlock({
  title,
  onEdit,
  editLabel,
  children,
}: {
  title: string;
  onEdit?: () => void;
  editLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background rounded-md border p-3 text-sm">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
          {title}
        </div>
        {onEdit && (
          <button type="button" onClick={onEdit} className="text-primary text-xs hover:underline">
            {editLabel}
          </button>
        )}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
