import 'package:flutter/widgets.dart';

import 'cart_store.dart';

/// Savatni daraxtga uzatadi.
///
/// `InheritedNotifier` — savat o'zgarsa, unga bog'langan vidjetlar
/// (belgidagi son, savat ekrani) o'zi qayta quriladi.
class CartScope extends InheritedNotifier<CartStore> {
  const CartScope({super.key, required CartStore store, required super.child})
      : super(notifier: store);

  static CartStore of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<CartScope>();
    assert(scope != null, 'CartScope topilmadi — ilova ildiziga qo`ying.');
    return scope!.notifier!;
  }

  /// Qayta qurilishga OBUNA BO'LMAY olish — hodisa ishlovchilari uchun.
  static CartStore read(BuildContext context) {
    final scope = context.getInheritedWidgetOfExactType<CartScope>();
    assert(scope != null, 'CartScope topilmadi — ilova ildiziga qo`ying.');
    return scope!.notifier!;
  }
}
