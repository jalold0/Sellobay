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
import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';

import { formatMoney } from '../../lib/format';
import { productImage } from '../../lib/mock-data';
import { useCart, type CartItem } from '../../store/cart';

const FREE_SHIPPING_THRESHOLD = 500_000;
const SHIPPING_FEE = 20_000;

export function CartView() {
  const items = useCart((s) => s.items);
  const removeItem = useCart((s) => s.removeItem);
  const updateQuantity = useCart((s) => s.updateQuantity);
  const clear = useCart((s) => s.clear);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const [promo, setPromo] = React.useState('');
  const [appliedPromo, setAppliedPromo] = React.useState<{ code: string; discount: number } | null>(null);

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discount = appliedPromo?.discount ?? 0;
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE;
  const total = Math.max(0, subtotal - discount + shipping);

  const applyPromo = () => {
    const code = promo.trim().toUpperCase();
    if (!code) return;
    // Mock: WELCOME10 → 10%, FREESHIP — yetkazib berish bekor
    if (code === 'WELCOME10') {
      setAppliedPromo({ code, discount: Math.round(subtotal * 0.1) });
      toast({ title: 'Promo-kod qo`llanildi', description: '10% chegirma', variant: 'success' });
    } else if (code === 'FREESHIP') {
      setAppliedPromo({ code, discount: shipping });
      toast({ title: 'Tekin yetkazib berish', variant: 'success' });
    } else {
      toast({ title: 'Noto`g`ri promo-kod', variant: 'destructive' });
    }
  };

  if (!mounted) {
    return <div className="h-96" aria-hidden />;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <h1 className="mb-6 text-3xl font-bold">Savatcha</h1>
        <EmptyState
          icon={ShoppingBag}
          title="Savatcha bo`sh"
          description="Mahsulotlarni katalogdan tanlab, savatga qo`shing"
          action={
            <Button asChild size="lg">
              <Link href="/catalog">Katalogni ochish</Link>
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
          <h1 className="text-3xl font-bold tracking-tight">Savatcha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} ta mahsulot · jami {items.reduce((s, i) => s + i.quantity, 0)} dona
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            clear();
            toast({ title: 'Savatcha tozalandi', duration: 1500 });
          }}
          className="text-sm text-muted-foreground hover:text-red-600"
        >
          Hammasini tozalash
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
                toast({ title: 'O`chirildi', description: item.name, duration: 1500 });
              }}
              onQty={(q) => updateQuantity(item.id, q)}
            />
          ))}
        </ul>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div className="text-base font-semibold">Buyurtma xulosasi</div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mahsulotlar</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Yetkazib berish</span>
                <span className={shipping === 0 ? 'font-medium text-emerald-700' : ''}>
                  {shipping === 0 ? 'Tekin' : formatMoney(shipping)}
                </span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between text-emerald-700">
                  <span>Promo: {appliedPromo.code}</span>
                  <span>−{formatMoney(appliedPromo.discount)}</span>
                </div>
              )}
              {subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD && (
                <div className="rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  <Truck size={12} className="mr-1 inline" />
                  Yana{' '}
                  <strong>{formatMoney(FREE_SHIPPING_THRESHOLD - subtotal)}</strong>{' '}
                  qo&apos;shing — tekin yetkazib berish!
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Jami</span>
                <span>{formatMoney(total)}</span>
              </div>
            </div>

            {/* Promo */}
            <div className="rounded-md border bg-background p-3">
              <div className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Tag size={12} /> Promo-kod
              </div>
              <div className="flex gap-2">
                <Input
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  placeholder="WELCOME10"
                  className="h-9 flex-1 uppercase"
                />
                <Button size="sm" variant="outline" onClick={applyPromo}>
                  Qo&apos;llash
                </Button>
              </div>
              {appliedPromo && (
                <button
                  type="button"
                  onClick={() => {
                    setAppliedPromo(null);
                    setPromo('');
                  }}
                  className="mt-1 text-[11px] text-muted-foreground hover:text-red-600"
                >
                  Bekor qilish
                </button>
              )}
            </div>

            <Button asChild size="lg" className="w-full rounded-full">
              <Link href="/checkout">
                Buyurtmani rasmiylashtirish <ArrowRight size={16} className="ml-1" />
              </Link>
            </Button>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck size={14} className="text-emerald-600" />
              Sizning ma&apos;lumotlaringiz xavfsiz himoyalangan
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
  return (
    <li className="flex gap-4 rounded-xl border bg-card p-4">
      <Link
        href={`/product/${item.slug}`}
        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted sm:h-28 sm:w-28"
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
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{item.brand}</div>
            <Link
              href={`/product/${item.slug}`}
              className="line-clamp-2 text-sm font-medium hover:text-primary"
            >
              {item.name}
            </Link>
            {(item.color || item.size) && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                {item.color && <span>Rang: {item.color}</span>}
                {item.color && item.size && <span> · </span>}
                {item.size && <span>O&apos;lcham: {item.size}</span>}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-red-600"
            aria-label="O`chirish"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
          <div className="flex h-9 items-center rounded-full border border-input">
            <button
              type="button"
              onClick={() => onQty(Math.max(1, item.quantity - 1))}
              className="grid h-9 w-9 place-items-center text-muted-foreground hover:text-foreground"
              aria-label="Kamaytirish"
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
              className="grid h-9 w-9 place-items-center text-muted-foreground hover:text-foreground"
              aria-label="Oshirish"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="text-right">
            {item.oldPrice && item.oldPrice > item.unitPrice && (
              <div className="text-xs text-muted-foreground line-through">
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
