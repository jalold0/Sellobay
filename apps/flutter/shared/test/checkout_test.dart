import 'dart:convert';
import 'dart:math';

import 'package:decimal/decimal.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

const _productA = '11111111-1111-4111-8111-111111111111';
const _productB = '22222222-2222-4222-8222-222222222222';
const _variantA = '33333333-3333-4333-8333-333333333333';

CartLine _line(String productId, {String? variantId, int quantity = 1}) => CartLine(
      productId: productId,
      variantId: variantId,
      slug: 'mahsulot',
      name: const LocalizedText({'uz': 'Mahsulot'}),
      brandName: 'Nike',
      rawImageUrl: null,
      unitPrice: Decimal.parse('300000'),
      oldPrice: null,
      currency: 'UZS',
      quantity: quantity,
    );

String _orderOk({bool replayed = false}) => json.encode({
      'success': true,
      'data': {
        'order': {
          'id': 'aaaaaaaa-1111-4111-8111-111111111111',
          'number': 'ORD-2026-00012345',
          'status': 'PENDING',
          'grandTotal': '620000',
          'placedAt': '2026-10-03T12:00:00.000Z',
          'coinsEarned': 620,
          'coinsRedeemed': 0,
          'discountSom': 0,
          'promoDiscountSom': 0,
          'appliedPromoCode': null,
        },
        if (replayed) 'replayed': true,
      },
    });

