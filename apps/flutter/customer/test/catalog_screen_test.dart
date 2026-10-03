import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/screens/catalog_screen.dart';
import 'package:sellobay_customer/src/widgets/product_card.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

final _looksLikeKey = RegExp(r'^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$');

late LocaleController uz;

/// `pumpAndSettle` ATAYLAB ishlatilmaydi.
///
/// Ekranda `CircularProgressIndicator` bo'lsa u cheksiz animatsiya
/// rejalashtiradi va `pumpAndSettle` 10 daqiqadan keyin timeout bilan
/// yiqiladi. Shuning uchun belgilangan sondagi kadr suramiz.
Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 6; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

void expectNoRawKeys(WidgetTester tester) {
  final leaked = tester
      .widgetList<Text>(find.byType(Text))
      .map((w) => w.data)
      .whereType<String>()
      .where(_looksLikeKey.hasMatch)
      .toList();
  expect(leaked, isEmpty, reason: 'tarjima qilinmagan kalitlar: $leaked');
}

String productsJson({
  int total = 2,
  bool hasMore = false,
  List<Map<String, dynamic>>? items,
}) =>
    json.encode({
      'items': items ??
          [
            product(
              slug: 'puma-rs-x-sneakers',
              nameUz: 'Puma RS-X krossovkalar',
              price: '990000',
              brand: 'Puma',
            ),
            product(
              slug: 'nike-air-max',
              nameUz: 'Nike Air Max',
              price: '700000',
              oldPrice: '1000000',
              brand: 'Nike',
              stock: 3,
            ),
          ],
      'total': total,
      'page': 1,
      'limit': 24,
      'hasMore': hasMore,
    });

Map<String, dynamic> product({
  required String slug,
  required String nameUz,
  required String price,
  String? oldPrice,
  String brand = 'Puma',
  int stock = 20,
}) =>
    {
      'id': slug,
      'slug': slug,
      'sku': slug.toUpperCase(),
      'name': {'uz': nameUz, 'ru': nameUz, 'en': nameUz},
      'price': price,
      'oldPrice': oldPrice,
      'currency': 'UZS',
      'rating': 4.6,
      'reviewCount': 78,
      'soldCount': 156,
      'isFeatured': false,
      'brand': {'id': 'b1', 'slug': brand.toLowerCase(), 'name': brand},
      'imageUrl': 'https://picsum.photos/seed/$slug/600/600',
      'category': {
        'slug': 'shoes',
        'name': {'uz': 'Poyabzal', 'ru': 'Обувь', 'en': 'Shoes'},
      },
      'stock': stock,
      'inStock': stock > 0,
    };

/// `/api/categories` TO'LIQ ro'yxatni qaytaradi — bo'shi ham
/// ("Go'zallik" jonli bazada ham aynan shunday, 0 mahsulot bilan).
const _categoriesJson = '''
{"items":[
  {"id":"c1","slug":"shoes","name":{"uz":"Poyabzal","ru":"Обувь","en":"Shoes"},"iconUrl":null,"productCount":4},
  {"id":"c2","slug":"clothing","name":{"uz":"Kiyim-kechak","ru":"Одежда","en":"Clothing"},"iconUrl":null,"productCount":2},
  {"id":"c3","slug":"beauty","name":{"uz":"Go'zallik","ru":"Красота","en":"Beauty"},"iconUrl":null,"productCount":0}
]}''';

/// Telefon o'lchamiga o'tkazadi.
///
/// Standart test ekrani 800x600 — planshetga o'xshaydi va to'rdagi
/// kartochkalar ekrandan chiqib ketadi, natijada `tap` nishonga tegmaydi.
void usePhoneViewport(WidgetTester tester) {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);
}

Future<void> pumpCatalog(WidgetTester tester, FakeBackend backend) async {
  usePhoneViewport(tester);
  final runtime = buildRuntime(backend, locale: uz);
  await tester.pumpWidget(
    SellobayRuntimeScope(
      runtime: runtime,
      child: TranslationsScope(
        translations: uz.translations!,
        child: AuthScope(
          controller: runtime.auth,
          child: CartScope(
            store: runtime.cart,
            child: MaterialApp(theme: buildSellobayTheme(), home: const CatalogScreen()),
          ),
        ),
      ),
    ),
  );
  await settle(tester);
}

