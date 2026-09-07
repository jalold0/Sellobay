// Savat va sevimlilarni server bilan sinxronlash.
//
// Server tomoni allaqachon qurilgan edi — `/api/cart` PUT hatto
// merge/replace strategiyalari bilan, izohida "debounced lokal → server"
// deb yozilgan. Web `store/store-sync.tsx` da shu naqshni ishlatadi,
// mobil esa endpoint'larni UMUMAN chaqirmasdi: savat va sevimlilar faqat
// telefonda qolardi va boshqa qurilmada yo'q edi.

import { authedJson } from './core';

export interface CartItemPayload {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface ServerCartItem {
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: string;
}

/** Sevimlilarni to'liq almashtiradi; server yakuniy ro'yxatni qaytaradi. */
export async function syncWishlistRemote(productIds: string[]): Promise<string[] | null> {
  const data = await authedJson<{ productIds: string[] }>('/api/wishlist', {
    method: 'PUT',
    body: { productIds },
  });
  return data?.productIds ?? null;
}

/**
 * Savatni sinxronlaydi.
 *
 * `merge` — lokal va serverdagi sonlar qo'shiladi (kirishdagi birlashtirish).
 * `replace` — server lokalning nusxasiga aylanadi (keyingi o'zgarishlar).
 */
export async function syncCartRemote(
  items: CartItemPayload[],
  strategy: 'merge' | 'replace' = 'replace',
): Promise<ServerCartItem[] | null> {
  const data = await authedJson<{ items: ServerCartItem[] }>('/api/cart', {
    method: 'PUT',
    body: { items, strategy },
  });
  return data?.items ?? null;
}
