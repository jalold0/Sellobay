import 'dart:async';

import 'package:flutter/foundation.dart';

import '../api/api_exception.dart';
import '../auth/auth_controller.dart';
import '../catalog/catalog_repository.dart';
import 'cart_line.dart';
import 'cart_repository.dart';
import 'cart_store.dart';

/// Mahalliy savatni server bilan sinxronlaydi.
///
/// Tartib:
///   1. Tizimga kirilganda BIR MARTA `merge` — mahalliy va serverdagi
///      sonlar qo'shiladi, keyin faqat serverda bor satrlar tiklanadi.
///   2. Keyingi har bir o'zgarishda debounced `replace`.
///   3. Chiqilganda sinxron to'xtaydi; savat telefonda qoladi.
class CartSync {
  CartSync({
    required this.auth,
    required this.cart,
    required this.repository,
    required this.catalog,
    this.debounce = const Duration(milliseconds: 800),
  });

  final AuthController auth;
  final CartStore cart;
  final CartRepository repository;
  final CatalogRepository catalog;
  final Duration debounce;

  Timer? _timer;
  bool _mergeDone = false;
  bool _applyingRemote = false;

  /// Oxirgi sinxron xatosi — ekran xohlasa ko'rsatadi.
  Object? lastError;

  void start() {
    auth.addListener(_onAuthChanged);
    cart.addListener(_onCartChanged);
    _onAuthChanged();
  }

  void dispose() {
    _timer?.cancel();
    auth.removeListener(_onAuthChanged);
    cart.removeListener(_onCartChanged);
  }

  void _onAuthChanged() {
    if (!auth.isSignedIn) {
      // Chiqilganda birlashtirish bayrog'i tushadi: boshqa hisob bilan
      // kirilganda birlashtirish qaytadan bajarilishi kerak.
      _mergeDone = false;
      _timer?.cancel();
      return;
    }
    if (_mergeDone) return;
    _mergeDone = true;
    unawaited(_merge());
  }

  void _onCartChanged() {
    // Sinxronning O'ZI savatni o'zgartirganda qayta yozishga urinmaymiz.
    if (_applyingRemote) return;
    if (!auth.isSignedIn || !_mergeDone) return;
    _timer?.cancel();
    _timer = Timer(debounce, () => unawaited(_push()));
  }

  /// Kirishdagi birlashtirish.
  Future<void> _merge() async {
    try {
      final server = await repository.sync(cart.lines, strategy: CartSyncStrategy.merge);
      await _adopt(server);
      lastError = null;
    } on ApiException catch (e) {
      // 401 bo'lsa `AuthController` o'zi chiqarib yuboradi.
      lastError = e;
      _mergeDone = false;
    } on NetworkException catch (e) {
      // Internet yo'q — savat mahalliy qoladi, keyingi kirishda yana
      // urinib ko'riladi.
      lastError = e;
      _mergeDone = false;
    }
  }

  /// Serverdagi holatni mahalliy savatga ko'chiradi.
  ///
  /// IKKI qadam, va ikkinchisi SHART:
  ///   1. mavjud satrlarning soni server bilan tenglashtiriladi;
  ///   2. FAQAT serverda bor satrlar (boshqa qurilmada qo'shilganlar)
  ///      katalogdan to'ldirilib qo'shiladi.
  ///
  /// Ikkinchisiz o'sha satrlar ro'yxatga tushmaydi, keyingi `replace`
  /// esa ularni serverdan ham O'CHIRIB tashlaydi — boshqa qurilmadagi
  /// savat yo'qoladi.
  Future<void> _adopt(List<ServerCartItem> server) async {
    final serverByKey = {for (final item in server) item.key: item};
    final updated = <CartLine>[];

    for (final line in cart.lines) {
      final match = serverByKey[line.key];
      // Serverda yo'q satr — boshqa qurilmada o'chirilgan. Uni ham
      // o'chiramiz: aks holda `replace` bilan qaytib tiklanardi.
      if (match == null) continue;
      updated.add(line.copyWith(quantity: match.quantity));
    }

    final localKeys = cart.lines.map((l) => l.key).toSet();
    final missing = server.where((s) => !localKeys.contains(s.key)).toList();

    if (missing.isNotEmpty) {
      final products = await catalog.fetchProductsByIds(
        missing.map((m) => m.productId).toList(),
      );
      final byId = {for (final p in products) p.id: p};
      for (final item in missing) {
        final product = byId[item.productId];
        // Mahsulot o'chirilgan yoki sotuvdan olingan — qo'shmaymiz.
        if (product == null) continue;
        updated.add(
          CartLine.fromProduct(
            product,
            variantId: item.variantId,
            // Narx serverdagi snapshot — qo'shilgan paytdagi narx.
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            // Rang/o'lcham server javobida YO'Q (u faqat `variantId` ni
            // biladi), shuning uchun tiklangan satrda ko'rsatilmaydi.
          ),
        );
      }
    }

    _applyingRemote = true;
    cart.replaceAll(updated);
    _applyingRemote = false;
  }

  Future<void> _push() async {
    try {
      await repository.sync(cart.lines, strategy: CartSyncStrategy.replace);
      lastError = null;
    } on ApiException catch (e) {
      lastError = e;
    } on NetworkException catch (e) {
      lastError = e;
    }
  }

  /// Testlar uchun: kutilayotgan debounce'ni darhol bajaradi.
  @visibleForTesting
  Future<void> flushPending() async {
    if (_timer?.isActive != true) return;
    _timer!.cancel();
    await _push();
  }
}
