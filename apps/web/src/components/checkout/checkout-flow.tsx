'use client';

import { Button, Input, Label, Separator, toast } from '@ecom/ui';
import { Check, ChevronLeft, ChevronRight, CreditCard, MapPin, Package, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { formatMoney } from '../../lib/format';
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

const STEPS: { id: Step; label: string; icon: typeof MapPin }[] = [
  { id: 'address', label: 'Manzil', icon: MapPin },
  { id: 'shipping', label: 'Yetkazib berish', icon: Package },
  { id: 'payment', label: "To'lov", icon: CreditCard },
  { id: 'review', label: 'Tasdiqlash', icon: Check },
];

const PAYMENT_OPTIONS: { id: PaymentForm['provider']; label: string; sub: string; emoji: string }[] = [
  { id: 'CLICK', label: 'Click', sub: 'Tezkor mobil to`lov', emoji: '💳' },
  { id: 'PAYME', label: 'Payme', sub: 'Onlayn to`lov tizimi', emoji: '💰' },
  { id: 'UZUM_BANK', label: 'Uzum Bank', sub: 'Bank ilovasi orqali', emoji: '🏦' },
  { id: 'UZCARD', label: 'Uzcard', sub: 'Plastik karta', emoji: '💳' },
  { id: 'HUMO', label: 'Humo', sub: 'Plastik karta', emoji: '💳' },
  { id: 'CASH_ON_DELIVERY', label: 'Naqd pul', sub: "Kuryer kelganda to'laysiz", emoji: '💵' },
];

export function CheckoutFlow() {
  const router = useRouter();
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

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const shippingFee =
    shipping.method === 'PICKUP_POINT'
      ? 0
      : shipping.method === 'EXPRESS'
        ? EXPRESS_FEE
        : subtotal >= FREE_SHIPPING_THRESHOLD
          ? 0
          : SHIPPING_FEE;
  const total = subtotal + shippingFee;

  const stepIdx = STEPS.findIndex((s) => s.id === step);

  if (!mounted) return <div className="h-96" aria-hidden />;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold">Avval savatchaga mahsulot qo&apos;shing</h1>
        <p className="mt-2 text-sm text-muted-foreground">Buyurtma rasmiylashtirish uchun kamida bitta mahsulot kerak.</p>
        <Button asChild className="mt-6">
          <Link href="/catalog">Katalogga o&apos;tish</Link>
        </Button>
      </div>
    );
  }

  const canNextFromAddress =
    address.firstName.trim() && address.lastName.trim() && address.phone.length >= 12 && address.city.trim() && address.street.trim();

  const nextStep = () => {
    if (step === 'address' && !canNextFromAddress) {
      toast({ title: 'Majburiy maydonlarni to`ldiring', variant: 'warning' });
      return;
    }
    const i = STEPS.findIndex((s) => s.id === step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]!.id);
  };
  const prevStep = () => {
    const i = STEPS.findIndex((s) => s.id === step);
    if (i > 0) setStep(STEPS[i - 1]!.id);
  };

  const placeOrder = async () => {
    setSubmitting(true);
    // Real backend: apiClient.post('/orders', { items, address, shipping, payment })
    await new Promise((r) => setTimeout(r, 800));
    const orderNumber = `ORD-2026-${String(Math.floor(Math.random() * 99_999_999)).padStart(8, '0')}`;
    clear();
    toast({
      title: 'Buyurtma qabul qilindi!',
      description: `№ ${orderNumber}`,
      variant: 'success',
      duration: 4000,
    });
    router.push(`/orders/success?number=${orderNumber}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Buyurtmani rasmiylashtirish</h1>

      {/* Stepper */}
      <ol className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < stepIdx;
          const active = i === stepIdx;
          return (
            <React.Fragment key={s.id}>
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
                  {i + 1}. {s.label}
                </span>
              </li>
              {i < STEPS.length - 1 && (
                <span className="h-px w-4 shrink-0 bg-border sm:w-8" aria-hidden />
              )}
            </React.Fragment>
          );
        })}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4 rounded-xl border bg-card p-5 md:p-6">
          {step === 'address' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">Yetkazib berish manzili</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Ism*">
                  <Input
                    value={address.firstName}
                    onChange={(e) => setAddress({ ...address, firstName: e.target.value })}
                  />
                </Field>
                <Field label="Familiya*">
                  <Input
                    value={address.lastName}
                    onChange={(e) => setAddress({ ...address, lastName: e.target.value })}
                  />
                </Field>
                <Field label="Telefon*">
                  <Input
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    placeholder="+998 90 123 45 67"
                  />
                </Field>
                <Field label="Viloyat">
                  <Input
                    value={address.region}
                    onChange={(e) => setAddress({ ...address, region: e.target.value })}
                    placeholder="Toshkent"
                  />
                </Field>
                <Field label="Shahar/tuman*">
                  <Input
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    placeholder="Yunusobod"
                  />
                </Field>
                <Field label="Ko'cha, uy raqami*">
                  <Input
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    placeholder="Mustaqillik ko'chasi, 12"
                  />
                </Field>
                <Field label="Kvartira/podyezd" className="sm:col-span-2">
                  <Input
                    value={address.apartment}
                    onChange={(e) => setAddress({ ...address, apartment: e.target.value })}
                    placeholder="25-uy, 4-podyezd"
                  />
                </Field>
                <Field label="Eslatma (ixtiyoriy)" className="sm:col-span-2">
                  <Input
                    value={address.notes}
                    onChange={(e) => setAddress({ ...address, notes: e.target.value })}
                    placeholder="Mo'ljal, qo'shimcha ma'lumot..."
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 'shipping' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">Yetkazib berish usulini tanlang</h2>
              </div>
              <div className="space-y-2">
                {[
                  {
                    id: 'HOME_DELIVERY' as const,
                    label: 'Uyga yetkazib berish',
                    sub: '24-48 soat ichida',
                    price: subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE,
                  },
                  {
                    id: 'EXPRESS' as const,
                    label: 'Express yetkazib berish',
                    sub: 'Toshkent bo`yicha 3 soat ichida',
                    price: EXPRESS_FEE,
                  },
                  {
                    id: 'PICKUP_POINT' as const,
                    label: 'Olib ketish punkti',
                    sub: 'Eng yaqin punktdan olib ketish',
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
                        active ? 'border-primary bg-primary/5' : 'border-input hover:border-foreground/30'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.sub}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {opt.price === 0 ? 'Tekin' : formatMoney(opt.price)}
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
                <CreditCard className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">To&apos;lov usulini tanlang</h2>
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
                        active ? 'border-primary bg-primary/5' : 'border-input hover:border-foreground/30'
                      }`}
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-muted text-xl">
                        {p.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{p.label}</div>
                        <div className="truncate text-xs text-muted-foreground">{p.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="rounded-md bg-secondary/40 p-3 text-xs text-muted-foreground">
                <ShieldCheck size={12} className="mr-1 inline text-emerald-600" />
                Karta ma&apos;lumotlaringiz to&apos;lov tizimi serverida xavfsiz saqlanadi, biz ko&apos;rmaymiz.
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">Buyurtmangizni tekshiring</h2>

              <ReviewBlock title="Manzil" onEdit={() => setStep('address')}>
                <div>{address.firstName} {address.lastName} · {address.phone}</div>
                <div className="text-muted-foreground">
                  {[address.region, address.city, address.street, address.apartment].filter(Boolean).join(', ')}
                </div>
                {address.notes && <div className="text-muted-foreground">Eslatma: {address.notes}</div>}
              </ReviewBlock>

              <ReviewBlock title="Yetkazib berish" onEdit={() => setStep('shipping')}>
                <div>
                  {shipping.method === 'HOME_DELIVERY'
                    ? 'Uyga yetkazib berish'
                    : shipping.method === 'EXPRESS'
                      ? 'Express'
                      : 'Pickup punkti'}
                </div>
              </ReviewBlock>

              <ReviewBlock title="To`lov" onEdit={() => setStep('payment')}>
                <div>{PAYMENT_OPTIONS.find((p) => p.id === payment.provider)?.label}</div>
              </ReviewBlock>

              <ReviewBlock title={`Mahsulotlar (${items.length})`}>
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
                        <div className="text-xs text-muted-foreground">
                          {i.quantity} × {formatMoney(i.unitPrice)}
                        </div>
                      </div>
                      <div className="text-sm font-medium">{formatMoney(i.quantity * i.unitPrice)}</div>
                    </li>
                  ))}
                </ul>
              </ReviewBlock>
            </div>
          )}

          {/* Step nav */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={stepIdx === 0}
              className="gap-1"
              type="button"
            >
              <ChevronLeft size={16} /> Orqaga
            </Button>
            {step === 'review' ? (
              <Button onClick={placeOrder} disabled={submitting} size="lg">
                {submitting ? 'Yuborilmoqda...' : 'Buyurtmani tasdiqlash'}
              </Button>
            ) : (
              <Button onClick={nextStep} size="lg" className="gap-1">
                Davom etish <ChevronRight size={16} />
              </Button>
            )}
          </div>
        </div>

        {/* Summary aside */}
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="space-y-3 rounded-xl border bg-card p-5">
            <div className="text-base font-semibold">Buyurtma</div>
            <ul className="space-y-2 text-sm">
              {items.slice(0, 3).map((i) => (
                <li key={i.id} className="flex justify-between gap-2">
                  <span className="line-clamp-1 text-muted-foreground">
                    {i.quantity} × {i.name}
                  </span>
                  <span className="whitespace-nowrap">{formatMoney(i.quantity * i.unitPrice)}</span>
                </li>
              ))}
              {items.length > 3 && (
                <li className="text-xs text-muted-foreground">
                  Va yana {items.length - 3} ta mahsulot...
                </li>
              )}
            </ul>
            <Separator />
            <div className="space-y-1 text-sm">
              <Row label="Mahsulotlar" value={formatMoney(subtotal)} />
              <Row
                label="Yetkazib berish"
                value={shippingFee === 0 ? 'Tekin' : formatMoney(shippingFee)}
                highlight={shippingFee === 0}
              />
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Jami</span>
              <span>{formatMoney(total)}</span>
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
  children,
}: {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-background p-3 text-sm">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </div>
        {onEdit && (
          <button type="button" onClick={onEdit} className="text-xs text-primary hover:underline">
            O&apos;zgartirish
          </button>
        )}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
