'use client';

// Bitta klient komponent — Zustand persist storelarni rehydrate qiladi.
// `apps/web/src/app/[locale]/layout.tsx` ichida bir marta render qilinadi.

import * as React from 'react';

import { useCart } from './cart';
import { useWishlist } from './wishlist';

export function StoreHydrator() {
  React.useEffect(() => {
    void useCart.persist.rehydrate();
    void useWishlist.persist.rehydrate();
  }, []);
  return null;
}
