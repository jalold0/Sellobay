import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/home_tabs.dart';
import 'package:sellobay_customer/src/screens/cart_screen.dart';
import 'package:sellobay_customer/src/screens/home_shell.dart';
import 'package:sellobay_customer/src/widgets/product_card.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

const _uuid = '11111111-1111-4111-8111-111111111111';

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 6; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

/// Marshrut almashinuvini oxirigacha o'tkazadi.
///
/// `MaterialPageRoute` o'tishi 300 ms. Tugamaguncha pastdagi ekran ham
/// daraxtda ko'rinib turadi va bir xil matn IKKI marta topiladi.
Future<void> settleRoute(WidgetTester tester) async {
  await settle(tester);
  await tester.pump(const Duration(milliseconds: 400));
  await settle(tester);
}

/// Faqat savat ekrani ichidan qidiradi.
Finder inCart(Finder matching) =>
    find.descendant(of: find.byType(CartScreen), matching: matching);

void usePhoneViewport(WidgetTester tester) {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);
}

Map<String, dynamic> _product({String price = '300000', String? oldPrice}) => {
      'id': _uuid,
      'slug': 'nike-air-max',
      'sku': 'NK-1',
      'name': {'uz': 'Nike Air Max'},
      'price': price,
      'oldPrice': oldPrice,
      'currency': 'UZS',
      'rating': 4.6,
      'reviewCount': 78,
      'soldCount': 12,
      'isFeatured': false,
      'brand': {'id': 'b', 'slug': 'nike', 'name': 'Nike'},
      'imageUrl': null,
      'category': null,
      'stock': 20,
      'inStock': true,
    };

String _listJson({String price = '300000'}) => json.encode({
      'items': [_product(price: price)],
      'total': 1,
      'page': 1,
      'limit': 24,
      'hasMore': false,
    });

String _detailJson({String price = '300000'}) => json.encode({
      ..._product(price: price),
      'description': {'uz': 'Tavsif'},
      'shortDescription': null,
      'images': <Map<String, dynamic>>[],
      'variants': [
        {
          'id': 'var-1',
          'sku': 'NK-1-42',
          'price': price,
          'color': 'Qora',
          'size': '42',
          'stock': 5,
          'inStock': true,
        },
      ],
      'seller': null,
    });

const _categoriesJson = '{"items":[]}';

FakeBackend catalogBackend({String price = '300000'}) => FakeBackend((options, body) {
      if (options.path == '/api/categories') return rawJson(_categoriesJson);
      if (options.path.startsWith('/api/products/')) return rawJson(_detailJson(price: price));
      return rawJson(_listJson(price: price));
    });

Future<SellobayRuntime> pumpCatalog(
  WidgetTester tester,
  FakeBackend backend, {
  SellobayConfig? config,
  CartStore? cart,
}) async {
  usePhoneViewport(tester);
  final runtime = buildRuntime(backend, locale: uz, config: config, cart: cart);
  await tester.pumpWidget(
    SellobayScope(
      runtime: runtime,
      // Haqiqiy ildiz — qobiq. Savatga pastki paneldan o'tiladi,
      // ilgari katalog AppBar'idagi belgidan o'tilardi.
      child: HomeTabsScope(
        controller: HomeTabsController(),
        child: MaterialApp(theme: buildSellobayTheme(), home: const HomeShell()),
      ),
    ),
  );
  await settle(tester);
  return runtime;
}

/// Mahsulot sahifasini ochib savatga qo'shadi.
///
/// Eslatma: `ScaffoldMessenger` SnackBar'ni RO'YXATDAGI HAR BIR
/// `Scaffold` da ko'rsatadi. Mahsulot sahifasi katalog ustida turgani
/// uchun daraxtda ikkita nusxa bo'ladi — shuning uchun finder'larda
/// `.first` va `findsWidgets` ishlatiladi.
Future<void> addFirstProduct(WidgetTester tester) async {
  await tester.tap(find.byType(ProductCard).first);
  await settleRoute(tester);
  await tester.tap(find.text("Savatga qo'shish"));
  await settle(tester);
  await tester.pageBack();
  await settleRoute(tester);
}

