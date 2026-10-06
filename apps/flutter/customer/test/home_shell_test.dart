import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/home_tabs.dart';
import 'package:sellobay_customer/src/screens/cart_screen.dart';
import 'package:sellobay_customer/src/screens/home_shell.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

Map<String, dynamic> _product() => {
      'id': '11111111-1111-4111-8111-111111111111',
      'slug': 'nike-air-max',
      'sku': 'NK-1',
      'name': {'uz': 'Nike Air Max'},
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

FakeBackend _backend() => FakeBackend((options, body) {
      if (options.path == '/api/categories') return okJson('{"items":[]}');
      if (options.path == '/api/products') {
        return okJson('{"items":[],"total":0,"page":1,"limit":24,"hasMore":false}');
      }
      if (options.path == '/api/orders') return apiOk({'items': <Map<String, dynamic>>[]});
      return apiErr(500, 'UNEXPECTED', options.path);
    });

CartStore _cart({int quantity = 2}) => CartStore(storage: InMemoryCartStorage())
  ..add(CartLine.fromProduct(ProductSummary.fromJson(_product()), quantity: quantity));

Finder navIcon(IconData icon) =>
    find.descendant(of: find.byType(NavigationBar), matching: find.byIcon(icon));

Future<SellobayRuntime> pumpShell(WidgetTester tester, FakeBackend backend, {CartStore? cart}) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(backend, locale: uz, cart: cart);
  await tester.pumpWidget(
    SellobayScope(
      runtime: runtime,
      child: HomeTabsScope(
        controller: HomeTabsController(),
        child: MaterialApp(theme: buildSellobayTheme(), home: const HomeShell()),
      ),
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

  testWidgets('beshta bo`lim bor', (tester) async {
    await pumpShell(tester, _backend());

    expect(find.text('Bosh sahifa'), findsOneWidget);
    expect(find.text('Katalog'), findsWidgets);
    expect(find.text('Savatcha'), findsOneWidget);
    expect(find.text('Buyurtmalar'), findsWidgets);
    expect(find.text('Profil'), findsOneWidget);
  });

  testWidgets('bo`lim almashadi', (tester) async {
    await pumpShell(tester, _backend());

    // Boshida bosh sahifa.
    expect(find.text('Sellobay'), findsOneWidget);

    await tester.tap(navIcon(Icons.receipt_long_outlined));
    await settle(tester);

    // Bosh sahifa endi ko'rinmaydi, buyurtmalar ko'rinadi.
    expect(find.text('Sellobay'), findsNothing);
    expect(find.text('Buyurtmalarim'), findsOneWidget);
  });

  testWidgets('savat belgisida DONALAR soni', (tester) async {
    await pumpShell(tester, _backend(), cart: _cart(quantity: 3));

    expect(find.descendant(of: find.byType(NavigationBar), matching: find.text('3')),
        findsOneWidget);
  });

  testWidgets('savat bo`sh bo`lsa belgida son yo`q', (tester) async {
    await pumpShell(tester, _backend());

    expect(
      find.descendant(of: find.byType(NavigationBar), matching: find.byType(Badge)),
      findsWidgets,
    );
    expect(find.descendant(of: find.byType(NavigationBar), matching: find.text('0')), findsNothing);
  });

  testWidgets('bo`sh savatdagi «xaridni davom ettirish» KATALOGGA qaytaradi', (tester) async {
    // Ilgari bu tugma `Navigator.pop()` qilardi. Qobiq ichida
    // qaytadigan marshrut yo'q — tugma jim o'tirib qolardi.
    await pumpShell(tester, _backend());

    await tester.tap(navIcon(Icons.shopping_bag_outlined));
    await settle(tester);
    expect(
      find.descendant(of: find.byType(CartScreen), matching: find.text("Savatcha bo'sh")),
      findsOneWidget,
    );

    await tester.tap(find.text('Xaridni davom ettirish'));
    await settle(tester);

    expect(find.text('Katalog'), findsWidgets);
    expect(find.descendant(of: find.byType(CartScreen), matching: find.text("Savatcha bo'sh")),
        findsNothing);
  });

  testWidgets('ochilmagan bo`lim so`rov YUBORMAYDI', (tester) async {
    // `IndexedStack` farzandlarining hammasini darhol qurardi, natijada
    // ilova ochilishi bilan buyurtmalar ham so'ralardi.
    final backend = _backend();
    await pumpShell(tester, backend);

    expect(backend.countOf('/api/orders'), 0);
  });

  testWidgets('buyurtmalar bo`limi HAR ochilganda qayta yuklanadi', (tester) async {
    // Yangi buyurtma bergandan keyin eski ro'yxat turib qolmasligi kerak.
    final backend = _backend();
    await pumpShell(tester, backend);

    await tester.tap(navIcon(Icons.receipt_long_outlined));
    await settle(tester);
    await tester.tap(navIcon(Icons.home_outlined));
    await settle(tester);
    await tester.tap(navIcon(Icons.receipt_long_outlined));
    await settle(tester);

    expect(backend.countOf('/api/orders'), 2);
  });
}
