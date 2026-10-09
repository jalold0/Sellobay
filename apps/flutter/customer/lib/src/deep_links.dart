import 'dart:async';

import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'home_tabs.dart';
import 'screens/order_detail_screen.dart';

/// Buyurtmani ochishni so'raydigan manba: to'lovdan qaytish havolasi,
/// bosilgan push bildirishnoma.
///
/// Manba allaqachon tekshirilgan UUID beradi (`parseOrderLink`,
/// `orderIdFromPushData`) — marshrutizator xom matnga ishonmaydi.
abstract class OrderLinkSource {
  /// Ilova ochiq paytdagi va ishga tushgandagi so'rovlar.
  Stream<String> get orderIds;
}

/// Buyurtma so'rovlarini ekranga aylantiradi.
///
/// Kirmagan foydalanuvchiga hech narsa ochilmaydi: buyurtma ma'lumoti
/// sessiyasiz so'ralmaydi. Sovuq ishga tushishda sessiya hali o'qilayotgan
/// bo'lishi mumkin ([AuthStatus.unknown]) — shunda so'rov kutadi va
/// sessiya tiklanishi bilan bajariladi.
class DeepLinkRouter {
  DeepLinkRouter({
    required this.navigatorKey,
    required this.auth,
    required this.tabs,
    this.sources = const [],
  });

  final GlobalKey<NavigatorState> navigatorKey;
  final AuthController auth;
  final HomeTabsController tabs;
  final List<OrderLinkSource> sources;

  final _subscriptions = <StreamSubscription<String>>[];
  String? _pending;

  void start() {
    for (final source in sources) {
      _subscriptions.add(source.orderIds.listen(openOrder));
    }
    auth.addListener(_flush);
  }

  void dispose() {
    auth.removeListener(_flush);
    for (final s in _subscriptions) {
      s.cancel();
    }
    _subscriptions.clear();
  }

  /// Buyurtmani ochishni so'raydi.
  void openOrder(String orderId) {
    _pending = orderId;
    _flush();
  }

  void _flush() {
    final id = _pending;
    if (id == null) return;

    switch (auth.status) {
      case AuthStatus.unknown:
        // Sessiya o'qilmoqda — kutamiz.
        return;
      case AuthStatus.signedOut:
        // Kirmagan odamga ko'rsatadigan narsa yo'q. So'rov saqlanmaydi:
        // keyin BOSHQA hisob bilan kirilsa, begona buyurtma ochilmasin.
        _pending = null;
        return;
      case AuthStatus.signedIn:
        break;
    }

    final navigator = navigatorKey.currentState;
    if (navigator == null) {
      // Birinchi kadr hali chizilmagan — keyingisida qayta uriniladi.
      WidgetsBinding.instance.addPostFrameCallback((_) => _flush());
      return;
    }

    _pending = null;
    // Foydalanuvchi orqaga qaytganda Buyurtmalar bo'limida bo'lsin.
    tabs.go(HomeTab.orders);
    navigator
      ..popUntil((route) => route.isFirst)
      ..push(MaterialPageRoute<void>(builder: (_) => OrderDetailScreen(orderId: id)));
  }
}
