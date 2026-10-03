import 'dart:convert';

import 'package:decimal/decimal.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

ProductSummary _product(String id, {String price = '100000', String slug = 'mahsulot'}) =>
    ProductSummary.fromJson({
      'id': id,
      'slug': slug,
      'sku': 'SKU',
      'name': {'uz': 'Mahsulot $slug'},
      'price': price,
      'oldPrice': null,
      'currency': 'UZS',
      'rating': 4.0,
      'reviewCount': 1,
      'soldCount': 1,
      'isFeatured': false,
      'brand': {'id': 'b', 'slug': 'puma', 'name': 'Puma'},
      'imageUrl': null,
      'category': null,
      'stock': 10,
      'inStock': true,
    });

const _uuidA = '11111111-1111-4111-8111-111111111111';
const _uuidB = '22222222-2222-4222-8222-222222222222';

String _serverCart(List<Map<String, dynamic>> items) =>
    json.encode({'success': true, 'data': {'cartId': 'c1', 'items': items}});

Map<String, dynamic> _serverItem(String productId, int quantity,
        {String? variantId, String unitPrice = '100000'}) =>
    {
      'productId': productId,
      'variantId': variantId,
      'quantity': quantity,
      'unitPrice': unitPrice,
    };

void main() {
  group('CartStore', () {
    late CartStore cart;

    setUp(() => cart = CartStore(storage: InMemoryCartStorage()));

    test('bir xil mahsulot+variant QO`SHILADI, yangi satr ochilmaydi', () {
      cart.add(CartLine.fromProduct(_product(_uuidA), variantId: 'v1'));
      cart.add(CartLine.fromProduct(_product(_uuidA), variantId: 'v1', quantity: 2));

      expect(cart.lineCount, 1);
      expect(cart.lines.single.quantity, 3);
      expect(cart.unitCount, 3);
    });

    test('boshqa variant — ALOHIDA satr', () {
      cart.add(CartLine.fromProduct(_product(_uuidA), variantId: 'v1'));
      cart.add(CartLine.fromProduct(_product(_uuidA), variantId: 'v2'));

      expect(cart.lineCount, 2);
    });

    test('kalit server bilgan juftlik — `productId|variantId`', () {
      // Mahalliy kalit kengroq bo'lsa (masalan rang qo'shilsa), sinxrondan
      // keyin bitta server satri ikkita mahalliy satrga tushib, sonlar
      // ikki barobar bo'lardi.
      final line = CartLine.fromProduct(_product(_uuidA), variantId: 'v1', color: 'Qora');
      expect(line.key, '$_uuidA|v1');
    });

    test('summa Decimal ustida hisoblanadi', () {
      cart.add(CartLine.fromProduct(_product(_uuidA, price: '990000'), quantity: 3));
      cart.add(CartLine.fromProduct(_product(_uuidB, price: '285000')));

      expect(cart.subtotal, Decimal.parse('3255000'));
      expect(formatMoney(cart.subtotal), "3 255 000 so'm");
    });

    test('son 0 bo`lsa satr o`chadi, 999 dan oshmaydi', () {
      cart.add(CartLine.fromProduct(_product(_uuidA)));
      final key = cart.lines.single.key;

      cart.setQuantity(key, 1500);
      expect(cart.lines.single.quantity, 999); // server chegarasi

      cart.setQuantity(key, 0);
      expect(cart.isEmpty, isTrue);
    });

    test('saqlanadi va qayta o`qiladi', () async {
      final storage = InMemoryCartStorage();
      final first = CartStore(storage: storage);
      first.add(CartLine.fromProduct(_product(_uuidA, price: '990000'), quantity: 2));
      // `_persist` fon vazifasi — navbat bo'shashini kutamiz.
      await Future<void>.delayed(Duration.zero);

      final second = CartStore(storage: storage);
      await second.load();

      expect(second.lineCount, 1);
      expect(second.lines.single.quantity, 2);
      expect(second.lines.single.unitPrice, Decimal.parse('990000'));
      expect(second.lines.single.name.pick('uz'), 'Mahsulot mahsulot');
    });
  });

  group('CartSync', () {
    late CartStore cart;
    late AuthController auth;
    late CartSync sync;
    late FakeBackend backend;
    late MemorySessionStore store;

    /// Kirgan holatdagi sinxron.
    Future<void> setUpSignedIn(FakeBackend fake) async {
      backend = fake;
      final client = buildClient(fake);
      store = client.store;
      cart = CartStore(storage: InMemoryCartStorage());
      auth = AuthController(repository: client.repo);
      sync = CartSync(
        auth: auth,
        cart: cart,
        repository: CartRepository(client.api),
        catalog: CatalogRepository(client.api),
        debounce: const Duration(milliseconds: 10),
      )..start();
      await store.save(access: 'a', refresh: 'r');
    }

    tearDown(() => sync.dispose());

    test('kirishda `merge`, keyin `replace`', () async {
      await setUpSignedIn(
        FakeBackend((options, body) {
          if (options.path == '/api/auth/me') {
            return apiOk({'user': userJson(roles: ['CUSTOMER'])});
          }
          return rawJson(_serverCart([_serverItem(_uuidA, 1)]));
        }),
      );
      cart.add(CartLine.fromProduct(_product(_uuidA), quantity: 1));

      await auth.restore();
      await Future<void>.delayed(const Duration(milliseconds: 50));

      final cartCalls = backend.bodies.indexed
          .where((e) => backend.calls[e.$1] == '/api/cart')
          .map((e) => e.$2!['strategy'])
          .toList();
      expect(cartCalls.first, 'merge');
      // Server 1 dedi — mahalliy son shunga tenglashadi.
      expect(cart.lines.single.quantity, 1);
    });

    test('FAQAT serverda bor satr tiklanadi (boshqa qurilma)', () async {
      // Eng muhim tekshiruv. Tiklamasak, keyingi `replace` uni serverdan
      // ham o'chirib tashlaydi — boshqa qurilmadagi savat yo'qoladi.
      await setUpSignedIn(
        FakeBackend((options, body) {
          switch (options.path) {
            case '/api/auth/me':
              return apiOk({'user': userJson(roles: ['CUSTOMER'])});
            case '/api/products':
              return rawJson(json.encode({
                'items': [
                  {
                    ..._productJson(_uuidB, 'nike-air'),
                  },
                ],
                'total': 1,
                'page': 1,
                'limit': 1,
                'hasMore': false,
              }));
            default:
              return rawJson(_serverCart([
                _serverItem(_uuidA, 2),
                _serverItem(_uuidB, 5, unitPrice: '250000'),
              ]));
          }
        }),
      );
      cart.add(CartLine.fromProduct(_product(_uuidA), quantity: 2));

      await auth.restore();
      await Future<void>.delayed(const Duration(milliseconds: 60));

      expect(cart.lineCount, 2);
      final restored = cart.lines.firstWhere((l) => l.productId == _uuidB);
      expect(restored.quantity, 5);
      // Narx serverdagi snapshot, katalogdagi joriy narx emas.
      expect(restored.unitPrice, Decimal.parse('250000'));
      expect(restored.name.pick('uz'), 'Mahsulot nike-air');
    });

    test('katalogdan topilmagan mahsulot qo`shilmaydi', () async {
      // O'chirilgan yoki sotuvdan olingan tovar savatga tiklanmasin.
      await setUpSignedIn(
        FakeBackend((options, body) {
          switch (options.path) {
            case '/api/auth/me':
              return apiOk({'user': userJson(roles: ['CUSTOMER'])});
            case '/api/products':
              return rawJson(json.encode(
                  {'items': [], 'total': 0, 'page': 1, 'limit': 1, 'hasMore': false}));
            default:
              return rawJson(_serverCart([_serverItem(_uuidB, 5)]));
          }
        }),
      );

      await auth.restore();
      await Future<void>.delayed(const Duration(milliseconds: 60));

      expect(cart.isEmpty, isTrue);
    });

    test('serverda yo`q satr mahalliy savatdan ham o`chadi', () async {
      await setUpSignedIn(
        FakeBackend((options, body) {
          if (options.path == '/api/auth/me') {
            return apiOk({'user': userJson(roles: ['CUSTOMER'])});
          }
          // Server bo'sh savat qaytardi — boshqa qurilmada tozalangan.
          return rawJson(_serverCart(const []));
        }),
      );
      cart.add(CartLine.fromProduct(_product(_uuidA)));

      await auth.restore();
      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(cart.isEmpty, isTrue);
    });

    test('o`zgarish debounce bilan `replace` qilib yuboriladi', () async {
      await setUpSignedIn(
        FakeBackend((options, body) {
          if (options.path == '/api/auth/me') {
            return apiOk({'user': userJson(roles: ['CUSTOMER'])});
          }
          return rawJson(_serverCart(const []));
        }),
      );
      await auth.restore();
      await Future<void>.delayed(const Duration(milliseconds: 50));
      final before = backend.countOf('/api/cart');

      cart.add(CartLine.fromProduct(_product(_uuidA)));
      cart.add(CartLine.fromProduct(_product(_uuidB)));
      // Ikki o'zgarish — bitta so'rov.
      await Future<void>.delayed(const Duration(milliseconds: 60));

      expect(backend.countOf('/api/cart'), before + 1);
      final last = backend.bodies.last!;
      expect(last['strategy'], 'replace');
      expect((last['items'] as List).length, 2);
    });

    test('kirilmagan bo`lsa serverga UMUMAN murojaat qilinmaydi', () async {
      await setUpSignedIn(FakeBackend((options, body) => rawJson(_serverCart(const []))));
      await store.clear(); // sessiya yo'q

      cart.add(CartLine.fromProduct(_product(_uuidA)));
      await Future<void>.delayed(const Duration(milliseconds: 60));

      expect(backend.calls, isEmpty);
      // Savat mahalliy saqlanadi — mehmon xaridi uchun shart.
      expect(cart.lineCount, 1);
    });

    test('tarmoq yo`q — savat tegilmaydi', () async {
      await setUpSignedIn(
        FakeBackend((options, body) {
          if (options.path == '/api/auth/me') {
            return apiOk({'user': userJson(roles: ['CUSTOMER'])});
          }
          return offline(options);
        }),
      );
      cart.add(CartLine.fromProduct(_product(_uuidA), quantity: 4));

      await auth.restore();
      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(cart.lines.single.quantity, 4);
      expect(sync.lastError, isA<NetworkException>());
    });
  });

  group('computeCartTotals', () {
    late CartStore cart;

    setUp(() => cart = CartStore(storage: InMemoryCartStorage()));

    test('qoidalar yo`q — yetkazish KO`RSATILMAYDI, taxmin qilinmaydi', () {
      cart.add(CartLine.fromProduct(_product(_uuidA, price: '100000')));
      final totals = computeCartTotals(cart, null);

      expect(totals.shippingFee, isNull);
      expect(totals.total, totals.subtotal);
      expect(totals.amountToFreeShipping, isNull);
    });

    test('chegaradan past — standart narx va yetmagan summa', () {
      // Haqiqiy qoida: standartFee 20000, freeThreshold 500000.
      cart.add(CartLine.fromProduct(_product(_uuidA, price: '300000')));
      final totals = computeCartTotals(cart, testConfig());

      expect(totals.shippingFee, 20000);
      expect(totals.total, Decimal.parse('320000'));
      expect(totals.amountToFreeShipping, Decimal.parse('200000'));
      expect(totals.isFreeShipping, isFalse);
    });

    test('chegaradan yuqori — bepul', () {
      cart.add(CartLine.fromProduct(_product(_uuidA, price: '300000'), quantity: 2));
      final totals = computeCartTotals(cart, testConfig());

      expect(totals.shippingFee, 0);
      expect(totals.isFreeShipping, isTrue);
      expect(totals.total, Decimal.parse('600000'));
      expect(totals.amountToFreeShipping, isNull);
    });

    test('roppa-rosa chegarada — bepul', () {
      cart.add(CartLine.fromProduct(_product(_uuidA, price: '500000')));
      final totals = computeCartTotals(cart, testConfig());

      expect(totals.isFreeShipping, isTrue);
    });
  });

  group('fetchProductsByIds', () {
    test('`scope` YUBORILMAYDI — global tovar yo`qolmasin', () async {
      // Server: id bo'yicha so'ralganda qamrov filtri qo'llanmaydi,
      // LEKIN `?scope=` aniq berilsa hurmat qilinadi. `scope=LOCAL`
      // qo'shsak, savatdagi global tovar javobga tushmay qolardi.
      final backend = FakeBackend((options, body) => rawJson(
          json.encode({'items': [], 'total': 0, 'page': 1, 'limit': 2, 'hasMore': false})));
      final repo = CatalogRepository(buildClient(backend).api);

      await repo.fetchProductsByIds([_uuidA, _uuidB, _uuidA]);

      final query = backend.queries.single!;
      expect(query.containsKey('scope'), isFalse);
      // Takrorlar olib tashlanadi va `limit` id'lar soniga teng
      // (standart 24 ta uzun savatni qirqib qo'yardi).
      expect(query['ids'], '$_uuidA,$_uuidB');
      expect(query['limit'], '2');
    });

    test('bo`sh ro`yxat — so`rov yuborilmaydi', () async {
      final backend = FakeBackend((options, body) => rawJson('{}'));
      final repo = CatalogRepository(buildClient(backend).api);

      expect(await repo.fetchProductsByIds(const []), isEmpty);
      expect(backend.calls, isEmpty);
    });
  });
}

Map<String, dynamic> _productJson(String id, String slug) => {
      'id': id,
      'slug': slug,
      'sku': 'SKU',
      'name': {'uz': 'Mahsulot $slug'},
      'price': '300000',
      'oldPrice': null,
      'currency': 'UZS',
      'rating': 4.0,
      'reviewCount': 1,
      'soldCount': 1,
      'isFeatured': false,
      'brand': {'id': 'b', 'slug': 'nike', 'name': 'Nike'},
      'imageUrl': null,
      'category': null,
      'stock': 10,
      'inStock': true,
    };
