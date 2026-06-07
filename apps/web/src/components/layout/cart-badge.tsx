'use client';

import * as React from 'react';

import { useCart } from '../../store/cart';

// Hydration safety: SSR'da 0 ko'rsatamiz, mount'gacha localStorage o'qilmaydi.
export function CartBadge() {
  const [mounted, setMounted] = React.useState(false);
  const total = useCart((s) => s.totalQuantity());
  React.useEffect(() => setMounted(true), []);
  const count = mounted ? total : 0;
  if (count === 0) {
    return (
      <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-muted px-1 text-[10px] font-bold text-muted-foreground">
        0
      </span>
    );
  }
  return (
    <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function WishlistBadge() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  // Wishlist count uchun ham — keyin kerak bo'lganda yana shu pattern
  return null;
}
