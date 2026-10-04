import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

Map<String, dynamic> _review({
  String id = 'r1',
  int rating = 5,
  String? title,
  String? body = 'Zo`r mahsulot',
  String author = 'Dilnoza K.',
  bool verified = true,
}) =>
    {
      'id': id,
      'rating': rating,
      'title': title,
      'body': body,
      'images': <String>[],
      'isVerifiedPurchase': verified,
      'helpfulCount': 0,
      'createdAt': '2026-10-04T08:00:00.000Z',
      'author': author,
      'userId': 'u1',
    };

void main() {
  group('ReviewsRepository', () {
    test('ro`yxat va huquq bitta javobda keladi', () async {
      // Ikkita so'rov qilsak, tugma holati ro'yxatdan kechikib
      // kelardi.
      final backend = FakeBackend(
        (options, body) => apiOk({
          'items': [_review()],
          'total': 1,
          'page': 1,
          'limit': 10,
          'hasMore': false,
          'eligibility': {
            'canReview': true,
            'hasPurchased': true,
            'existingReviewId': null,
          },
        }),
      );

      final page = await ReviewsRepository(buildClient(backend).api)
          .fetchForProduct('nike-air-max', limit: 10);

      expect(backend.calls, ['/api/products/nike-air-max/reviews']);
      expect(backend.queries.single, {'page': '1', 'limit': '10'});
      expect(page.items.single.author, 'Dilnoza K.');
      expect(page.items.single.isVerifiedPurchase, isTrue);
      expect(page.eligibility!.canReview, isTrue);
    });

    test('mehmonda huquq `null` — tugma haqida gap yo`q', () async {
      final backend = FakeBackend(
        (options, body) => apiOk({
          'items': <Map<String, dynamic>>[],
          'total': 0,
          'hasMore': false,
          'eligibility': null,
        }),
      );

      final page = await ReviewsRepository(buildClient(backend).api).fetchForProduct('x');

      expect(page.eligibility, isNull);
      expect(page.items, isEmpty);
    });

    test('yozish — bo`sh matn `null` bo`lib ketadi', () async {
      // Bo'sh satr saqlansa, sharhda bo'sh sarlavha turardi.
      final backend = FakeBackend((options, body) => apiOk({'review': _review()}));
      final repo = ReviewsRepository(buildClient(backend).api);

      await repo.create(productId: 'p1', rating: 5, title: '   ', body: '');

      final sent = backend.bodies.single!;
      expect(sent['productId'], 'p1');
      expect(sent['rating'], 5);
      expect(sent['title'], isNull);
      expect(sent['body'], isNull);
    });

    test('sotib olmagan — serverning matni', () async {
      final backend = FakeBackend(
        (options, body) => apiErr(
          403,
          'NOT_PURCHASED',
          'Sharh yozish uchun mahsulotni sotib olgan bo`lishingiz kerak',
        ),
      );

      await expectLater(
        ReviewsRepository(buildClient(backend).api).create(productId: 'p1', rating: 5),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'NOT_PURCHASED')),
      );
    });

    test('ikkinchi sharh — 409', () async {
      final backend = FakeBackend(
        (options, body) => apiErr(409, 'ALREADY_REVIEWED', 'Allaqachon yozgansiz'),
      );

      await expectLater(
        ReviewsRepository(buildClient(backend).api).create(productId: 'p1', rating: 4),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 409)),
      );
    });

    test('o`chirish', () async {
      final backend = FakeBackend((options, body) => apiOk({'deleted': true}));

      await ReviewsRepository(buildClient(backend).api).delete('r1');

      expect(backend.calls, ['/api/reviews/r1']);
    });

    test('o`z sharhlarim', () async {
      final backend = FakeBackend(
        (options, body) => apiOk({
          'items': [_review(), _review(id: 'r2', rating: 3)],
        }),
      );

      final items = await ReviewsRepository(buildClient(backend).api).fetchMine();

      expect(backend.calls, ['/api/reviews/mine']);
      expect(items, hasLength(2));
      expect(items.last.rating, 3);
    });
  });

  group('ProductReview', () {
    test('maydonlar yo`q bo`lsa ilova yiqilmaydi', () async {
      final backend = FakeBackend(
        (options, body) => apiOk({
          'items': [
            {'id': 'r1', 'createdAt': ''},
          ],
          'total': 1,
        }),
      );

      final page = await ReviewsRepository(buildClient(backend).api).fetchForProduct('x');
      final review = page.items.single;

      expect(review.rating, 0);
      expect(review.author, '');
      expect(review.createdAt, isNull);
      expect(review.isVerifiedPurchase, isFalse);
    });
  });
}
