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

/// Ro'yxatda pastda turgan elementni ko'rinadigan qilib bosadi.
Future<void> tapVisible(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pump();
  await tester.tap(finder);
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('bo`limlar serverdan kelgan narsaga qarab chiziladi', (tester) async {
    await pumpHome(tester, _backend());

    // Kategoriyalar to'ri: serverdagilar + doim «Global» va «Barchasi».
    expect(find.text('Poyabzal'), findsOneWidget);
    expect(find.text('Kiyim-kechak'), findsOneWidget);
    expect(find.text('Global'), findsOneWidget);
    expect(find.text('Barchasi'), findsOneWidget);
    // Tovar qatorlari banner ostida — ekrandan pastda bo'lishi mumkin.
    expect(find.text('Tanlangan kolleksiya', skipOffstage: false), findsOneWidget);
    expect(find.text("Eng ko'p sotilganlar", skipOffstage: false), findsOneWidget);
    expect(find.text('Nike Air Max', skipOffstage: false), findsOneWidget);
    expect(find.text('Puma RS-X', skipOffstage: false), findsOneWidget);
  });

  testWidgets('bo`sh bo`lim KO`RSATILMAYDI', (tester) async {
    // Web bosh sahifasi «Chegirma» ni chegirmasiz tovarlar bilan
    // to'ldiradi — bu yerda shunday qilinmaydi.
    await pumpHome(tester, _backend(featured: const []));

    expect(find.text('Tanlangan kolleksiya', skipOffstage: false), findsNothing);
    expect(find.text("Eng ko'p sotilganlar", skipOffstage: false), findsOneWidget);
  });

  testWidgets('hammasi bo`sh — to`qima tovar chiqmaydi', (tester) async {
    await pumpHome(
      tester,
      _backend(categories: '{"items":[]}', featured: const [], popular: const []),
    );

    expect(find.byType(ProductCard, skipOffstage: false), findsNothing);
    expect(find.text('Hech narsa topilmadi', skipOffstage: false), findsOneWidget);
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

    await tester.tap(find.text('Poyabzal'));
    await settle(tester);

    expect(tabs.tab, HomeTab.catalog);
    // Katalog filtrni O'ZI oladi — shuning uchun kalit bo'shagan
    // bo'lishi kerak.
    expect(tabs.takePendingCatalog(), isNull);
    final lastQuery = backend.queries[backend.calls.lastIndexOf('/api/products')];
    expect(lastQuery?['category'], 'shoes');
  });

  testWidgets('«tanlangan»dagi «barchasini ko`rish» — katalog FAQAT tanlanganlar bilan', (tester) async {
    final backend = _backend();
    final tabs = await pumpHome(tester, backend, shell: true);

    await tapVisible(tester, find.text("Barchasini ko'rish", skipOffstage: false).first);
    await settle(tester);

    expect(tabs.tab, HomeTab.catalog);
    final lastQuery = backend.queries[backend.calls.lastIndexOf('/api/products')];
    expect(lastQuery?['featured'], 'true');
    // Filtr ko'rinib turadi — ro'yxat nega qisqaligi tushunarli.
    expect(find.widgetWithText(InputChip, 'Tanlangan kolleksiya'), findsOneWidget);
  });

  testWidgets('«ommabop»dagi «barchasini ko`rish» — katalog ommabop saralashda', (tester) async {
    final backend = _backend();
    await pumpHome(tester, backend, shell: true);

    await tapVisible(tester, find.text("Barchasini ko'rish", skipOffstage: false).last);
    await settle(tester);

    final lastQuery = backend.queries[backend.calls.lastIndexOf('/api/products')];
    expect(lastQuery?['sort'], 'popular');
    expect(lastQuery?.containsKey('featured'), isNot(isTrue));
  });

  testWidgets('«Global» katagi katalogni Global tovarlar bilan ochadi', (tester) async {
    final backend = _backend();
    final tabs = await pumpHome(tester, backend, shell: true);

    await tester.tap(find.text('Global'));
    await settle(tester);

    expect(tabs.tab, HomeTab.catalog);
    final lastQuery = backend.queries[backend.calls.lastIndexOf('/api/products')];
    expect(lastQuery?['scope'], 'GLOBAL');
    // Katalogda filtr chipi — bosilsa oddiy katalogga qaytadi.
    expect(find.widgetWithText(InputChip, 'Global'), findsOneWidget);
  });

  testWidgets('kirilmagan bo`lsa qo`ng`iroq soni so`ralmaydi', (tester) async {
    final backend = _backend();
    await pumpHome(tester, backend);

    expect(backend.calls, isNot(contains('/api/notifications')));
    expect(find.byTooltip('Bildirishnomalar'), findsOneWidget);
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
