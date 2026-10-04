// Ekranlarning HAQIQIY rasmini oladi — qo'lda chizilgan maket emas.
//
// `test/` da EMAS, `tool/` da: `flutter test` (va CI) faqat `test/`
// papkasini skanerlaydi. Golden'lar shrift renderi bo'yicha platformaga
// bog'liq (Windows ≠ Linux), shuning uchun ularni CI'da taqqoslash
// pipeline'ni bejiz qizartirardi.
//
// Ishga tushirish:
//   flutter test tool/screens.dart --update-goldens
//
// Natija: tool/shots/*.png
import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/home_tabs.dart';
import 'package:sellobay_customer/src/screens/addresses_screen.dart';
import 'package:sellobay_customer/src/screens/checkout_screen.dart';
import 'package:sellobay_customer/src/screens/home_shell.dart';
import 'package:sellobay_customer/src/screens/login_screen.dart';
import 'package:sellobay_customer/src/screens/order_detail_screen.dart';
import 'package:sellobay_customer/src/screens/order_success_screen.dart';
import 'package:sellobay_customer/src/screens/otp_screen.dart';
import 'package:sellobay_customer/src/screens/product_screen.dart';
import 'package:sellobay_customer/src/screens/wishlist_screen.dart';
import 'package:sellobay_customer/src/screens/register_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

const _orderId = 'aaaaaaaa-1111-4111-8111-111111111111';
const _productId = '11111111-1111-4111-8111-111111111111';

Future<void> _settle(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

/// Haqiqiy shriftlarni yuklaydi.
///
/// `flutter test` standart holda har bir glifni to'rtburchak chizadigan
/// sinov shriftini ishlatadi. Unda matn kengligi = belgi soni × kegl,
/// ya'ni haqiqatdan ancha keng — surat o'qib bo'lmas, ustiga ustak
/// YOLG'ON overflow beradi. Roboto Flutter SDK bilan birga keladi
/// (Android'dagi standart shrift), shuning uchun tashqi fayl kerak emas.
Future<void> loadRealFonts() async {
  final root = Platform.environment['FLUTTER_ROOT'];
  if (root == null) throw StateError('FLUTTER_ROOT yo`q — `flutter test` orqali ishga tushiring');
  final dir = Directory('$root/bin/cache/artifacts/material_fonts');

  Future<void> family(String name, List<String> files) async {
    final loader = FontLoader(name);
    for (final file in files) {
      final bytes = File('${dir.path}/$file').readAsBytesSync();
      loader.addFont(Future.value(ByteData.sublistView(bytes)));
    }
    await loader.load();
  }

  await family('Roboto', const [
    'roboto-regular.ttf',
    'roboto-medium.ttf',
    'roboto-bold.ttf',
    'roboto-black.ttf',
  ]);
  await family('MaterialIcons', const ['materialicons-regular.otf']);
}

/// Mavzu + haqiqiy shrift oilasi.
ThemeData previewTheme() {
  final theme = buildSellobayTheme();

  // `ButtonStyle.textStyle` uslubni MERGE qilmaydi, butunlay almashtiradi.
  // Mavzuda u shrift oilasisiz berilgan — haqiqiy qurilmada bu platforma
  // shriftiga tushadi (to'g'ri), testda esa sinov shriftiga, ya'ni
  // tugma matni to'rtburchakka aylanadi. Shu yerda oilani qo'shamiz.
  final filled = theme.filledButtonTheme.style;
  return theme.copyWith(
    textTheme: theme.textTheme.apply(fontFamily: 'Roboto'),
    primaryTextTheme: theme.primaryTextTheme.apply(fontFamily: 'Roboto'),
    filledButtonTheme: FilledButtonThemeData(
      style: filled?.copyWith(
        textStyle: WidgetStatePropertyAll(
          filled.textStyle?.resolve(const <WidgetState>{})?.copyWith(fontFamily: 'Roboto'),
        ),
      ),
    ),
  );
}

/// Bitta ekranni suratga oladi.
Future<void> shoot(
  WidgetTester tester,
  String name,
  Widget home, {
  FakeBackend? backend,
  CartStore? cart,
}) async {
  tester.view
    ..physicalSize = const Size(390 * 2, 844 * 2)
    ..devicePixelRatio = 2;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(
    backend ?? FakeBackend((options, body) => apiErr(500, 'UNEXPECTED', options.path)),
    locale: uz,
    cart: cart,
  );

  await tester.pumpWidget(
    SellobayScope(
      runtime: runtime,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: previewTheme(),
        home: home,
      ),
    ),
  );
  await _settle(tester);

  await expectLater(find.byType(MaterialApp), matchesGoldenFile('shots/$name.png'));
}

