'use client';

// Cart va Wishlist DB sinxronlash:
// - Mount paytida login bo'lsa, lokal Zustand state'ni server bilan birlashtiramiz
// - Keyin har bir lokal o'zgarish (debounced 800ms) → server'ga PUT
// - Logout'da sinxron to'xtaydi (lokal saqlanadi, server'ga yozilmaydi)

import { pickLocalized } from '@ecom/i18n';
import { isUuid } from '@ecom/utils';
import { useLocale } from 'next-intl';
import * as React from 'react';

import { fetchProductsByIds } from '../lib/api-products';
import { me } from '../lib/auth/client';
import { type Locale } from '../lib/mock-data';
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

// Mahalliy cart item'ni server payload'ga o'tkazish.
// Faqat haqiqiy UUID'lar ketadi: mock katalog id'si bo'lsa server
// `z.string().uuid()` bilan BUTUN so'rovni rad etardi.
function toCartPayload(items: CartItem[]): CartItemPayload[] {
  return items
    .filter((it) => isUuid(it.productId))
    .map((it) => ({
      productId: it.productId,
      variantId: it.variantId ?? null,
      quantity: it.quantity,
    }));
}

/** Sinxron kaliti — server faqat mahsulot va variantni biladi. */
function keyOf(productId: string, variantId?: string | null): string {
  return `${productId}|${variantId ?? ''}`;
}

export function StoreSync() {
  const locale = useLocale() as Locale;
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

      const localItems = useCart.getState().items;
      const serverCart = await syncCart(toCartPayload(localItems), 'merge');
      if (serverCart && !cancelled) {
        const serverMap = new Map(serverCart.map((s) => [keyOf(s.productId, s.variantId), s]));

        // 1) Mavjud satrlarning sonini server bilan tenglashtiramiz.
        //    CartItem ko'p meta-ma'lumot saqlaydi (nom, brend, rasm), server
        //    esa faqat id va son beradi — shu sababli satrning o'zi saqlanadi.
        useCart.setState({
          items: useCart.getState().items.map((it) => {
            const match = serverMap.get(keyOf(it.productId, it.variantId));
            return match ? { ...it, quantity: match.quantity } : it;
          }),
        });

        // 2) FAQAT serverda bor satrlar — boshqa qurilmada qo'shilganlar.
        //
        // Bu qadam shart edi va yo'q edi. Ilgari bunday satr ro'yxatga
        // TUSHMASDAN qolardi, keyingi o'zgarishdagi 'replace' esa uni
        // serverdan ham O'CHIRIB tashlardi — ya'ni telefonda qo'shilgan
        // tovar kompyuterga kirilgach yo'qolardi. Meta-ma'lumot uchun
        // mahsulotlarni id bo'yicha olib kelamiz.
        const localKeys = new Set(localItems.map((it) => keyOf(it.productId, it.variantId)));
        const missing = serverCart.filter(
          (sc) => !localKeys.has(keyOf(sc.productId, sc.variantId)),
        );

        if (missing.length > 0) {
          const products = await fetchProductsByIds(missing.map((m) => m.productId));
          const byId = new Map(products.map((pr) => [pr.id, pr]));
          const addItem = useCart.getState().addItem;

          for (const item of missing) {
            const product = byId.get(item.productId);
            // Mahsulot o'chirilgan yoki sotuvdan olingan bo'lsa qo'shmaymiz.
            if (!product || cancelled) continue;
            addItem({
              productId: product.id,
              variantId: item.variantId ?? undefined,
              name: pickLocalized(product.name, locale),
              brand: product.brand,
              slug: product.slug,
              imageSeed: product.imageSeed,
              imageUrl: product.imageUrl,
              // Narx — serverdagi snapshot (qo'shilgan paytdagi narx).
              unitPrice: Number(item.unitPrice) || product.price,
              oldPrice: product.oldPrice,
              currency: product.currency,
              quantity: item.quantity,
              // Rang/o'lcham yorliqlari server javobida yo'q (u faqat
              // variantId ni biladi) — tiklangan satrda ko'rsatilmaydi.
            });
          }
        }
      }
      initialMergeDone.current = true;
    });
    return () => {
      cancelled = true;
    };
    // `locale` ataylab bog'liqlikda emas — u faqat tiklangan satr nomini
    // tanlash uchun, til almashtirilganda qayta birlashtirish kerak emas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
