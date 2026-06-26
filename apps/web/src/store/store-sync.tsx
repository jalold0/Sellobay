'use client';

// Cart va Wishlist DB sinxronlash:
// - Mount paytida login bo'lsa, lokal Zustand state'ni server bilan birlashtiramiz
// - Keyin har bir lokal o'zgarish (debounced 800ms) → server'ga PUT
// - Logout'da sinxron to'xtaydi (lokal saqlanadi, server'ga yozilmaydi)

import * as React from 'react';

import { me } from '../lib/auth/client';
import { useCart, type CartItem } from './cart';
import { useWishlist } from './wishlist';

const DEBOUNCE_MS = 800;

interface CartItemPayload {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

interface ServerCartItem {
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: string;
}

async function syncWishlist(productIds: string[]): Promise<string[] | null> {
  try {
    const res = await fetch('/api/wishlist', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ productIds }),
    });
    const json = (await res.json()) as { success: boolean; data?: { productIds: string[] } };
    return json.success && json.data ? json.data.productIds : null;
  } catch {
    return null;
  }
}

async function syncCart(
  items: CartItemPayload[],
  strategy: 'merge' | 'replace' = 'replace',
): Promise<ServerCartItem[] | null> {
  try {
    const res = await fetch('/api/cart', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ items, strategy }),
    });
    const json = (await res.json()) as { success: boolean; data?: { items: ServerCartItem[] } };
    return json.success && json.data ? json.data.items : null;
  } catch {
    return null;
  }
}

// Mahalliy cart item'ni server payload'ga o'tkazish
function toCartPayload(items: CartItem[]): CartItemPayload[] {
  // UUID validation (faqat real productId'lar serverga yuboriladi, mock'lar emas)
  const uuidRe = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  return items
    .filter((it) => uuidRe.test(it.productId))
    .map((it) => ({
      productId: it.productId,
      variantId: it.variantId ?? null,
      quantity: it.quantity,
    }));
}

export function StoreSync() {
  const [authed, setAuthed] = React.useState<boolean | null>(null);
  const cartItems = useCart((s) => s.items);
  const wishlistIds = useWishlist((s) => s.ids);
  const initialMergeDone = React.useRef(false);

  // 1. Mount: auth holatini tekshirish va dastlabki sync
  React.useEffect(() => {
    let cancelled = false;
    me().then(async (res) => {
      if (cancelled) return;
      const ok = res.success;
      setAuthed(ok);
      if (!ok) return;

      // INITIAL MERGE: lokal + server birlashadi
      const localWishlist = useWishlist.getState().ids;
      const merged = await syncWishlist(localWishlist);
      if (merged && !cancelled) {
        // Lokal state'ni server natijasiga moslaymiz
        useWishlist.setState({ ids: merged });
      }

      const localCart = toCartPayload(useCart.getState().items);
      const serverCart = await syncCart(localCart, 'merge');
      if (serverCart && !cancelled) {
        // Server qaytarganidan local cart'ni qayta tuzamiz (UUID + qty)
        // Eslatma: bizning CartItem ko'p meta-data saqlaydi (name, brand, image) —
        // server faqat ID + qty bilan keladi. Shuning uchun MAHALLIY itemlarni
        // saqlab, faqat qty'ni server qiymatiga moslaymiz (yoki yetishmayotgan itemni qoldiramiz).
        const serverMap = new Map(
          serverCart.map((s) => [`${s.productId}|${s.variantId ?? ''}`, s.quantity]),
        );
        useCart.setState({
          items: useCart.getState().items.map((it) => {
            const key = `${it.productId}|${it.variantId ?? ''}`;
            const serverQty = serverMap.get(key);
            if (serverQty == null) return it;
            return { ...it, quantity: serverQty };
          }),
        });
      }
      initialMergeDone.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Wishlist o'zgarganda debounced PUT
  React.useEffect(() => {
    if (!authed || !initialMergeDone.current) return;
    const t = setTimeout(() => {
      void syncWishlist(wishlistIds);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [wishlistIds, authed]);

  // 3. Cart o'zgarganda debounced PUT
  React.useEffect(() => {
    if (!authed || !initialMergeDone.current) return;
    const t = setTimeout(() => {
      void syncCart(toCartPayload(cartItems), 'replace');
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [cartItems, authed]);

  return null;
}
