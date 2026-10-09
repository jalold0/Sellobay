import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/home_tabs.dart';
import 'package:sellobay_customer/src/screens/home_screen.dart';
import 'package:sellobay_customer/src/screens/home_shell.dart';
import 'package:sellobay_customer/src/widgets/product_card.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

Map<String, dynamic> _product(String slug, String name) => {
      'id': slug,
      'slug': slug,
      'sku': slug.toUpperCase(),
      'name': {'uz': name},
      'price': '300000',
      'oldPrice': null,
      'currency': 'UZS',
      'rating': 4.6,
      'reviewCount': 12,
      'soldCount': 30,
      'isFeatured': false,
      'brand': {'id': 'b', 'slug': 'nike', 'name': 'Nike'},
      'imageUrl': null,
      'category': null,
      'stock': 10,
      'inStock': true,
    };

String _page(List<Map<String, dynamic>> items) => json.encode({
      'items': items,
      'total': items.length,
      'page': 1,
      'limit': 24,
      'hasMore': false,
    });

const _categoriesJson = '''
{"items":[
  {"id":"c1","slug":"shoes","name":{"uz":"Poyabzal"},"iconUrl":null,"productCount":4},
  {"id":"c2","slug":"clothing","name":{"uz":"Kiyim-kechak"},"iconUrl":null,"productCount":2}
]}''';

/// `featured=true` va `sort=popular` AJRATIB javob beradi.
FakeBackend _backend({
  String categories = _categoriesJson,
  List<Map<String, dynamic>>? featured,
  List<Map<String, dynamic>>? popular,
}) =>
    FakeBackend((options, body) {
      if (options.path == '/api/categories') return okJson(categories);
      if (options.path == '/api/products') {
        final q = options.queryParameters;
        if (q['featured'] == 'true') {
          return okJson(_page(featured ?? [_product('nike-air-max', 'Nike Air Max')]));
        }
        if (q['sort'] == 'popular') {
          return okJson(_page(popular ?? [_product('puma-rs-x', 'Puma RS-X')]));
        }
        return okJson(_page(const []));
      }
      return apiErr(500, 'UNEXPECTED', options.path);
    });

Future<HomeTabsController> pumpHome(
  WidgetTester tester,
  FakeBackend backend, {
  bool shell = false,
}) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(backend, locale: uz);
  final tabs = HomeTabsController();
  await tester.pumpWidget(
    SellobayScope(
      runtime: runtime,
      child: HomeTabsScope(
        controller: tabs,
        child: MaterialApp(
          theme: buildSellobayTheme(),
          home: shell ? const HomeShell() : const HomeScreen(),
        ),
      ),
    ),
  );
  await settle(tester);
  return tabs;
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('bo`limlar serverdan kelgan narsaga qarab chiziladi', (tester) async {
    await pumpHome(tester, _backend());

    expect(find.text('Kategoriyalar'), findsOneWidget);
    expect(find.text('Tanlangan kolleksiya'), findsOneWidget);
    expect(find.text("Eng ko'p sotilganlar"), findsOneWidget);
    expect(find.text('Nike Air Max'), findsOneWidget);
    expect(find.text('Puma RS-X'), findsOneWidget);
  });

  testWidgets('bo`sh bo`lim KO`RSATILMAYDI', (tester) async {
    // Web bosh sahifasi «Chegirma» ni chegirmasiz tovarlar bilan
    // to'ldiradi — bu yerda shunday qilinmaydi.
    await pumpHome(tester, _backend(featured: const []));

    expect(find.text('Tanlangan kolleksiya'), findsNothing);
    expect(find.text("Eng ko'p sotilganlar"), findsOneWidget);
  });

  testWidgets('hammasi bo`sh — to`qima tovar chiqmaydi', (tester) async {
    await pumpHome(
      tester,
      _backend(categories: '{"items":[]}', featured: const [], popular: const []),
    );

    expect(find.byType(ProductCard), findsNothing);
    expect(find.text('Hech narsa topilmadi'), findsOneWidget);
  });

  testWidgets('«tanlangan» va «ommabop» ALOHIDA so`raladi', (tester) async {
    // Bitta so'rovni ikki joyda ko'rsatsak, ikkala bo'lim bir xil
    // bo'lib qolardi.
    final backend = _backend();
    await pumpHome(tester, backend);

    final productCalls = backend.queries
        .asMap()
        .entries
        .where((e) => backend.calls[e.key] == '/api/products')
        .map((e) => e.value)
        .toList();

    expect(productCalls, hasLength(2));
    expect(productCalls.any((q) => q?['featured'] == 'true'), isTrue);
    expect(productCalls.any((q) => q?['sort'] == 'popular'), isTrue);
  });

  testWidgets('kategoriya bosilsa KATALOG filtr bilan ochiladi', (tester) async {
    final backend = _backend();
    final tabs = await pumpHome(tester, backend, shell: true);

    await tester.tap(find.widgetWithText(ActionChip, 'Poyabzal'));
    await settle(tester);

    expect(tabs.tab, HomeTab.catalog);
    // Katalog filtrni O'ZI oladi — shuning uchun kalit bo'shagan
    // bo'lishi kerak.
    expect(tabs.takePendingCategory(), isNull);
    final lastQuery = backend.queries[backend.calls.lastIndexOf('/api/products')];
    expect(lastQuery?['category'], 'shoes');
  });

  testWidgets('«barchasini ko`rish» katalogga o`tkazadi', (tester) async {
    final tabs = await pumpHome(tester, _backend(), shell: true);

    await tester.tap(find.text("Barchasini ko'rish").first);
    await settle(tester);

    expect(tabs.tab, HomeTab.catalog);
  });

  testWidgets('xato — qayta urinish', (tester) async {
    // Katalog route'lari xatoni `{"error": "..."}` ko'rinishida
    // qaytaradi — `{success,error:{...}}` emas.
    final backend = FakeBackend(
      (options, body) => apiErr(500, 'INTERNAL', 'Ichki xato'),
    );
    await pumpHome(tester, backend);

    expect(find.text('Ichki xato'), findsOneWidget);
    expect(find.text('Qayta urinish'), findsOneWidget);
  });
}