void main() {
  group('generateUuidV4', () {
    test('RFC 4122 shakli va versiya/variant bitlari', () {
      final value = generateUuidV4();
      expect(
        RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
            .hasMatch(value),
        isTrue,
        reason: value,
      );
    });

    test('takrorlanmaydi', () {
      final values = List.generate(200, (_) => generateUuidV4()).toSet();
      expect(values, hasLength(200));
    });

    test('bir xil urug`li Random ham to`g`ri shakl beradi', () {
      // Faqat shakl tekshiriladi: haqiqiy kalit `Random.secure()` dan
      // olinadi (standart), bu yerda takrorlanuvchanlik uchun berildi.
      expect(generateUuidV4(Random(1)).length, 36);
    });
  });

  group('createOrder so`rovi', () {
    test('body va `Idempotency-Key` sarlavhasi', () async {
      final backend = FakeBackend((options, body) => rawJson(_orderOk()));
      final repo = CheckoutRepository(buildClient(backend).api);

      final order = await repo.createOrder(
        items: [_line(_productA, variantId: _variantA, quantity: 2), _line(_productB)],
        recipientName: '  Dilnoza  ',
        phone: '+998901234567',
        region: 'Toshkent',
        city: 'Yunusobod',
        street: 'Amir Temur 1',
        deliveryMethod: DeliveryMethod.homeDelivery,
        paymentProvider: PaymentProvider.cashOnDelivery,
        idempotencyKey: 'kalit-1',
      );

      expect(backend.calls, ['/api/orders']);
      expect(backend.headers.single['Idempotency-Key'], 'kalit-1');

      final sent = backend.bodies.single!;
      final items = sent['items'] as List<dynamic>;
      expect(items, hasLength(2));
      expect(items[0], {'productId': _productA, 'quantity': 2, 'variantId': _variantA});
      // Variantsiz satrda `variantId` kaliti UMUMAN yo'q.
      expect((items[1] as Map).containsKey('variantId'), isFalse);

      expect(sent['recipientName'], 'Dilnoza'); // trim
      expect(sent['deliveryMethod'], 'HOME_DELIVERY');
      expect(sent['paymentProvider'], 'CASH_ON_DELIVERY');
      // Bo'sh/ko'rsatilmagan maydonlar yuborilmaydi.
      expect(sent.containsKey('apartment'), isFalse);
      expect(sent.containsKey('promoCode'), isFalse);
      expect(sent.containsKey('notes'), isFalse);
      expect(sent.containsKey('pickupPointId'), isFalse);

      expect(order.number, 'ORD-2026-00012345');
      expect(order.grandTotal, Decimal.parse('620000'));
      expect(order.replayed, isFalse);
    });

    test('punkt tanlansa `pickupPointId` qo`shiladi', () async {
      final backend = FakeBackend((options, body) => rawJson(_orderOk()));
      final repo = CheckoutRepository(buildClient(backend).api);

      await repo.createOrder(
        items: [_line(_productA)],
        recipientName: 'Dilnoza',
        phone: '+998901234567',
        region: 'Samarqand',
        city: 'Samarqand',
        street: 'Registon 5',
        deliveryMethod: DeliveryMethod.pickupPoint,
        pickupPointId: _variantA,
        paymentProvider: PaymentProvider.cashOnDelivery,
        promoCode: ' SALE10 ',
        notes: ' Eshik oldiga ',
        idempotencyKey: 'k',
      );

      final sent = backend.bodies.single!;
      expect(sent['deliveryMethod'], 'PICKUP_POINT');
      expect(sent['pickupPointId'], _variantA);
      expect(sent['promoCode'], 'SALE10');
      expect(sent['notes'], 'Eshik oldiga');
    });

    test('`replayed` — takroriy so`rov, XATO EMAS', () async {
      // Server ayni kalitni ikkinchi marta ko'rsa yangi buyurtma
      // yaratmaydi, birinchisini qaytaradi. Ilova buni muvaffaqiyat
      // deb qabul qilishi kerak.
      final backend = FakeBackend((options, body) => rawJson(_orderOk(replayed: true)));
      final repo = CheckoutRepository(buildClient(backend).api);

      final order = await repo.createOrder(
        items: [_line(_productA)],
        recipientName: 'Dilnoza',
        phone: '+998901234567',
        region: 'Toshkent',
        city: 'Yunusobod',
        street: 'Amir Temur 1',
        deliveryMethod: DeliveryMethod.homeDelivery,
        paymentProvider: PaymentProvider.cashOnDelivery,
        idempotencyKey: 'k',
      );

      expect(order.replayed, isTrue);
      expect(order.number, 'ORD-2026-00012345');
    });

    test('serverning biznes xatosi tayyor matn bilan keladi', () async {
      final backend = FakeBackend(
        (options, body) => apiErr(
          409,
          'STOCK_INSUFFICIENT',
          '«Nike Air Max» omborda yetarli emas (2 dona qoldi)',
        ),
      );
      final repo = CheckoutRepository(buildClient(backend).api);

      await expectLater(
        repo.createOrder(
          items: [_line(_productA)],
          recipientName: 'Dilnoza',
          phone: '+998901234567',
          region: 'Toshkent',
          city: 'Yunusobod',
          street: 'Amir Temur 1',
          deliveryMethod: DeliveryMethod.homeDelivery,
          paymentProvider: PaymentProvider.cashOnDelivery,
          idempotencyKey: 'k',
        ),
        throwsA(
          isA<ApiException>()
              .having((e) => e.code, 'code', 'STOCK_INSUFFICIENT')
              .having((e) => e.message, 'xabar', contains('2 dona qoldi')),
        ),
      );
    });
  });

  group('to`lov usullari', () {
    test('serverdan keladi, ilova bilmaganlari tashlab yuboriladi', () async {
      // `UZCARD` chek yuklashni talab qiladi va ilovada qo'llanmaydi —
      // ro'yxatga tushmasligi kerak.
      final backend = FakeBackend(
        (options, body) => apiOk({
          'cards': <Map<String, dynamic>>[],
          'providers': ['CLICK', 'CASH_ON_DELIVERY', 'UZCARD'],
        }),
      );
      final repo = CheckoutRepository(buildClient(backend).api);

      final providers = await repo.fetchPaymentProviders();

      expect(providers, [PaymentProvider.click, PaymentProvider.cashOnDelivery]);
      expect(backend.calls, ['/api/payment-cards']);
    });

    test('server bo`sh ro`yxat bersa — hech narsa taklif qilinmaydi', () async {
      final backend = FakeBackend(
        (options, body) => apiOk({'cards': <Map<String, dynamic>>[], 'providers': <String>[]}),
      );
      final repo = CheckoutRepository(buildClient(backend).api);

      expect(await repo.fetchPaymentProviders(), isEmpty);
    });

    test('onlayn va naqd farqi', () {
      expect(PaymentProvider.click.isOnline, isTrue);
      expect(PaymentProvider.payme.isOnline, isTrue);
      expect(PaymentProvider.cashOnDelivery.isOnline, isFalse);
    });
  });

  group('promokod', () {
    test('summa butun son bo`lib ketadi', () async {
      // Server `z.number()` kutadi; Decimal to'g'ridan-to'g'ri JSON'ga
      // tushsa satr bo'lib ketib, 400 VALIDATION chiqardi.
      final backend = FakeBackend(
        (options, body) => apiOk({'valid': true, 'code': 'SALE10', 'type': 'PERCENT', 'discount': 60000}),
      );
      final repo = CheckoutRepository(buildClient(backend).api);

      final preview = await repo.validatePromo(
        code: 'sale10',
        subtotal: Decimal.parse('600000'),
        shippingFee: 20000,
      );

      final sent = backend.bodies.single!;
      expect(sent['subtotal'], 600000);
      expect(sent['subtotal'], isA<int>());
      expect(sent['shippingFee'], 20000);
      expect(preview.valid, isTrue);
      expect(preview.discount, Decimal.parse('60000'));
    });

    test('yaroqsiz kod — serverning matni ko`rsatiladi', () async {
      final backend = FakeBackend(
        (options, body) =>
            apiOk({'valid': false, 'reason': 'NOT_FOUND', 'message': 'Promokod topilmadi'}),
      );
      final repo = CheckoutRepository(buildClient(backend).api);

      final preview = await repo.validatePromo(
        code: 'yoq',
        subtotal: Decimal.parse('100000'),
        shippingFee: 0,
      );

      expect(preview.valid, isFalse);
      expect(preview.message, 'Promokod topilmadi');
    });
  });

  group('to`lovni boshlash', () {
    test('onlayn — manzil qaytadi', () async {
      final backend = FakeBackend(
        (options, body) => apiOk({'online': true, 'checkoutUrl': 'https://my.click.uz/pay?x=1'}),
      );
      final repo = CheckoutRepository(buildClient(backend).api);

      final start = await repo.startPayment(
        orderId: 'aaaaaaaa-1111-4111-8111-111111111111',
        provider: PaymentProvider.click,
      );

      expect(start.online, isTrue);
      expect(start.checkoutUrl, 'https://my.click.uz/pay?x=1');
      expect(backend.bodies.single!['provider'], 'CLICK');
    });

    test('naqd — manzil yo`q', () async {
      final backend = FakeBackend(
        (options, body) => apiOk({'online': false, 'checkoutUrl': null}),
      );
      final repo = CheckoutRepository(buildClient(backend).api);

      final start = await repo.startPayment(
        orderId: 'aaaaaaaa-1111-4111-8111-111111111111',
        provider: PaymentProvider.cashOnDelivery,
      );

      expect(start.online, isFalse);
      expect(start.checkoutUrl, isNull);
    });
  });

  group('manzil va punktlar', () {
    test('saqlangan manzil bir qatorga yig`iladi', () async {
      final backend = FakeBackend(
        (options, body) => apiOk({
          'items': [
            {
              'id': 'a1',
              'label': 'Uy',
              'recipientName': 'Dilnoza',
              'phone': '+998901234567',
              'region': 'Toshkent',
              'city': 'Yunusobod',
              'street': 'Amir Temur 1',
              'apartment': '25-uy',
              'isDefault': true,
            },
          ],
        }),
      );
      final repo = CheckoutRepository(buildClient(backend).api);

      final addresses = await repo.fetchAddresses();

      expect(addresses.single.oneLine, 'Toshkent, Yunusobod, Amir Temur 1, 25-uy');
      expect(addresses.single.isDefault, isTrue);
    });

    test('punktlar viloyat bo`yicha so`raladi', () async {
      final backend = FakeBackend(
        (options, body) => apiOk({
          'items': [
            {
              'id': 'p1',
              'code': 'PVZ-SAM-001',
              // Nom KO'P TILLI — jonli javobda aynan shunday.
              'name': {'uz': 'Samarqand markaz', 'ru': 'ПВЗ Самарканд'},
              'region': 'Samarqand',
              'city': 'Samarqand',
              'street': 'Registon 5',
              'phone': '+998662000001',
              'workingHours': '09:00-20:00',
            },
          ],
        }),
      );
      final repo = CheckoutRepository(buildClient(backend).api);

      final points = await repo.fetchPickupPoints(region: 'Samarqand');

      expect(backend.queries.single!['region'], 'Samarqand');
      expect(points.single.address, 'Samarqand, Registon 5');
      expect(points.single.name.pick('uz'), 'Samarqand markaz');
      expect(points.single.name.pick('ru'), 'ПВЗ Самарканд');
    });
  });
}
