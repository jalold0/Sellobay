import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/app.dart';
import 'package:sellobay_customer/src/home_tabs.dart';
import 'package:sellobay_customer/src/screens/home_shell.dart';
import 'package:sellobay_customer/src/screens/login_screen.dart';
import 'package:sellobay_customer/src/screens/orders_screen.dart';
import 'package:sellobay_customer/src/screens/product_screen.dart';
import 'package:sellobay_customer/src/screens/wishlist_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

const _productId = '11111111-1111-4111-8111-111111111111';

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

/// Marshrut animatsiyasi tugashi uchun.
Future<void> settleRoute(WidgetTester tester) async {
  await settle(tester);
  await tester.pump(const Duration(milliseconds: 500));
  await settle(tester);
}

Map<String, dynamic> _detail() => {
      'id': _productId,
      'slug': 'nike-air-max',
      'sku': 'NK-1',
      'name': {'uz': 'Nike Air Max'},
      'description': {'uz': ''},
      'shortDescription': {'uz': ''},
      'price': '300000',
      'oldPrice': null,
      'currency': 'UZS',
      'rating': 0,
      'reviewCount': 0,
      'soldCount': 0,
      'brand': {'id': 'b', 'slug': 'nike', 'name': 'Nike'},
      'images': <Map<String, dynamic>>[],
      'stock': 5,
      'inStock': true,
      'variants': <Map<String, dynamic>>[],
    };

FakeBackend _backend({List<String> wishlist = const []}) => FakeBackend((options, body) {
      switch (options.path) {
        case '/api/auth/login':
          return apiOk({'user': userJson(), 'tokens': tokenPair('1')});
        case '/api/auth/me':
          return apiOk({'user': userJson(roles: ['CUSTOMER'])});
        case '/api/orders':
          return apiOk({'items': <Map<String, dynamic>>[]});
        case '/api/categories':
          return okJson('{"items":[]}');
        case '/api/products':
          return okJson('{"items":[],"total":0,"page":1,"limit":24,"hasMore":false}');
        case '/api/products/nike-air-max':
          return apiOk(_detail());
        case '/api/wishlist':
          if (options.method == 'GET') return apiOk({'productIds': wishlist});
          return apiOk({'ok': true});
      }
      // Savat sinxroni, sharhlar va h.k. — bu test uchun ahamiyatsiz.
      return apiErr(500, 'UNEXPECTED', options.path);
    });

Future<SellobayRuntime> pumpApp(WidgetTester tester, FakeBackend backend) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(backend, locale: uz);
  await tester.pumpWidget(SellobayCustomerApp(runtime: runtime));
  // Saqlangan sessiya yo'q — mehmon.
  unawaited(runtime.auth.restore());
  await settle(tester);
  return runtime;
}

/// Kirish ekranida email + parol bilan kiradi.
Future<void> signInThroughForm(WidgetTester tester) async {
  final login = find.byType(LoginScreen);
  expect(login, findsOneWidget);
  await tester.tap(find.descendant(of: login, matching: find.text('Email')).first);
  await settle(tester);
  final fields = find.descendant(of: login, matching: find.byType(TextField));
  await tester.enterText(fields.at(0), 'dilnoza@example.uz');
  await tester.enterText(fields.at(1), 'parol1234');
  await tester.tap(find.descendant(of: login, matching: find.widgetWithText(FilledButton, 'Kirish')));
  await settleRoute(tester);
}

