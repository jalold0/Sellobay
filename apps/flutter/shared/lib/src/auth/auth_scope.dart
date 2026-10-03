import 'package:flutter/widgets.dart';

import 'auth_controller.dart';

/// [AuthController] ni daraxtga uzatadi.
///
/// `InheritedNotifier` — controller `notifyListeners()` chaqirsa, unga
/// bog'langan vidjetlar o'zi qayta quriladi. Shu sababli alohida holat
/// boshqaruvi paketi kerak emas.
class AuthScope extends InheritedNotifier<AuthController> {
  const AuthScope({super.key, required AuthController controller, required super.child})
      : super(notifier: controller);

  static AuthController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AuthScope>();
    assert(scope != null, 'AuthScope topilmadi — ilova ildiziga qo`ying.');
    return scope!.notifier!;
  }

  /// Qayta qurilishga OBUNA BO'LMAY olish — hodisa ishlovchilari uchun
  /// (`onPressed` ichida `read(context).signOut()`).
  static AuthController read(BuildContext context) {
    final scope = context.getInheritedWidgetOfExactType<AuthScope>();
    assert(scope != null, 'AuthScope topilmadi — ilova ildiziga qo`ying.');
    return scope!.notifier!;
  }
}
