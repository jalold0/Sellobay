import 'package:flutter/widgets.dart';

import 'wishlist_store.dart';

/// Sevimlilarni daraxtga uzatadi.
///
/// `InheritedNotifier` — ro'yxat o'zgarsa, yurakcha belgilari o'zi
/// qayta chiziladi.
class WishlistScope extends InheritedNotifier<WishlistStore> {
  const WishlistScope({super.key, required WishlistStore store, required super.child})
      : super(notifier: store);

  static WishlistStore of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<WishlistScope>();
    assert(scope != null, 'WishlistScope topilmadi — ilova ildiziga qo`ying.');
    return scope!.notifier!;
  }

  /// Qayta qurilishga OBUNA BO'LMAY olish — hodisa ishlovchilari uchun.
  static WishlistStore read(BuildContext context) {
    final scope = context.getInheritedWidgetOfExactType<WishlistScope>();
    assert(scope != null, 'WishlistScope topilmadi — ilova ildiziga qo`ying.');
    return scope!.notifier!;
  }
}
