import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/screens/product_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

const _productId = '11111111-1111-4111-8111-111111111111';

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
  'shortDescription': {'uz': 'Har kunga'},
  'price': '700000',
  'oldPrice': null,
  'currency': 'UZS',
  'rating': 4.5,
  'reviewCount': 2,
  'soldCount': 10,
  'brand': {'id': 'b1', 'slug': 'nike', 'name': 'Nike'},
  'seller': null,
  'images': <Map<String, dynamic>>[],
  'stock': 5,
  'inStock': true,
  'variants': <Map<String, dynamic>>[],
});

Map<String, dynamic> _review({
  String id = 'r1',
  int rating = 5,
  String author = 'Dilnoza K.',
  String userId = 'someone',
  String? body = 'Juda yoqdi',
}) =>
    {
      'id': id,
      'rating': rating,
      'title': null,
      'body': body,
      'images': <String>[],
      'isVerifiedPurchase': true,
      'helpfulCount': 0,
      'createdAt': '2026-10-04T08:00:00.000Z',
      'author': author,
      'userId': userId,
    };

FakeBackend _backend({
  List<Map<String, dynamic>>? reviews,
  Map<String, dynamic>? eligibility,
  int? total,
  ResponseBody Function(Map<String, dynamic>? body)? create,
}) =>
    FakeBackend((options, body) {
      if (options.path == '/api/products/nike-air-max/reviews') {
        final items = reviews ?? [_review()];
        return apiOk({
          'items': items,
          'total': total ?? items.length,
          'page': 1,
          'limit': 3,
          'hasMore': (total ?? items.length) > items.length,
          'eligibility': eligibility,
        });
      }
      if (options.path == '/api/reviews') {
        return create?.call(body) ?? apiOk({'review': _review(id: 'new', userId: 'me')});
      }
      if (options.path == '/api/products/nike-air-max') return rawJson(_detailJson);
      return apiErr(500, 'UNEXPECTED', options.path);
    });

Future<void> pumpProduct(WidgetTester tester, FakeBackend backend) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(backend, locale: uz);
  await tester.pumpWidget(
    SellobayScope(
      runtime: runtime,
      child: MaterialApp(
        theme: buildSellobayTheme(),
        home: const ProductScreen(slug: 'nike-air-max'),
      ),
    ),
  );
  await settle(tester);
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

  testWidgets('sharhlar ko`rsatiladi', (tester) async {
    await pumpProduct(tester, _backend());
    await scrollTo(tester, find.text('Juda yoqdi'));

    expect(find.text('Dilnoza K.'), findsOneWidget);
    expect(find.text('Tasdiqlangan xarid'), findsOneWidget);
  });

  testWidgets('sharh yo`q — TO`QIMA sharh chiqmaydi', (tester) async {
    await pumpProduct(tester, _backend(reviews: const []));
    await scrollTo(tester, find.textContaining('hali sharh qoldirilmagan'));

    expect(find.text('Tasdiqlangan xarid'), findsNothing);
  });

  testWidgets('tugma FAQAT server ruxsat berganda', (tester) async {
    // Qoida (xarid yetkazilganmi) serverda — klient hisoblamaydi.
    await pumpProduct(
      tester,
      _backend(
        eligibility: const {'canReview': true, 'hasPurchased': true, 'existingReviewId': null},
      ),
    );
    await scrollTo(tester, find.text('Sharh yozish'));

    expect(find.text('Sharh yozish'), findsOneWidget);
  });

  testWidgets('sotib olmaganda tugma YO`Q', (tester) async {
    await pumpProduct(
      tester,
      _backend(
        eligibility: const {'canReview': false, 'hasPurchased': false, 'existingReviewId': null},
      ),
    );
    await scrollTo(tester, find.text('Juda yoqdi'));

    expect(find.text('Sharh yozish'), findsNothing);
  });

  testWidgets('allaqachon yozgan — tugma o`rniga izoh', (tester) async {
    await pumpProduct(
      tester,
      _backend(
        eligibility: const {'canReview': false, 'hasPurchased': true, 'existingReviewId': 'r9'},
      ),
    );
    await scrollTo(tester, find.text('Siz bu mahsulotga sharh yozgansiz'));

    expect(find.text('Sharh yozish'), findsNothing);
  });

  testWidgets('mehmonda huquq haqida gap yo`q', (tester) async {
    await pumpProduct(tester, _backend());
    await scrollTo(tester, find.text('Juda yoqdi'));

    expect(find.text('Sharh yozish'), findsNothing);
    expect(find.text('Siz bu mahsulotga sharh yozgansiz'), findsNothing);
  });

  group('sharh formasi', () {
    Future<void> openForm(WidgetTester tester, FakeBackend backend) async {
      await pumpProduct(tester, backend);
      await scrollTo(tester, find.text('Sharh yozish'));
      await tester.tap(find.text('Sharh yozish'));
      await settleRoute(tester);
    }

    FakeBackend eligible({ResponseBody Function(Map<String, dynamic>? body)? create}) => _backend(
          eligibility: const {
            'canReview': true,
            'hasPurchased': true,
            'existingReviewId': null,
          },
          create: create,
        );

    testWidgets('bahosiz yuborilmaydi', (tester) async {
      final backend = eligible();
      await openForm(tester, backend);

      await tester.tap(find.widgetWithText(FilledButton, 'Yuborish'));
      await settle(tester);

      expect(find.text('Bahoni tanlang'), findsOneWidget);
      expect(backend.countOf('/api/reviews'), 0);
    });

    testWidgets('baho va matn yuboriladi', (tester) async {
      final backend = eligible();
      await openForm(tester, backend);

      // To'rtinchi yulduzcha.
      await tester.tap(find.byIcon(Icons.star_outline_rounded).at(3));
      await settle(tester);
      await tester.enterText(
        find.widgetWithText(TextField, 'Fikringiz (ixtiyoriy)'),
        'Yaxshi krossovka',
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Yuborish'));
      await settleRoute(tester);

      final sent = backend.bodies.whereType<Map<String, dynamic>>().last;
      expect(sent['rating'], 4);
      expect(sent['body'], 'Yaxshi krossovka');
      expect(sent['productId'], _productId);
    });

    testWidgets('server rad etsa forma YOPILMAYDI', (tester) async {
      final backend = eligible(
        create: (_) => apiErr(403, 'NOT_PURCHASED', 'Avval sotib oling'),
      );
      await openForm(tester, backend);

      await tester.tap(find.byIcon(Icons.star_outline_rounded).at(4));
      await settle(tester);
      await tester.tap(find.widgetWithText(FilledButton, 'Yuborish'));
      await settleRoute(tester);

      expect(find.text('Avval sotib oling'), findsOneWidget);
      expect(find.text('Bahoyingiz'), findsOneWidget);
    });

    testWidgets('yuborilgach mahsulot QAYTA o`qiladi', (tester) async {
      // Server bahoni qayta hisoblaydi — eski yulduzcha turib
      // qolmasligi kerak.
      final backend = eligible();
      await openForm(tester, backend);

      await tester.tap(find.byIcon(Icons.star_outline_rounded).at(4));
      await settle(tester);
      await tester.tap(find.widgetWithText(FilledButton, 'Yuborish'));
      await settleRoute(tester);

      expect(backend.countOf('/api/products/nike-air-max'), 2);
    });
  });
}
