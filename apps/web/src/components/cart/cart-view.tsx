'use client';

import { Button, EmptyState, Input, Separator, toast } from '@ecom/ui';
import {
  ArrowRight,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';

import { formatMoney } from '../../lib/format';
import { productImage } from '../../lib/mock-data';
import { useCart, type CartItem } from '../../store/cart';

const FREE_SHIPPING_THRESHOLD = 500_000;
const SHIPPING_FEE = 20_000;

export function CartView() {
  const t = useTranslations('cart');
  const items = useCart((s) => s.items);
  const removeItem = useCart((s) => s.removeItem);
  const updateQuantity = useCart((s) => s.updateQuantity);
  const clear = useCart((s) => s.clear);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [promo, setPromo] = React.useState('');
  const [appliedPromo, setAppliedPromo] = React.useState<{ code: string; discount: number } | null>(
    null,
  );

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discount = appliedPromo?.discount ?? 0;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE;
  const total = Math.max(0, subtotal - discount + shipping);

  const applyPromo = () => {
    const code = promo.trim().toUpperCase();
    if (!code) return;
    if (code === 'WELCOME10') {
      setAppliedPromo({ code, discount: Math.round(subtotal * 0.1) });
      toast({ title: t('promoApplied'), description: t('promoApplied10'), variant: 'success' });
    } else if (code === 'FREESHIP') {
      setAppliedPromo({ code, discount: shipping });
      toast({ title: t('promoFreeShip'), variant: 'success' });
    } else {
      toast({ title: t('promoInvalid'), variant: 'destructive' });
    }
  };

  if (!mounted) {
    return <div className="h-96" aria-hidden />;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <h1 className="mb-6 text-3xl font-bold">{t('title')}</h1>
        <EmptyState
          icon={ShoppingBag}
          title={t('empty')}
          description={t('emptyHint')}
          action={
            <Button asChild size="lg">
              <Link href="/catalog">{t('openCatalog')}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('itemSummary', {
              items: items.length,
              pieces: items.reduce((s, i) => s + i.quantity, 0),
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            clear();
            toast({ title: t('cleared'), duration: 1500 });
          }}
          className="text-muted-foreground text-sm hover:text-red-600"
        >
          {t('clearAll')}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          {items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              onRemove={() => {
                removeItem(item.id);
                toast({ title: t('itemRemoved'), description: item.name, duration: 1500 });
              }}
              onQty={(q) => updateQuantity(item.id, q)}
            />
          ))}
        </ul>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="bg-card space-y-4 rounded-xl border p-5">
            <div className="text-base font-semibold">{t('summary')}</div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('subtotal')}</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('shipping')}</span>
                <span className={shipping === 0 ? 'font-medium text-emerald-700' : ''}>
                  {shipping === 0 ? t('shippingFree') : formatMoney(shipping)}
                </span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between text-emerald-700">
                  <span>
                    {t('promoCode')}: {appliedPromo.code}
                  </span>
                  <span>−{formatMoney(appliedPromo.discount)}</span>
                </div>
              )}
              {subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD && (
                <div className="rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  <Truck size={12} className="mr-1 inline" />
                  {t('freeShipHint', { amount: formatMoney(FREE_SHIPPING_THRESHOLD - subtotal) })}
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>{t('total')}</span>
                <span>{formatMoney(total)}</span>
              </div>
            </div>

            <div className="bg-background rounded-md border p-3">
              <div className="text-muted-foreground mb-2 flex items-center gap-1 text-xs font-medium">
                <Tag size={12} /> {t('promoCode')}
              </div>
              <div className="flex gap-2">
                <Input
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  placeholder="WELCOME10"
                  className="h-9 flex-1 uppercase"
                />
                <Button size="sm" variant="outline" onClick={applyPromo}>
                  {t('promoApply')}
                </Button>
              </div>
              {appliedPromo && (
                <button
                  type="button"
                  onClick={() => {
                    setAppliedPromo(null);
                    setPromo('');
                  }}
                  className="text-muted-foreground mt-1 text-[11px] hover:text-red-600"
                >
                  {t('promoCancel')}
                </button>
              )}
            </div>

            <Button asChild size="lg" className="w-full rounded-full">
              <Link href="/checkout">
                {t('checkout')} <ArrowRight size={16} className="ml-1" />
              </Link>
            </Button>

            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <ShieldCheck size={14} className="text-emerald-600" />
              {t('secure')}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CartItemRow({
  item,
  onRemove,
  onQty,
}: {
  item: CartItem;
  onRemove: () => void;
  onQty: (q: number) => void;
}) {
  const t = useTranslations('cart');
  return (
    <li className="bg-card flex gap-4 rounded-xl border p-4">
      <Link
        href={`/product/${item.slug}`}
        className="bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded-md sm:h-28 sm:w-28"
      >
        <Image
          src={productImage(item.imageSeed, 200)}
          alt={item.name}
          fill
          sizes="120px"
          className="object-cover"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">
              {item.brand}
            </div>
            <Link
              href={`/product/${item.slug}`}
              className="hover:text-primary line-clamp-2 text-sm font-medium"
            >
              {item.name}
            </Link>
            {(item.color || item.size) && (
              <div className="text-muted-foreground mt-0.5 text-xs">
                {item.color && (
                  <span>
                    {t('color')}: {item.color}
                  </span>
                )}
                {item.color && item.size && <span> · </span>}
                {item.size && (
                  <span>
                    {t('size')}: {item.size}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:bg-accent grid h-8 w-8 shrink-0 place-items-center rounded-md hover:text-red-600"
            aria-label={t('remove')}
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
          <div className="border-input flex h-9 items-center rounded-full border">
            <button
              type="button"
              onClick={() => onQty(Math.max(1, item.quantity - 1))}
              className="text-muted-foreground hover:text-foreground grid h-9 w-9 place-items-center"
              aria-label={t('decrease')}
            >
              <Minus size={14} />
            </button>
            <input
              type="number"
              value={item.quantity}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v >= 1) onQty(v);
              }}
              className="h-full w-10 bg-transparent text-center text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => onQty(item.quantity + 1)}
              className="text-muted-foreground hover:text-foreground grid h-9 w-9 place-items-center"
              aria-label={t('increase')}
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="text-right">
            {item.oldPrice && item.oldPrice > item.unitPrice && (
              <div className="text-muted-foreground text-xs line-through">
                {formatMoney(item.oldPrice * item.quantity)}
              </div>
            )}
            <div className="text-base font-bold">{formatMoney(item.unitPrice * item.quantity)}</div>
          </div>
        </div>
      </div>
    </li>
  );
}
