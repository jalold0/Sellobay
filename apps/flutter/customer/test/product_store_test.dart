import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/home_tabs.dart';
import 'package:sellobay_customer/src/screens/product_screen.dart';
import 'package:sellobay_customer/src/screens/review_form_screen.dart';
import 'package:sellobay_customer/src/widgets/review_photos.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

const _productId = '11111111-1111-4111-8111-111111111111';
const _sellerId = '22222222-2222-4222-8222-222222222222';

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

Future<void> settleRoute(WidgetTester tester) async {
  await settle(tester);
  await tester.pump(const Duration(milliseconds: 400));
  await settle(tester);
}

final _detailJson = json.encode({
  'id': _productId,
  'slug': 'nike-air-max',
  'sku': 'NK-1',
  'name': {'uz': 'Nike Air Max'},
  'description': {'uz': 'Klassik krossovka'},
  'shortDescription': {'uz': ''},
  'price': '700000',
  'oldPrice': null,
  'currency': 'UZS',
  'rating': 4.5,
  'reviewCount': 2,
  'soldCount': 10,
  'brand': {'id': 'b1', 'slug': 'nike', 'name': 'Nike'},
  'seller': {
    'id': _sellerId,
    'brandName': 'Nike Store',
    'rating': 4.7,
    'logoUrl': null,
    'productCount': 12,
  },
  'categories': [
    {'slug': 'erkaklar-poyabzal', 'name': {'uz': 'Poyabzal'}},
  ],
  'images': <Map<String, dynamic>>[],
  'stock': 5,
  'inStock': true,
  'variants': <Map<String, dynamic>>[],
});

Map<String, dynamic> _other(String slug, String store, double rating) => {
      'id': slug,
      'slug': slug,
      'sku': slug,
      'name': {'uz': slug},
      'price': '500000',
      'oldPrice': null,
      'currency': 'UZS',
      'rating': 4.0,
      'reviewCount': 1,
      'soldCount': 1,
      'isFeatured': false,
      'brand': null,
      'seller': {'id': 'x-$slug', 'brandName': store, 'rating': rating},
      'imageUrl': null,
      'category': null,
      'stock': 3,
      'inStock': true,
    };

Map<String, dynamic> _review(String id, int rating, {List<String> images = const []}) => {
      'id': id,
      'rating': rating,
      'title': null,
      'body': 'Matn $id',
      'images': images,
      'isVerifiedPurchase': true,
      'helpfulCount': 0,
      'createdAt': '2026-10-04T08:00:00.000Z',
      'author': 'Dilnoza K.',
      'userId': 'someone',
    };

FakeBackend _backend() => FakeBackend((options, body) {
      switch (options.path) {
        case '/api/products/nike-air-max':
          return okJson(_detailJson);
        case '/api/products':
          return okJson(json.encode({
            'items': [_other('adidas-x', 'Adidas Rasmiy', 4.9), _other('puma-y', 'Puma Uz', 4.2)],
            'total': 2,
            'page': 1,
            'limit': 8,
            'hasMore': false,
          }));
        case '/api/products/nike-air-max/reviews':
          final q = options.queryParameters;
          final all = [
            _review('r1', 5, images: ['https://x.public.blob.vercel-storage.com/reviews/a.jpg']),
            _review('r2', 3),
          ];
          final items = q['withPhotos'] == '1'
              ? all.where((r) => (r['images'] as List).isNotEmpty).toList()
              : q['rating'] != null
                  ? all.where((r) => '${r['rating']}' == q['rating']).toList()
                  : all;
          return apiOk({
            'items': items,
            'total': items.length,
            'page': 1,
            'limit': 10,
            'hasMore': false,
            'eligibility': null,
            'summary': q['page'] == '1'
                ? {
                    'total': 2,
                    'average': 4.0,
                    'breakdown': {'1': 0, '2': 0, '3': 1, '4': 0, '5': 1},
                    'withPhotos': 1,
                  }
                : null,
          });
      }
      return apiErr(500, 'UNEXPECTED', options.path);
    });

Future<HomeTabsController> pumpProduct(WidgetTester tester, FakeBackend backend) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final tabs = HomeTabsController();
  await tester.pumpWidget(
    SellobayScope(
      runtime: buildRuntime(backend, locale: uz),
      child: HomeTabsScope(
        controller: tabs,
        child: MaterialApp(
          theme: buildSellobayTheme(),
          home: const ProductScreen(slug: 'nike-air-max'),
        ),
      ),
    ),
  );
  await settle(tester);
  return tabs;
}

Future<void> scrollTo(WidgetTester tester, Finder target) async {
  await tester.scrollUntilVisible(
    target,
    240,
    scrollable: find.byType(Scrollable).first,
    maxScrolls: 40,
  );
  await settle(tester);
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('do`kon bloki: nom, baho, tovarlar soni', (tester) async {
    await pumpProduct(tester, _backend());
    await scrollTo(tester, find.text('Nike Store'));

    expect(find.text('Nike Store'), findsOneWidget);
    expect(find.text('4.7'), findsOneWidget);
    expect(find.text('12 ta tovar'), findsOneWidget);
  });

  testWidgets('do`konga o`tish — katalog shu do`kon filtri bilan', (tester) async {
    final tabs = await pumpProduct(tester, _backend());
    await scrollTo(tester, find.text('Nike Store'));

    await tester.tap(find.text('Nike Store'));
    await settle(tester);

    expect(tabs.tab, HomeTab.catalog);
    final query = tabs.takePendingCatalog();
    expect(query?.sellerId, _sellerId);
    expect(query?.sellerName, 'Nike Store');
  });

  testWidgets('boshqa do`konlar: so`rov shu do`konni chiqarib, reyting bo`yicha', (tester) async {
    final backend = _backend();
    await pumpProduct(tester, backend);

    final q = backend.queries[backend.calls.indexOf('/api/products')];
    expect(q?['excludeSeller'], _sellerId);
    expect(q?['excludeId'], _productId);
    expect(q?['sort'], 'seller-rating');
    expect(q?['category'], 'erkaklar-poyabzal');

    await scrollTo(tester, find.text('Adidas Rasmiy'));
    expect(find.text('Boshqa do‘konlarda'), findsOneWidget);
    expect(find.text('Adidas Rasmiy'), findsOneWidget);
    expect(find.text('4.9'), findsOneWidget);
  });

  testWidgets('barcha sharhlar: xulosa, filtr va suratlar', (tester) async {
    tester.view
      ..physicalSize = const Size(390 * 3, 844 * 3)
      ..devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final backend = _backend();
    await tester.pumpWidget(
      SellobayScope(
        runtime: buildRuntime(backend, locale: uz),
        child: MaterialApp(
          theme: buildSellobayTheme(),
          home: const ReviewsScreen(slug: 'nike-air-max', productName: 'Nike Air Max'),
        ),
      ),
    );
    await settle(tester);

    expect(find.text('4.0'), findsOneWidget);
    expect(find.text('Matn r1'), findsOneWidget);
    expect(find.text('Matn r2'), findsOneWidget);
    expect(find.byType(ReviewPhotoStrip), findsOneWidget);

    await tester.tap(find.text('Suratli (1)'));
    await settle(tester);

    expect(backend.queries.last?['withPhotos'], '1');
    expect(find.text('Matn r2'), findsNothing);
    expect(find.text('Matn r1'), findsOneWidget);
  });
}