/// Qobiq ichidagi bo'limni suratga oladi.
///
/// Katalog, savat, buyurtmalar va profil ilovada ALOHIDA ekran emas —
/// pastki panelli qobiqning bo'limlari. Ularni yakka holda chizsak,
/// surat ilovaga o'xshamay qolardi.
Future<void> shootTab(
  WidgetTester tester,
  String name,
  HomeTab tab, {
  required FakeBackend backend,
  CartStore? cart,
  bool signIn = false,
}) async {
  tester.view
    ..physicalSize = const Size(390 * 2, 844 * 2)
    ..devicePixelRatio = 2;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(backend, locale: uz, cart: cart);
  if (signIn) {
    // `await` QILINMAYDI: soxta vaqtda kadr surilmaguncha tugamaydi.
    unawaited(runtime.auth.signInWithPassword(identifier: '+998901234567', password: 'parol1234'));
  }

  final tabs = HomeTabsController()..go(tab);
  await tester.pumpWidget(
    SellobayScope(
      runtime: runtime,
      child: HomeTabsScope(
        controller: tabs,
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: previewTheme(),
          home: const HomeShell(),
        ),
      ),
    ),
  );
  await _settle(tester);

  await expectLater(find.byType(MaterialApp), matchesGoldenFile('shots/$name.png'));
}

// ---------------------------------------------------------------- ma'lumot