Finder navIcon(IconData icon) =>
    find.descendant(of: find.byType(NavigationBar), matching: find.byIcon(icon));

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('mehmon do`konga kiradi — login ekraniga qamalmaydi', (tester) async {
    final runtime = await pumpApp(tester, _backend());

    expect(runtime.auth.status, AuthStatus.signedOut);
    expect(find.byType(HomeShell), findsOneWidget);
    expect(find.byType(LoginScreen), findsNothing);
  });

  testWidgets('buyurtmalar bo`limi mehmondan kirishni so`raydi va KIRGACH o`sha yerda qoladi', (
    tester,
  ) async {
    final backend = _backend();
    final runtime = await pumpApp(tester, backend);

    await tester.tap(navIcon(Icons.receipt_long_outlined));
    await settle(tester);
    expect(find.text("Buyurtmalaringiz shu yerda bo'ladi"), findsOneWidget);
    expect(find.byType(OrdersScreen), findsNothing);
    // Mehmon buyurtmasi uchun kuzatish yo'li ham bor.
    expect(find.text('Buyurtmamni kuzatish'), findsOneWidget);
    expect(backend.countOf('/api/orders'), 0);

    await tester.tap(find.widgetWithText(FilledButton, 'Kirish'));
    await settleRoute(tester);
    await signInThroughForm(tester);

    expect(runtime.auth.status, AuthStatus.signedIn);
    expect(find.byType(LoginScreen), findsNothing);
    // Bosh sahifaga emas — buyurtmalar bo'limiga qaytdi.
    expect(HomeTabsScope.read(tester.element(find.byType(HomeShell)))!.tab, HomeTab.orders);
    expect(find.byType(OrdersScreen), findsOneWidget);
    expect(backend.countOf('/api/orders'), greaterThan(0));
  });

  testWidgets('mahsulotdagi yurakcha: kirgach o`sha mahsulot sahifasiga qaytadi va saqlanadi', (
    tester,
  ) async {
    final backend = _backend();
    await pumpApp(tester, backend);

    final nav = tester.state<NavigatorState>(find.byType(Navigator).first);
    unawaited(nav.push(MaterialPageRoute<void>(builder: (_) => const ProductScreen(slug: 'nike-air-max'))));
    await settleRoute(tester);
    expect(find.text('Nike Air Max'), findsWidgets);

    await tester.tap(find.byIcon(Icons.favorite_border).first);
    await settleRoute(tester);
    await signInThroughForm(tester);

    // Mahsulot sahifasi joyida — kirish uni yopib yubormadi.
    expect(find.byType(ProductScreen), findsOneWidget);
    // Bosilgan amal yo'qolmadi: mahsulot sevimlilarga qo'shildi.
    final writes = <String>[
      for (var i = 0; i < backend.calls.length; i++)
        if (backend.calls[i] == '/api/wishlist' && backend.bodies[i] != null) '${backend.bodies[i]}',
    ];
    expect(writes, ['{productId: $_productId}']);
    expect(find.byIcon(Icons.favorite), findsWidgets);
  });

  testWidgets('allaqachon saqlangan mahsulotni kirishdan keyin O`CHIRIB yubormaydi', (tester) async {
    final backend = _backend(wishlist: const [_productId]);
    await pumpApp(tester, backend);

    final nav = tester.state<NavigatorState>(find.byType(Navigator).first);
    unawaited(nav.push(MaterialPageRoute<void>(builder: (_) => const ProductScreen(slug: 'nike-air-max'))));
    await settleRoute(tester);

    await tester.tap(find.byIcon(Icons.favorite_border).first);
    await settleRoute(tester);
    await signInThroughForm(tester);

    expect(backend.calls.where((c) => c == '/api/wishlist').length, 1, reason: 'faqat GET');
    expect(find.byIcon(Icons.favorite), findsWidgets);
  });

  testWidgets('kirish oynasidan ortga qaytsa — hech narsa o`zgarmaydi', (tester) async {
    final backend = _backend();
    final runtime = await pumpApp(tester, backend);

    final nav = tester.state<NavigatorState>(find.byType(Navigator).first);
    unawaited(nav.push(MaterialPageRoute<void>(builder: (_) => const WishlistScreen())));
    await settleRoute(tester);
    expect(find.text('Sevimlilarni saqlash uchun kiring'), findsOneWidget);
    // Mehmonda server so'ralmaydi (401 bo'lardi).
    expect(backend.countOf('/api/wishlist'), 0);

    await tester.tap(find.widgetWithText(FilledButton, 'Kirish'));
    await settleRoute(tester);
    await tester.pageBack();
    await settleRoute(tester);

    expect(runtime.auth.status, AuthStatus.signedOut);
    expect(find.byType(WishlistScreen), findsOneWidget);
    expect(find.byType(LoginScreen), findsNothing);
  });
}
