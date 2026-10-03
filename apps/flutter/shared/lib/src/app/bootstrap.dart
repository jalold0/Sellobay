import 'dart:async';

import 'package:flutter/widgets.dart';

import '../api/api_client.dart';
import '../auth/auth_controller.dart';
import '../auth/auth_repository.dart';
import '../auth/auth_scope.dart';
import '../catalog/catalog_repository.dart';
import '../i18n/locale_controller.dart';
import '../i18n/translations_scope.dart';

/// Ilovaning umri davomida yashaydigan obyektlar.
class SellobayRuntime {
  const SellobayRuntime({
    required this.api,
    required this.repository,
    required this.auth,
    required this.locale,
    required this.catalog,
  });

  final ApiClient api;
  final AuthRepository repository;
  final AuthController auth;
  final LocaleController locale;
  final CatalogRepository catalog;

  void dispose() {
    auth.dispose();
    locale.dispose();
  }
}

/// `runApp` dan OLDIN chaqiriladi.
///
/// Tarjimalar kutiladi (asset'dan o'qish — millisekundlar, bu paytda
/// tizim splash ekrani ko'rinib turadi), sessiyani tiklash esa KUTILMAYDI:
/// u tarmoqqa chiqadi va ilovani sekundlab ushlab turishi mumkin edi.
/// Tiklangunga qadar holat [AuthStatus.unknown] bo'ladi.
Future<SellobayRuntime> bootstrapSellobay({String? requiredRole}) async {
  final api = ApiClient();
  final repository = AuthRepository(api);
  final auth = AuthController(repository: repository, requiredRole: requiredRole);
  final locale = LocaleController();

  await locale.load();
  unawaited(auth.restore());

  return SellobayRuntime(
    api: api,
    repository: repository,
    auth: auth,
    locale: locale,
    catalog: CatalogRepository(api),
  );
}

/// Ishga tushirilgan obyektlarni ekranlarga uzatadi.
///
/// `AuthScope` faqat auth HOLATINI beradi; `AuthRepository` (OTP yuborish
/// kabi holatsiz chaqiruvlar) va `LocaleController` shu yerdan olinadi.
class SellobayRuntimeScope extends InheritedWidget {
  const SellobayRuntimeScope({super.key, required this.runtime, required super.child});

  final SellobayRuntime runtime;

  static SellobayRuntime of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<SellobayRuntimeScope>();
    assert(scope != null, 'SellobayRuntimeScope topilmadi — SellobayScope ichida bo`lishi kerak.');
    return scope!.runtime;
  }

  @override
  bool updateShouldNotify(SellobayRuntimeScope oldWidget) => oldWidget.runtime != runtime;
}

/// `AuthScope` + `TranslationsScope` ni bitta joyda o'rnatadi va tilni
/// foydalanuvchi profiliga moslab turadi.
class SellobayScope extends StatefulWidget {
  const SellobayScope({super.key, required this.runtime, required this.child});

  final SellobayRuntime runtime;
  final Widget child;

  @override
  State<SellobayScope> createState() => _SellobayScopeState();
}

class _SellobayScopeState extends State<SellobayScope> {
  @override
  void initState() {
    super.initState();
    widget.runtime.auth.addListener(_followUserLocale);
  }

  @override
  void dispose() {
    widget.runtime.auth.removeListener(_followUserLocale);
    super.dispose();
  }

  /// Tizimga kirgan foydalanuvchining tili qurilma tilidan ustun turadi.
  ///
  /// Sabab: til web profilida tanlanadi va serverda saqlanadi. Mobilda
  /// ikkinchi, mustaqil tanlov yaratsak, ikki klient turli tilda
  /// gapiradigan bo'lardi.
  void _followUserLocale() {
    final userLocale = widget.runtime.auth.user?.locale;
    if (userLocale == null) return;
    if (LocaleController.resolve(userLocale) == widget.runtime.locale.locale) return;
    unawaited(widget.runtime.locale.setLocale(userLocale));
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.runtime.locale,
      builder: (context, _) {
        final translations = widget.runtime.locale.translations;
        // `bootstrapSellobay` tarjimalarni kutgani uchun bu yerda null
        // bo'lmaydi; himoya sifatida bo'sh joy qaytaramiz.
        if (translations == null) return const SizedBox.shrink();
        return SellobayRuntimeScope(
          runtime: widget.runtime,
          child: TranslationsScope(
            translations: translations,
            child: AuthScope(controller: widget.runtime.auth, child: widget.child),
          ),
        );
      },
    );
  }
}
