import 'dart:convert';

import 'package:decimal/decimal.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

/// `GET /api/products?limit=3` ning HAQIQIY javobi (2026-10-03, lokal
/// dev server). Qo'lda yozilmagan — shuning uchun server shakli
/// o'zgarsa test yiqiladi, ilova emas.
const _realProductsResponse = '''
{
  "items": [
    {
      "id": "6a592443-ad1d-4c96-b736-1315d75d3139",
      "slug": "puma-rs-x-sneakers",
      "sku": "PM-RSX-001",
      "name": { "en": "Puma RS-X Sneakers", "ru": "Puma RS-X", "uz": "Puma RS-X krossovkalar" },
      "price": "990000",
      "oldPrice": null,
      "currency": "UZS",
      "rating": 4.6,
      "reviewCount": 78,
      "soldCount": 156,
      "isFeatured": false,
      "brand": { "id": "c3cef14b", "slug": "puma", "name": "Puma" },
      "imageUrl": "https://picsum.photos/seed/puma-rsx/600/600",
      "category": { "slug": "shoes", "name": { "en": "Shoes", "ru": "Обувь", "uz": "Poyabzal" } },
      "stock": 99,
      "inStock": true
    }
  ],
  "total": 11,
  "page": 1,
  "limit": 3,
  "hasMore": true
}
''';

