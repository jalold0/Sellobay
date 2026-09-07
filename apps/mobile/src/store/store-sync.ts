// Savat va sevimlilarni server bilan sinxronlash (mobil).
//
// - Kirilgan bo'lsa, bir marta lokal + server BIRLASHTIRILADI
// - Keyin har bir lokal o'zgarish debounced holda serverga yoziladi
// - Chiqilgach sinxron to'xtaydi (lokal saqlanadi, serverga yozilmaydi)
//
// Web'da bu `store/store-sync.tsx` da bor edi, mobil esa endpoint'larni
// umuman chaqirmasdi — savat va sevimlilar boshqa qurilmada yo'q edi.

import { isUuid } from '@ecom/utils';
import * as React from 'react';

import {
  fetchProductsByIds,
  syncCartRemote,
  syncWishlistRemote,
  type CartItemPayload,
} from '../lib/api';
import { pickLocalized } from '../lib/format';
import { useCart, type CartItem } from './cart';
import { useLocale, type Locale } from './locale';
import { useSession } from './session';
import { useWishlist } from './wishlist';

const DEBOUNCE_MS = 800;

/**
 * Sinxron kaliti — mahsulot + variant.
 *
 * Savatning MAHALLIY kaliti bundan kengroq (rang va o'lchamni ham qo'shadi),
 * lekin server faqat mahsulot va variantni biladi. Shu sababli solishtirish
 * shu ikkisi bo'yicha ketadi.
 */
function keyOf(productId: string, variantId?: string | null): string {
  return `${productId}|${variantId ?? ''}`;
}

function toCartPayload(items: readonly CartItem[]): CartItemPayload[] {
  // Mock katalog id'lari ('g-...') serverga YUBORILMAYDI: `z.string().uuid()`
  // validatsiyasi bitta yaroqsiz element uchun BUTUN so'rovni rad etardi,
  // ya'ni haqiqiy elementlarning sinxroni ham buzilardi.
  return items
    .filter((it) => isUuid(it.productId))
    .map((it) => ({
      productId: it.productId,
      variantId: it.variantId ?? null,
      quantity: it.quantity,
    }));
}

async function mergeWishlist(): Promise<void> {
  const merged = await syncWishlistRemote(useWishlist.getState().ids);
  if (merged) useWishlist.setState({ ids: merged });
}

async function mergeCart(locale: Locale): Promise<void> {
  const local = useCart.getState().items;
  const server = await syncCartRemote(toCartPayload(local), 'merge');
  if (!server) return;

  const serverByKey = new Map(server.map((s) => [keyOf(s.productId, s.variantId), s]));

  // 1) Mavjud satrlarning sonini server bilan tenglashtiramiz.
  useCart.setState({
    items: useCart.getState().items.map((it) => {
      const match = serverByKey.get(keyOf(it.productId, it.variantId));
      return match ? { ...it, quantity: match.quantity } : it;
    }),
  });

  // 2) FAQAT serverda bor satrlar — boshqa qurilmada qo'shilganlar.
  //
  // Bu qadam shart. Server javobida faqat id va son bo'ladi; nom, brend va
  // rasm telefonda yo'q, shu sababli mahsulotlarni id bo'yicha olib kelamiz.
  // Aks holda satr ro'yxatga TUSHMAYDI, keyingi 'replace' esa uni serverdan
  // ham O'CHIRIB tashlaydi — ya'ni boshqa qurilmadagi savat yo'qoladi.
  const localKeys = new Set(local.map((it) => keyOf(it.productId, it.variantId)));
  const missing = server.filter((s) => !localKeys.has(keyOf(s.productId, s.variantId)));
  if (missing.length === 0) return;

  const products = await fetchProductsByIds(missing.map((m) => m.productId));
  const byId = new Map(products.map((p) => [p.id, p]));
  const addItem = useCart.getState().addItem;

  for (const item of missing) {
    const product = byId.get(item.productId);
    // Mahsulot o'chirilgan yoki sotuvdan olingan bo'lsa qo'shmaymiz.
    if (!product) continue;
    addItem({
      productId: product.id,
      variantId: item.variantId ?? undefined,
      name: pickLocalized(product.name, locale),
      brand: product.brand,
      slug: product.slug,
      imageSeed: product.imageSeed,
      imageUrl: product.imageUrl,
      // Narx serverdagi snapshot — mijoz qo'shgan paytdagi narx.
      unitPrice: Number(item.unitPrice) || product.price,
      oldPrice: product.oldPrice,
      currency: product.currency,
      quantity: item.quantity,
      // Rang/o'lcham yorliqlari server javobida yo'q (u faqat variantId ni
      // biladi), shu sababli tiklangan satrda ular ko'rsatilmaydi.
      // Mahsulot sahifasidan qayta qo'shilsa alohida satr bo'lishi mumkin.
    });
  }
}

/**
 * Root layout'da bir marta chaqiriladi.
 */
export function useStoreSync(): void {
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  const sessionLoading = useSession((s) => s.loading);
  const locale = useLocale((s) => s.locale);
  const cartItems = useCart((s) => s.items);
  const wishlistIds = useWishlist((s) => s.ids);

  // Birlashtirish har kirishda BIR MARTA. Chiqilganda qayta ochiladi, aks
  // holda boshqa hisob bilan kirilganda birlashtirish o'tkazib yuborilardi.
  const mergeDone = React.useRef(false);

  React.useEffect(() => {
    if (!isAuthenticated) {
      mergeDone.current = false;
      return;
    }
    // Sessiya secureStore'dan hali o'qilmagan bo'lsa kutamiz.
    if (sessionLoading || mergeDone.current) return;

    let cancelled = false;
    void (async () => {
      await mergeWishlist();
      if (cancelled) return;
      await mergeCart(locale);
      if (!cancelled) mergeDone.current = true;
    })();

    return () => {
      cancelled = true;
    };
    // `locale` ataylab bog'liqlikda emas: til almashtirilganda savatni qayta
    // birlashtirish kerak emas, u faqat yangi satr nomini tanlash uchun.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, sessionLoading]);

  React.useEffect(() => {
    if (!isAuthenticated || !mergeDone.current) return;
    const timer = setTimeout(() => void syncWishlistRemote(wishlistIds), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [wishlistIds, isAuthenticated]);

  React.useEffect(() => {
    if (!isAuthenticated || !mergeDone.current) return;
    const timer = setTimeout(
      () => void syncCartRemote(toCartPayload(cartItems), 'replace'),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [cartItems, isAuthenticated]);
}
