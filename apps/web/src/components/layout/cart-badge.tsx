'use client';

import * as React from 'react';

import { useCart } from '../../store/cart';
import { useWishlist } from '../../store/wishlist';

// Hydration safety: SSR'da 0 ko'rsatamiz, mount'gacha localStorage o'qilmaydi.
function useClientCount(value: number): number {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted ? value : 0;
}

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="bg-primary absolute -top-1.5 right-0 grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[10px] font-extrabold text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function CartBadge() {
  return <Badge count={useClientCount(useCart((s) => s.totalQuantity()))} />;
}

// Sevimlilar hisoblagichi. Ilgari bu `return null` edi — savatda son ko'rinib,
// sevimlilarda ko'rinmasligi ikkita bir xil ikonkani bir xil bo'lmagan holatga
// solib qo'yardi: foydalanuvchi nimadir saqlaganini eslay olmasdi.
export function WishlistBadge() {
  return <Badge count={useClientCount(useWishlist((s) => s.ids.length))} />;
}
