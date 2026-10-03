import 'package:decimal/decimal.dart';

import '../api/sellobay_config.dart';
import 'cart_store.dart';

/// Savat xulosasi.
///
/// Hisob EKRANDA emas, shu yerda: pul bilan ishlash [Decimal] talab
/// qiladi va uni vidjetlar ichiga sochib yuborsak, qoida bir necha
/// joyda takrorlanadi.
///
/// MUHIM: bu faqat KO'RSATISH uchun. Yakuniy summa baribir serverda,
/// buyurtma yaratishda qayta hisoblanadi (`orders-server.ts`).
class CartTotals {
  const CartTotals({
    required this.subtotal,
    required this.shippingFee,
    required this.total,
    required this.amountToFreeShipping,
  });

  final Decimal subtotal;

  /// Yetkazish narxi. `null` — qoidalar (`/api/config`) hali kelmagan.
  /// Bunda ekran bu qatorni UMUMAN ko'rsatmasligi kerak: taxminiy raqam
  /// yozib qo'yish checkout'dagi haqiqiy summadan farq qilardi.
  final int? shippingFee;

  /// Yetkazish bilan jami. Qoidalar yo'q bo'lsa [subtotal] ga teng.
  final Decimal total;

  /// Bepul yetkazishga yetmayotgan summa. Yetgan bo'lsa yoki qoidalar
  /// yo'q bo'lsa — `null`.
  final Decimal? amountToFreeShipping;

  bool get isFreeShipping => shippingFee == 0;
}

CartTotals computeCartTotals(CartStore cart, SellobayConfig? rules) {
  final subtotal = cart.subtotal;
  if (rules == null) {
    return CartTotals(
      subtotal: subtotal,
      shippingFee: null,
      total: subtotal,
      amountToFreeShipping: null,
    );
  }

  // Qoida serverdan: `subtotal >= freeThreshold` bo'lsa bepul.
  // `toBigInt()` butun qismni oladi — so'm tiyinsiz hisoblanadi.
  final fee = rules.shippingFeeFor(subtotal.toBigInt().toInt());
  final threshold = Decimal.fromInt(rules.shipping.freeThreshold);

  return CartTotals(
    subtotal: subtotal,
    shippingFee: fee,
    total: subtotal + Decimal.fromInt(fee),
    amountToFreeShipping: subtotal >= threshold ? null : threshold - subtotal,
  );
}
