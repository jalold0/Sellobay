import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/screens/wishlist_screen.dart';
import 'package:sellobay_customer/src/widgets/product_card.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

const _p1 = '11111111-1111-4111-8111-111111111111';
const _p2 = '22222222-2222-4222-8222-222222222222';

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

Map<String, dynamic> _product(String id, String name, String slug) => {
      'id': id,
      'slug': slug,
      'sku': slug.toUpperCase(),
      'name': {'uz': name},
      'price': '300000',
      'oldPrice': null,
      'currency': 'UZS',
      'rating': 4.6,
      'reviewCount': 1,
      'soldCount': 1,
      'isFeatured': false,
      'brand': {'id': 'b', 'slug': 'nike', 'name': 'Nike'},
      'imageUrl': null,
      'category': null,
      'stock': 10,
      'inStock': true,
    };

FakeBackend _backend({
  List<String> ids = const [],
  ResponseBody Function(String method)? onWrite,
}) =>
    FakeBackend((options, body) {
      if (options.path == '/api/wishlist') {
        if (options.method == 'GET') return apiOk({'productIds': ids});
        return onWrite?.call(options.method) ?? apiOk({'ok': true});
      }
      if (options.path == '/api/products') {
        final requested = (options.queryParameters['ids'] as String? ?? '').split(',');
        return rawJson(json.encode({
          'items': [
            if (requested.contains(_p1)) _product(_p1, 'Nike Air Max', 'nike-air-max'),
            if (requested.contains(_p2)) _product(_p2, 'Puma RS-X', 'puma-rs-x'),
          ],
          'total': requested.length,
          'page': 1,
          'limit': 24,
          'hasMore': false,
        }));
      }
      return apiErr(500, 'UNEXPECTED', '${options.method} ${options.path}');
    });

Future<SellobayRuntime> pumpWishlist(WidgetTester tester, FakeBackend backend) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(backend, locale: uz);
  await tester.pumpWidget(
    SellobayScope(
      runtime: runtime,
      child: MaterialApp(theme: buildSellobayTheme(), home: const WishlistScreen()),
    ),
  );
  await settle(tester);
  return runtime;
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('bo`sh ro`yxat — TO`QIMA mahsulot ko`rsatilmaydi', (tester) async {
    final backend = _backend();
    await pumpWishlist(tester, backend);

    expect(find.text("Sevimlilar bo'sh"), findsOneWidget);
    expect(find.byType(ProductCard), findsNothing);
    // Bo'sh ro'yxat uchun mahsulot so'ralmaydi.
    expect(backend.calls.where((c) => c == '/api/products'), isEmpty);
  });

  testWidgets('ID`lar bo`yicha mahsulotlar olinadi', (tester) async {
    // Server faqat ID saqlaydi — to'liq ma'lumot alohida so'rov bilan.
    final backend = _backend(ids: [_p1, _p2]);
    await pumpWishlist(tester, backend);

    expect(backend.calls, ['/api/wishlist', '/api/products']);
    expect(find.text('Nike Air Max'), findsOneWidget);
    expect(find.text('Puma RS-X'), findsOneWidget);
  });

  testWidgets('yurakcha bosilsa mahsulot ro`yxatdan chiqadi', (tester) async {
    final backend = _backend(ids: [_p1, _p2]);
    await pumpWishlist(tester, backend);

    await tester.tap(find.byIcon(Icons.favorite).first);
    await settle(tester);

    expect(find.byType(ProductCard), findsOneWidget);
    expect(find.text('Nike Air Max'), findsNothing);
    expect(backend.calls.last, '/api/wishlist');
    expect(backend.queries.last, {'productId': _p1});
  });

  testWidgets('o`chirishda xato bo`lsa mahsulot QAYTADI', (tester) async {
    final backend = _backend(
      ids: [_p1],
      onWrite: (_) => apiErr(500, 'SERVER', 'Ichki xato'),
    );
    await pumpWishlist(tester, backend);

    await tester.tap(find.byIcon(Icons.favorite).first);
    await settle(tester);

    expect(find.byType(ProductCard), findsOneWidget);
    expect(find.text('Ichki xato'), findsWidgets);
  });

  testWidgets('xato — qayta urinish', (tester) async {
    final backend = FakeBackend((options, body) => apiErr(500, 'SERVER', 'Ichki xato'));
    await pumpWishlist(tester, backend);

    expect(find.text('Qayta urinish'), findsOneWidget);
  });
}
