'use client';

import * as React from 'react';

import { useCart } from '../../store/cart';

// Hydration safety: SSR'da 0 ko'rsatamiz, mount'gacha localStorage o'qilmaydi.
export function CartBadge() {
  const [mounted, setMounted] = React.useState(false);
  const total = useCart((s) => s.totalQuantity());
  React.useEffect(() => setMounted(true), []);
  const count = mounted ? total : 0;
  if (count === 0) return null;
  return (
    <span className="bg-primary absolute -top-1.5 right-0 grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[10px] font-extrabold text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function WishlistBadge() {
  // Placeholder — kelajakda wishlist count ko'rsatish uchun
  return null;
}