void main() {
  group('ProductPage — haqiqiy javob', () {
    late ProductPage page;

    setUp(() {
      page = ProductPage.fromJson(json.decode(_realProductsResponse) as Map<String, dynamic>);
    });

    test('sahifalash maydonlari', () {
      expect(page.total, 11);
      expect(page.page, 1);
      expect(page.hasMore, isTrue);
      expect(page.items, hasLength(1));
    });

    test('pul satrdan Decimal ga o`giriladi', () {
      final product = page.items.first;
      expect(product.price, Decimal.parse('990000'));
      expect(product.oldPrice, isNull);
      expect(formatMoney(product.price), "990 000 so'm");
    });

    test('nom ko`p tilli, brend nomi esa oddiy satr', () {
      final product = page.items.first;
      expect(product.name.pick('uz'), 'Puma RS-X krossovkalar');
      expect(product.name.pick('ru'), 'Puma RS-X');
      expect(product.brandName, 'Puma');
      expect(product.categoryName!.pick('ru'), 'Обувь');
    });

    test('zaxira haqiqiy', () {
      expect(page.items.first.stock, 99);
      expect(page.items.first.inStock, isTrue);
    });

    test('chegirma yo`q — foiz 0', () {
      expect(page.items.first.hasDiscount, isFalse);
      expect(page.items.first.discountPercentValue, 0);
    });
  });

  group('LocalizedText — `pickLocalized()` bilan bir xil', () {
    test('so`ralgan til, keyin uz, keyin birinchi qiymat', () {
      const text = LocalizedText({'uz': 'Poyabzal', 'ru': 'Обувь'});
      expect(text.pick('ru'), 'Обувь');
      expect(text.pick('en'), 'Poyabzal'); // en yo'q -> uz
      expect(const LocalizedText({'en': 'Shoes'}).pick('ru'), 'Shoes'); // uz ham yo'q
      expect(const LocalizedText({}).pick('uz'), '');
    });

    test('BO`SH SATR ham qiymat — zaxiraga o`tilmaydi', () {
      // TS `??` ishlatadi, ya'ni bo'sh satr qaytadi. Bu yerda boshqacha
      // qilsak, bitta mahsulot saytda bo'sh, telefonda to'ldirilgan
      // bo'lib ko'rinardi.
      const text = LocalizedText({'uz': '', 'ru': 'Обувь'});
      expect(text.pick('uz'), '');
    });

    test('null va kutilmagan turlar ilovani yiqitmaydi', () {
      expect(LocalizedText.fromJson(null).pick('uz'), '');
      expect(LocalizedText.fromJson('Matn').pick('uz'), 'Matn');
      expect(LocalizedText.fromJson({'uz': 'Bor', 'ru': null}).pick('ru'), 'Bor');
    });
  });

  group('formatMoney — `@ecom/utils` bilan bir xil', () {
    test('UZS bo`shliq bilan guruhlanadi', () {
      expect(formatMoney('0'), "0 so'm");
      expect(formatMoney('990000'), "990 000 so'm");
      expect(formatMoney('1234567'), "1 234 567 so'm");
      expect(formatMoney('150000.00'), "150 000 so'm");
    });

    test('USD va EUR', () {
      expect(formatMoney('1234.5', currency: 'USD'), r'$1,234.50');
      expect(formatMoney('1234.5', currency: 'EUR'), '€1,234.50');
    });

    test('noma`lum valyuta — kod oxirida', () {
      expect(formatMoney('10', currency: 'GBP'), '10.00 GBP');
    });

    test('manfiy qiymat', () {
      expect(formatMoney('-5000'), "-5 000 so'm");
    });
  });

  group('discountPercent', () {
    test('TS bilan bir xil yaxlitlash', () {
      expect(discountPercent(Decimal.parse('70'), Decimal.parse('100')), 30);
      expect(discountPercent(Decimal.parse('333'), Decimal.parse('1000')), 67);
      expect(discountPercent(Decimal.parse('100'), Decimal.parse('100')), 0);
      expect(discountPercent(Decimal.parse('100'), null), 0);
      // Eski narx arzonroq bo'lsa — chegirma yo'q, manfiy foiz emas.
      expect(discountPercent(Decimal.parse('100'), Decimal.parse('80')), 0);
    });
  });

  group('resolveProductImageUrl', () {
    const base = 'http://10.0.2.2:3000';

    test('picsum qoldig`i — seed bo`yicha repodagi fayl', () {
      // picsum MAHSULOTGA ALOQASI YO'Q rasm qaytaradi, shuning uchun
      // uni ko'rsatmaymiz.
      expect(
        resolveProductImageUrl(
          dbUrl: 'https://picsum.photos/seed/puma-rsx/600/600',
          slug: 'puma-rs-x-sneakers',
          baseUrl: base,
        ),
        '$base/products/puma-rsx.jpg',
      );
    });

    test('rasm yo`q — slug zaxira kalit', () {
      expect(
        resolveProductImageUrl(dbUrl: null, slug: 'nike-air', baseUrl: base),
        '$base/products/nike-air.jpg',
      );
    });

    test('sotuvchi yuklagan absolut manzil tegilmaydi', () {
      const blob = 'https://blob.vercel-storage.com/abc.jpg';
      expect(
        resolveProductImageUrl(dbUrl: blob, slug: 'x', baseUrl: base),
        blob,
      );
    });

    test('nisbiy manzilga base qo`shiladi', () {
      expect(
        resolveProductImageUrl(dbUrl: '/products/x.jpg', slug: 'x', baseUrl: '$base/'),
        '$base/products/x.jpg',
      );
    });

    test('SVG placeholder yuklanmaydi — null', () {
      // Flutter SVG ni qo'shimcha paketsiz chiza olmaydi.
      expect(
        resolveProductImageUrl(dbUrl: '/products/_placeholder.svg', slug: 'x', baseUrl: base),
        isNull,
      );
    });

    test('picsumSeed / isRealProductImageUrl', () {
      expect(picsumSeed('https://picsum.photos/seed/mac-ruby/600/600'), 'mac-ruby');
      expect(picsumSeed('https://cdn.sellobay.uz/a.jpg'), isNull);
      expect(isRealProductImageUrl('https://cdn.sellobay.uz/a.jpg'), isTrue);
      expect(isRealProductImageUrl('https://picsum.photos/seed/x/1/1'), isFalse);
      expect(isRealProductImageUrl(null), isFalse);
    });
  });

  group('ProductQuery', () {
    test('standart qamrov LOKAL — global tovar tasodifan chiqmaydi', () {
      expect(const ProductQuery().toQueryParameters()['scope'], 'LOCAL');
    });

    test('2 belgidan qisqa qidiruv yuborilmaydi', () {
      // Server ham e'tiborsiz qoldiradi — bekorga so'rov qilmaymiz.
      expect(const ProductQuery(search: 'a').toQueryParameters().containsKey('q'), isFalse);
      expect(const ProductQuery(search: '  ').toQueryParameters().containsKey('q'), isFalse);
      expect(const ProductQuery(search: ' nike ').toQueryParameters()['q'], 'nike');
    });

    test('copyWith null bilan filtrni TOZALAY oladi', () {
      const q = ProductQuery(categorySlug: 'shoes', search: 'nike');
      expect(q.copyWith(categorySlug: null).categorySlug, isNull);
      // Berilmagan maydon saqlanadi.
      expect(q.copyWith(categorySlug: null).search, 'nike');
    });

    test('saralash qiymatlari server bilan bir xil', () {
      expect(ProductSort.priceAsc.value, 'price-asc');
      expect(ProductSort.popular.value, 'popular');
      expect(ProductSort.values.map((s) => s.value).toSet(),
          {'newest', 'popular', 'price-asc', 'price-desc', 'rating'});
    });
  });

  group('CatalogRepository', () {
    test('o`ralmagan javobni o`qiydi va so`rovni to`g`ri yuboradi', () async {
      final backend = FakeBackend(
        (options, body) => okJson(_realProductsResponse),
      );
      final client = buildClient(backend);
      final repo = CatalogRepository(client.api);

      final page = await repo.fetchProducts(
        const ProductQuery(categorySlug: 'shoes', sort: ProductSort.priceAsc, page: 2),
      );

      expect(page.items.first.slug, 'puma-rs-x-sneakers');
      final sent = backend.queries.first!;
      expect(sent['category'], 'shoes');
      expect(sent['sort'], 'price-asc');
      expect(sent['page'], '2');
    });

    test('404 — NOT_FOUND va serverning `error` matni', () async {
      final backend = FakeBackend(
        (options, body) => apiErr(404, 'NOT_FOUND', 'Mahsulot topilmadi'),
      );
      final repo = CatalogRepository(buildClient(backend).api);

      await expectLater(
        repo.fetchProduct('yoq-mahsulot'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.code, 'code', 'NOT_FOUND')
              // Xabar endi KONVERTDAN keladi. Ilgari katalog
              // route'lari xatoni `{ "error": "Product not found" }`
              // ko'rinishida — ya'ni inglizcha va boshqa shaklda —
              // qaytarardi.
              .having((e) => e.message, 'message', 'Mahsulot topilmadi'),
        ),
      );
    });

    test('katalog yo`li oddiy `get()` bilan O`QILADI', () async {
      // Ilgari bu test TESKARISINI qo'riqlardi: katalog route'lari xom
      // javob qaytargani uchun `get()` ularni xato deb bilardi va
      // alohida `getRaw` metodi kerak bo'lardi. Endi barcha route'lar
      // bitta konvertda, `getRaw` esa butunlay olib tashlandi.
      final backend = FakeBackend(
        (options, body) => okJson(_realProductsResponse),
      );
      final api = buildClient(backend).api;

      final data = await api.get<Map<String, dynamic>>('/api/products');
      expect(data['items'], isA<List<dynamic>>());
      expect(data['total'], isNotNull);
    });
  });
}