Map<String, dynamic> _product({
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
      'imageUrl': null,
      'category': {
        'slug': 'shoes',
        'name': {'uz': 'Poyabzal', 'ru': 'Обувь', 'en': 'Shoes'},
      },
      'stock': stock,
      'inStock': stock > 0,
    };

final _productsJson = json.encode({
  'items': [
    _product(slug: 'puma-rs-x', nameUz: 'Puma RS-X krossovkalar', price: '990000'),
    _product(
      slug: 'nike-air-max',
      nameUz: 'Nike Air Max',
      price: '700000',
      oldPrice: '1000000',
      brand: 'Nike',
      stock: 3,
    ),
    _product(slug: 'adidas-ultraboost', nameUz: 'Adidas Ultraboost', price: '1250000', brand: 'Adidas'),
    _product(slug: 'reebok-classic', nameUz: 'Reebok Classic Leather', price: '640000', brand: 'Reebok'),
  ],
  'total': 11,
  'page': 1,
  'limit': 24,
  'hasMore': true,
});

const _categoriesJson = '''
{"items":[
  {"id":"c1","slug":"shoes","name":{"uz":"Poyabzal","ru":"Обувь","en":"Shoes"},"iconUrl":null,"productCount":4},
  {"id":"c2","slug":"clothing","name":{"uz":"Kiyim-kechak","ru":"Одежда","en":"Clothing"},"iconUrl":null,"productCount":2},
  {"id":"c3","slug":"beauty","name":{"uz":"Go'zallik","ru":"Красота","en":"Beauty"},"iconUrl":null,"productCount":0}
]}''';

final _detailJson = json.encode({
  'id': _productId,
  'slug': 'nike-air-max',
  'sku': 'NK-AM-90',
  'name': {'uz': 'Nike Air Max 90', 'ru': 'Nike Air Max 90', 'en': 'Nike Air Max 90'},
  'description': {
    'uz': 'Klassik Air Max amortizatsiyasi, nafas oluvchi mesh ustki qism va '
        'kundalik kiyish uchun mustahkam taglik.',
  },
  'shortDescription': {'uz': 'Klassik krossovka, har kunga.'},
  'price': '700000',
  'oldPrice': '1000000',
  'currency': 'UZS',
  'rating': 4.6,
  'reviewCount': 78,
  'soldCount': 156,
  'brand': {'id': 'b1', 'slug': 'nike', 'name': 'Nike'},
  'seller': {'brandName': 'SportLine'},
  'images': <Map<String, dynamic>>[],
  'stock': 3,
  'inStock': true,
  'variants': [
    {'id': 'v1', 'sku': 'NK-41', 'price': '700000', 'color': 'Qora', 'size': '41', 'stock': 2, 'inStock': true},
    {'id': 'v2', 'sku': 'NK-42', 'price': '700000', 'color': 'Qora', 'size': '42', 'stock': 1, 'inStock': true},
    {'id': 'v3', 'sku': 'NK-43', 'price': '700000', 'color': 'Oq', 'size': '43', 'stock': 0, 'inStock': false},
  ],
});

CartStore _cart() => CartStore(storage: InMemoryCartStorage())
  ..add(
    CartLine.fromProduct(
      ProductSummary.fromJson(_product(
        slug: 'nike-air-max',
        nameUz: 'Nike Air Max 90',
        price: '700000',
        oldPrice: '1000000',
        brand: 'Nike',
        stock: 10,
      )),
      quantity: 2,
    ),
  )
  ..add(
    CartLine.fromProduct(
      ProductSummary.fromJson(_product(
        slug: 'puma-rs-x',
        nameUz: 'Puma RS-X krossovkalar',
        price: '990000',
      )),
    ),
  );

Map<String, dynamic> _orderSummary({String status = 'PENDING'}) => {
      'id': _orderId,
      'number': 'ORD-2026-00012345',
      'status': status,
      'grandTotal': '620000',
      'placedAt': '2026-10-03T09:00:00.000Z',
      'deliveredAt': null,
      'deliveryMethod': 'HOME_DELIVERY',
      'paymentReview': false,
      'itemCount': 2,
      'items': [
        {
          'id': 'i1',
          'quantity': 2,
          'nameSnapshot': {'uz': 'Nike Air Max 90'},
          'totalPrice': '600000',
          'slug': 'nike-air-max',
          'imageUrl': null,
        },
      ],
    };

Map<String, dynamic> _orderDetail() => {
      ..._orderSummary(),
      'paymentProvider': 'CASH_ON_DELIVERY',
      'paymentStatus': 'PENDING',
      'subtotal': '600000',
      'shippingTotal': '20000',
      'discountTotal': '0',
      'promoCode': null,
      'notes': null,
      'editable': true,
      'returnable': false,
      'returnWindowDays': 14,
      'shippingAddress': {
        'recipientName': 'Dilnoza Karimova',
        'phone': '+998901234567',
        'region': 'Toshkent',
        'city': 'Yunusobod',
        'street': 'Amir Temur shoh ko\'chasi 1',
        'apartment': '25-uy',
      },
      'pickupPoint': null,
      'items': [
        {
          'id': 'i1',
          'quantity': 2,
          'nameSnapshot': {'uz': 'Nike Air Max 90'},
          'unitPrice': '300000',
          'totalPrice': '600000',
          'slug': 'nike-air-max',
          'imageUrl': null,
        },
      ],
    };

FakeBackend _catalogBackend() => FakeBackend((options, body) {
      if (options.path == '/api/categories') return rawJson(_categoriesJson);
      if (options.path == '/api/products/nike-air-max') return rawJson(_detailJson);
      return rawJson(_productsJson);
    });

FakeBackend _checkoutBackend() => FakeBackend((options, body) {
      switch (options.path) {
        case '/api/payment-cards':
          return apiOk({
            'cards': <Map<String, dynamic>>[],
            'providers': ['CLICK', 'PAYME', 'CASH_ON_DELIVERY'],
          });
        case '/api/auth/me':
          return apiOk({
            'user': userJson(roles: ['CUSTOMER']),
          });
        case '/api/addresses':
          return apiOk({'items': <Map<String, dynamic>>[]});
      }
      return apiErr(500, 'UNEXPECTED', options.path);
    });

Map<String, dynamic> _me() => {
      'id': '11111111-1111-4111-8111-111111111111',
      'email': 'dilnoza@sellobay.uz',
      'phone': '+998901234567',
      'firstName': 'Dilnoza',
      'lastName': 'Karimova',
      'avatarUrl': null,
      'locale': 'uz',
      'status': 'ACTIVE',
      'loyaltyPoints': 340,
      'roles': ['CUSTOMER'],
    };

FakeBackend _profileBackend() => FakeBackend((options, body) {
      if (options.path == '/api/auth/login') {
        return apiOk({'user': _me(), 'tokens': tokenPair('1')});
      }
      if (options.path == '/api/auth/me') return apiOk({'user': _me()});
      if (options.path == '/api/categories') return rawJson(_categoriesJson);
      if (options.path == '/api/cart') {
        return apiOk({'cartId': 'c1', 'items': <Map<String, dynamic>>[]});
      }
      return rawJson(_productsJson);
    });

FakeBackend _wishlistBackend() => FakeBackend((options, body) {
      if (options.path == '/api/wishlist') {
        return apiOk({'productIds': ['puma-rs-x', 'nike-air-max']});
      }
      return rawJson(_productsJson);
    });

FakeBackend _addressesBackend() => FakeBackend((options, body) => apiOk({
      'items': [
        {
          'id': 'a1',
          'label': 'Uy',
          'type': 'HOME',
          'recipientName': 'Dilnoza Karimova',
          'phone': '+998901234567',
          'region': 'Toshkent',
          'city': 'Yunusobod',
          'street': "Amir Temur shoh ko'chasi 1",
          'apartment': '25-uy',
          'isDefault': true,
        },
        {
          'id': 'a2',
          'label': 'Ish',
          'type': 'WORK',
          'recipientName': 'Dilnoza Karimova',
          'phone': '+998901234567',
          'region': 'Toshkent',
          'city': 'Chilonzor',
          'street': 'Bunyodkor 12',
          'apartment': null,
          'isDefault': false,
        },
      ],
    }));

FakeBackend _ordersBackend() => FakeBackend((options, body) {
      if (options.path == '/api/orders') {
        return rawJson(json.encode({
          'success': true,
          'data': {
            'items': [
              _orderSummary(),
              _orderSummary(status: 'DELIVERED'),
            ],
          },
        }));
      }
      if (options.path == '/api/orders/$_orderId') {
        return apiOk({'order': _orderDetail()});
      }
      return apiErr(500, 'UNEXPECTED', options.path);
    });

// ---------------------------------------------------------------- suratlar

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await loadRealFonts();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('01 kirish', (t) => shoot(t, '01-login', const LoginScreen()));

  testWidgets(
    '02 sms kod',
    (t) => shoot(
      t,
      '02-otp',
      const OtpScreen(
        challenge: OtpChallenge(phone: '+998901234567', expiresInSec: 120, resendAfterSec: 60),
      ),
    ),
  );

  testWidgets('03 ro`yxatdan o`tish', (t) => shoot(t, '03-register', const RegisterScreen()));

  testWidgets(
    '04 katalog',
    (t) => shootTab(t, '04-catalog', HomeTab.catalog, backend: _catalogBackend(), cart: _cart()),
  );

  testWidgets(
    '05 mahsulot',
    (t) => shoot(
      t,
      '05-product',
      const ProductScreen(slug: 'nike-air-max'),
      backend: _catalogBackend(),
    ),
  );

  testWidgets(
    '06 savat',
    (t) => shootTab(t, '06-cart', HomeTab.cart, backend: _catalogBackend(), cart: _cart()),
  );

  testWidgets(
    '07 rasmiylashtirish',
    (t) => shoot(t, '07-checkout', const CheckoutScreen(), backend: _checkoutBackend(), cart: _cart()),
  );

  testWidgets(
    '08 buyurtma qabul qilindi',
    (t) => shoot(
      t,
      '08-order-success',
      OrderSuccessScreen(
        order: PlacedOrder.fromJson({
          'order': {
            'id': _orderId,
            'number': 'ORD-2026-00012345',
            'status': 'PENDING',
            'grandTotal': '620000',
            'coinsEarned': 620,
            'coinsRedeemed': 0,
            'appliedPromoCode': null,
          },
        }),
      ),
    ),
  );

  testWidgets(
    '09 buyurtmalar',
    (t) => shootTab(t, '09-orders', HomeTab.orders, backend: _ordersBackend()),
  );

  testWidgets(
    '13 sevimlilar',
    (t) => shoot(t, '13-wishlist', const WishlistScreen(), backend: _wishlistBackend()),
  );

  testWidgets(
    '12 manzillar',
    (t) => shoot(t, '12-addresses', const AddressesScreen(), backend: _addressesBackend()),
  );

  testWidgets(
    '11 profil',
    (t) => shootTab(t, '11-profile', HomeTab.profile, backend: _profileBackend(), signIn: true),
  );

  testWidgets(
    '10 buyurtma detali',
    (t) => shoot(
      t,
      '10-order-detail',
      const OrderDetailScreen(orderId: _orderId),
      backend: _ordersBackend(),
    ),
  );
}
