'use client';

// Sticky add-to-cart bar — asosiy CTA ekrandan chiqsa pastda paydo bo'ladi.
import { Button } from '@ecom/ui';
import { ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { formatMoney } from '../../lib/format';

interface Props {
  show: boolean;
  name: string;
  imageSrc: string;
  price: number;
  oldPrice?: number;
  inStock: boolean;
  onAdd: () => void;
}

export function StickyCartBar({ show, name, imageSrc, price, oldPrice, inStock, onAdd }: Props) {
  const t = useTranslations('product');

  // Ko'ringanda balandligini global CSS-var'ga yozamiz — boshqa pastki fixed
  // elementlar (ScrollToTop tugmasi) shuning ustiga chiqib, ustma-ust tushmasin.
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--sticky-cta-h', show ? '4.5rem' : '0px');
    return () => {
      root.style.setProperty('--sticky-cta-h', '0px');
    };
  }, [show]);

  return (
    <div
      className={`bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur transition-transform duration-300 ${
        show ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="container flex items-center gap-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <div className="relative hidden h-12 w-12 shrink-0 overflow-hidden rounded-lg border sm:block">
          <Image src={imageSrc} alt={name} fill sizes="48px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="line-clamp-1 text-sm font-medium">{name}</div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">{formatMoney(price)}</span>
            {oldPrice && (
              <span className="text-muted-foreground text-xs line-through">
                {formatMoney(oldPrice)}
              </span>
            )}
          </div>
        </div>
        <Button
          size="lg"
          className="h-11 shrink-0 rounded-full px-6 text-sm font-semibold"
          onClick={onAdd}
          disabled={!inStock}
        >
          <ShoppingCart size={16} className="mr-1.5" />
          {t('addToCart')}
        </Button>
      </div>
    </div>
  );
}
