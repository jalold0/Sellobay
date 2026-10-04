import 'dart:async';

import 'package:flutter/widgets.dart';

import '../api/api_client.dart';
import '../api/sellobay_config.dart';
import '../addresses/address_repository.dart';
import '../auth/auth_controller.dart';
import '../auth/auth_repository.dart';
import '../auth/auth_scope.dart';
import '../cart/cart_repository.dart';
import '../cart/cart_scope.dart';
import '../cart/cart_store.dart';
import '../cart/cart_sync.dart';
import '../catalog/catalog_repository.dart';
import '../courier/courier_repository.dart';
import '../checkout/checkout_repository.dart';
import '../wishlist/wishlist_repository.dart';
import '../wishlist/wishlist_scope.dart';
import '../wishlist/wishlist_store.dart';
import '../i18n/locale_controller.dart';
import '../orders/orders_repository.dart';
import '../i18n/translations_scope.dart';

/// Ilovaning umri davomida yashaydigan obyektlar.
class SellobayRuntime {
  const SellobayRuntime({
    required this.api,
    required this.repository,
    required this.auth,
    required this.locale,
    required this.catalog,
    required this.cart,
    required this.cartSync,
    required this.checkout,
    required this.addresses,
    required this.orders,
    required this.wishlist,
    required this.courier,
    required this.config,
  });

  final ApiClient api;
  final AuthRepository repository;
  final AuthController auth;
  final LocaleController locale;
  final CatalogRepository catalog;
  final CartStore cart;
  final CartSync cartSync;
  final CheckoutRepository checkout;
  final AddressRepository addresses;
  final OrdersRepository orders;
  final WishlistStore wishlist;

  /// Kuryer ilovasi uchun. Mijoz ilovasida ishlatilmaydi.
  final CourierRepository courier;

  /// Biznes qoidalari (`GET /api/config`). Yuklangunga qadar `null` —
  /// u holda ekranlar yetkazish narxini KO'RSATMAYDI, taxmin qilmaydi.
  final ValueNotifier<SellobayConfig?> config;

  void dispose() {
    cartSync.dispose();
    auth.dispose();
    locale.dispose();
    cart.dispose();
    config.dispose();
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

  final catalog = CatalogRepository(api);
  final cart = CartStore();
  final config = ValueNotifier<SellobayConfig?>(null);

  await locale.load();
  // Savat mahalliy saqlovdan o'qiladi — birinchi kadrdan oldin tayyor
  // bo'lsin, aks holda savat belgisi bir lahza bo'sh ko'rinardi.
  await cart.load();

  unawaited(auth.restore());
  // Qoidalar tarmoqdan keladi; ilovani kutdirmaydi.
  unawaited(
    // Yuklanmasa ekranlar yetkazish narxini ko'rsatmaydi — o'zimiz
    // raqam o'ylab topmaymiz, shuning uchun xato jim yutiladi.
    api.fetchConfig().then<void>((value) => config.value = value).catchError((Object _) {}),
  );

  final cartSync = CartSync(
    auth: auth,
    cart: cart,
    repository: CartRepository(api),
    catalog: catalog,
  )..start();

  return SellobayRuntime(
    api: api,
    repository: repository,
    auth: auth,
    locale: locale,
    catalog: catalog,
    cart: cart,
    cartSync: cartSync,
    checkout: CheckoutRepository(api),
    addresses: AddressRepository(api),
    orders: OrdersRepository(api),
    wishlist: WishlistStore(repository: WishlistRepository(api), auth: auth),
    courier: CourierRepository(api),
    config: config,
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
            child: AuthScope(
              controller: widget.runtime.auth,
              child: CartScope(
              store: widget.runtime.cart,
              child: WishlistScope(store: widget.runtime.wishlist, child: widget.child),
            ),
            ),
          ),
        );
      },
    );
  }
}