/// Pastki paneldagi savat bo'limiga o'tadi.
Future<void> openCart(WidgetTester tester) async {
  await tester.tap(
    find.descendant(
      of: find.byType(NavigationBar),
      matching: find.byIcon(Icons.shopping_bag_outlined),
    ),
  );
  await settleRoute(tester);
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('savatga qo`shiladi va belgidagi son o`sadi', (tester) async {
    final runtime = await pumpCatalog(tester, catalogBackend());

    expect(find.text('1'), findsNothing); // belgida son yo'q
    await addFirstProduct(tester);

    expect(runtime.cart.unitCount, 1);
    // Tanlangan variant SAQLANADI — buyurtma aynan unga tushishi kerak.
    expect(runtime.cart.lines.single.variantId, 'var-1');
    expect(runtime.cart.lines.single.color, 'Qora');
    expect(runtime.cart.lines.single.size, '42');
    expect(find.text("Savatga qo'shildi"), findsWidgets);
  });

  testWidgets('savat ekrani satrni va summani ko`rsatadi', (tester) async {
    await pumpCatalog(tester, catalogBackend(), config: testConfig());
    await addFirstProduct(tester);

    await openCart(tester);

    expect(inCart(find.text('Nike Air Max')), findsOneWidget);
    expect(inCart(find.text('Qora · 42')), findsOneWidget);
    // Ekranda: satr summasi + "Mahsulotlar" qatori.
    expect(inCart(find.text("300 000 so'm")), findsNWidgets(2));
    // 300 000 < 500 000 -> yetkazish 20 000, jami 320 000.
    expect(inCart(find.text('Yetkazib berish')), findsOneWidget);
    expect(inCart(find.text("20 000 so'm")), findsOneWidget);
    expect(inCart(find.text("320 000 so'm")), findsOneWidget);
    expect(inCart(find.textContaining("Yana 200 000 so'm")), findsOneWidget);
  });

  testWidgets('chegaradan oshsa yetkazish TEKIN', (tester) async {
    await pumpCatalog(tester, catalogBackend(price: '600000'), config: testConfig());
    await addFirstProduct(tester);
    await openCart(tester);

    expect(inCart(find.text('Tekin')), findsOneWidget);
    // satr + "Mahsulotlar" + "Jami" — yetkazish 0 bo'lgani uchun uchtasi teng.
    expect(inCart(find.text("600 000 so'm")), findsNWidgets(3));
    expect(inCart(find.textContaining('Yana')), findsNothing);
  });

  testWidgets('qoidalar yuklanmagan — yetkazish qatori YO`Q', (tester) async {
    // Taxminiy raqam yozib qo'yish checkout'dagi haqiqiy summadan
    // farq qilardi, shuning uchun hech narsa ko'rsatilmaydi.
    await pumpCatalog(tester, catalogBackend());
    await addFirstProduct(tester);
    await openCart(tester);

    expect(inCart(find.text('Yetkazib berish')), findsNothing);
    expect(inCart(find.text('Jami')), findsOneWidget);
    // satr + "Mahsulotlar" + "Jami" — yetkazish qatori umuman yo'q.
    expect(inCart(find.text("300 000 so'm")), findsNWidgets(3));
  });

  testWidgets('sonni oshirish summani yangilaydi', (tester) async {
    final runtime = await pumpCatalog(tester, catalogBackend());
    await addFirstProduct(tester);
    await openCart(tester);

    await tester.tap(find.byTooltip('Oshirish'));
    await settle(tester);

    expect(runtime.cart.lines.single.quantity, 2);
    expect(inCart(find.text("600 000 so'm")), findsNWidgets(3));
  });

  testWidgets('satrni o`chirish — savat bo`shaydi', (tester) async {
    final runtime = await pumpCatalog(tester, catalogBackend());
    await addFirstProduct(tester);
    await openCart(tester);

    await tester.tap(find.byTooltip("O'chirish"));
    await settle(tester);

    expect(runtime.cart.isEmpty, isTrue);
    expect(inCart(find.text("Savatcha bo'sh")), findsOneWidget);
  });

  testWidgets('saqlangan savat ishga tushganda tiklanadi', (tester) async {
    // Mehmon xaridi: savat tizimga kirmasdan ham saqlanadi.
    final storage = InMemoryCartStorage();
    final first = CartStore(storage: storage);
    await pumpCatalog(tester, catalogBackend(), cart: first);
    await addFirstProduct(tester);

    final second = CartStore(storage: storage);
    await second.load();

    expect(second.lineCount, 1);
    expect(second.lines.single.name.pick('uz'), 'Nike Air Max');
  });

  testWidgets('kirilmagan bo`lsa serverga savat yuborilmaydi', (tester) async {
    final backend = catalogBackend();
    await pumpCatalog(tester, backend);
    await addFirstProduct(tester);
    await tester.pump(const Duration(seconds: 1)); // debounce o'tsin

    expect(backend.calls.where((c) => c == '/api/cart'), isEmpty);
  });
}