FakeBackend happyBackend({String? products}) => FakeBackend((options, body) {
      if (options.path == '/api/categories') return rawJson(_categoriesJson);
      return rawJson(products ?? productsJson());
    });

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('mahsulotlar va HAQIQIY soni ko`rsatiladi', (tester) async {
    final backend = happyBackend(products: productsJson(total: 11));
    await pumpCatalog(tester, backend);

    expect(find.text('Puma RS-X krossovkalar'), findsOneWidget);
    expect(find.text('Nike Air Max'), findsOneWidget);
    // Son serverdagi `total` dan, ro'yxat uzunligidan EMAS: ro'yxatda
    // hozircha 2 ta element bor, bazada esa 11 ta mahsulot.
    expect(find.text('11 ta mahsulot'), findsOneWidget);
    expectNoRawKeys(tester);
  });

  testWidgets('narx va chegirma serverdagi qiymatlardan hisoblanadi', (tester) async {
    await pumpCatalog(tester, happyBackend());

    expect(find.text("990 000 so'm"), findsOneWidget);
    expect(find.text("700 000 so'm"), findsOneWidget);
    // 700000 / 1000000 -> 30%
    expect(find.text('-30%'), findsOneWidget);
    expect(find.text("1 000 000 so'm"), findsOneWidget);
  });

  testWidgets('kam qolgan tovar belgisi FAQAT haqiqiy zaxiraga qarab', (tester) async {
    // Nike zaxirasi 3 (<=5) -> belgi bor; Puma 20 -> yo'q.
    await pumpCatalog(tester, happyBackend());

    expect(find.text('Faqat 3 ta qoldi!'), findsOneWidget);
    expect(find.textContaining('Faqat 20'), findsNothing);
  });

  testWidgets('bo`sh natija — to`qima ro`yxat ko`rsatilmaydi', (tester) async {
    await pumpCatalog(
      tester,
      happyBackend(products: json.encode({'items': [], 'total': 0, 'page': 1, 'limit': 24, 'hasMore': false})),
    );

    expect(find.text('Hech narsa topilmadi'), findsOneWidget);
    expect(find.text('0 ta mahsulot'), findsOneWidget);
    expectNoRawKeys(tester);
  });

  testWidgets('server xatosi — xabar va qayta urinish', (tester) async {
    var fail = true;
    final backend = FakeBackend((options, body) {
      if (options.path == '/api/categories') return rawJson(_categoriesJson);
      if (fail) return rawJson('{"error":"Internal server error"}', status: 500);
      return rawJson(productsJson());
    });
    await pumpCatalog(tester, backend);

    expect(find.text('Internal server error'), findsOneWidget);
    expect(find.text('Qayta urinish'), findsOneWidget);

    fail = false;
    await tester.tap(find.text('Qayta urinish'));
    await settle(tester);

    expect(find.text('Puma RS-X krossovkalar'), findsOneWidget);
  });

  testWidgets('kategoriya chipi so`rovga `category` qo`shadi', (tester) async {
    final backend = happyBackend();
    await pumpCatalog(tester, backend);

    // Chip matni haqiqiy mahsulot soni bilan: "Poyabzal · 4".
    expect(find.text('Poyabzal · 4'), findsOneWidget);
    await tester.tap(find.text('Poyabzal · 4'));
    await settle(tester);

    final productQueries =
        backend.queries.indexed.where((e) => backend.calls[e.$1] == '/api/products');
    expect(productQueries.last.$2!['category'], 'shoes');
  });

  testWidgets('saralash so`rovga `sort` qo`shadi', (tester) async {
    final backend = happyBackend();
    await pumpCatalog(tester, backend);

    await tester.tap(find.text('Yangilar'));
    await tester.pumpAndSettle(); // menyu animatsiyasi — spinner yo'q
    await tester.tap(find.text('Arzon → qimmat').last);
    await settle(tester);

    final productQueries =
        backend.queries.indexed.where((e) => backend.calls[e.$1] == '/api/products');
    expect(productQueries.last.$2!['sort'], 'price-asc');
  });

  testWidgets('qidiruv kechiktiriladi — har harfga so`rov ketmaydi', (tester) async {
    final backend = happyBackend();
    await pumpCatalog(tester, backend);
    final before = backend.countOf('/api/products');

    await tester.enterText(find.byType(TextField).first, 'nik');
    await tester.pump(const Duration(milliseconds: 100));
    await tester.enterText(find.byType(TextField).first, 'nike');
    await tester.pump(const Duration(milliseconds: 100));
    // Hali 400 ms o'tmadi.
    expect(backend.countOf('/api/products'), before);

    await tester.pump(const Duration(milliseconds: 400));
    await settle(tester);

    expect(backend.countOf('/api/products'), before + 1);
    final productQueries =
        backend.queries.indexed.where((e) => backend.calls[e.$1] == '/api/products');
    expect(productQueries.last.$2!['q'], 'nike');
  });

  // Quyidagi ikki test "chizilsa bo'ldi" degani EMAS: Flutter'da
  // RenderFlex to'lib ketsa test istisno bilan yiqiladi. Ya'ni ular
  // kartochka balandligi hisobini qulflaydi — ilgari `childAspectRatio`
  // qotib yozilgani uchun tor ekranda 21 piksel toshib ketardi.
  testWidgets('BO`SH kategoriya chipi ko`rsatilmaydi', (tester) async {
    // Bosilsa bo'sh ro'yxatga olib borardi. Web'da bu filtr
    // `fetchStorefrontCategories()` da — mijoz ekranida bir xil qoida.
    await pumpCatalog(tester, happyBackend());

    expect(find.text('Poyabzal · 4'), findsOneWidget);
    expect(find.textContaining("Go'zallik"), findsNothing);
  });

  testWidgets('katta tizim shriftida kartochka toshmaydi', (tester) async {
    usePhoneViewport(tester);
    final runtime = buildRuntime(happyBackend(), locale: uz);
    await tester.pumpWidget(
      SellobayRuntimeScope(
        runtime: runtime,
        child: TranslationsScope(
          translations: uz.translations!,
          child: AuthScope(
            controller: runtime.auth,
            child: CartScope(
              store: runtime.cart,
              child: MaterialApp(
              theme: buildSellobayTheme(),
              builder: (context, child) => MediaQuery(
                data: MediaQuery.of(context).copyWith(
                  textScaler: const TextScaler.linear(1.6),
                ),
                child: child!,
              ),
              home: const CatalogScreen(),
            ),
            ),
          ),
        ),
      ),
    );
    await settle(tester);

    expect(find.text('Puma RS-X krossovkalar'), findsOneWidget);
  });

  testWidgets('keng ekranda ham toshmaydi', (tester) async {
    // 800x600 — standart test ekrani, planshet/landshaftga yaqin.
    final runtime = buildRuntime(happyBackend(), locale: uz);
    await tester.pumpWidget(
      SellobayRuntimeScope(
        runtime: runtime,
        child: TranslationsScope(
          translations: uz.translations!,
          child: AuthScope(
            controller: runtime.auth,
            child: CartScope(
              store: runtime.cart,
              child: MaterialApp(theme: buildSellobayTheme(), home: const CatalogScreen()),
            ),
          ),
        ),
      ),
    );
    await settle(tester);

    expect(find.text('Puma RS-X krossovkalar'), findsOneWidget);
  });

  testWidgets('mahsulotga bosilsa sahifasi ochiladi', (tester) async {
    final backend = FakeBackend((options, body) {
      if (options.path == '/api/categories') return rawJson(_categoriesJson);
      if (options.path == '/api/products/puma-rs-x-sneakers') {
        return rawJson(json.encode({
          ...product(slug: 'puma-rs-x-sneakers', nameUz: 'Puma RS-X krossovkalar', price: '990000'),
          'description': {'uz': 'Qulay krossovka'},
          'shortDescription': null,
          'images': <Map<String, dynamic>>[],
          'variants': <Map<String, dynamic>>[],
          'seller': null,
        }));
      }
      return rawJson(productsJson());
    });
    await pumpCatalog(tester, backend);

    // Kartochkaning O'ZIGA bosamiz: 800x600 test ekranida nom matni
    // pastda qolib ketadi va `tap` nishonga tegmaydi.
    await tester.tap(find.byType(ProductCard).first);
    await settle(tester);

    expect(backend.calls, contains('/api/products/puma-rs-x-sneakers'));
    expect(find.text('Qulay krossovka'), findsOneWidget);
    expect(find.text("Savatga qo'shish"), findsOneWidget);
    expectNoRawKeys(tester);
  });
}
