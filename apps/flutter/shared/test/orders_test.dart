import 'dart:convert';

import 'package:decimal/decimal.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

const _orderId = 'aaaaaaaa-1111-4111-8111-111111111111';

/// `GET /api/orders` javobi — `listUserOrders` tuzilishi bo'yicha.
String _listJson({String status = 'PENDING', bool paymentReview = false}) => json.encode({
      'success': true,
      'data': {
        'items': [
          {
            'id': _orderId,
            'number': 'ORD-2026-00012345',
            'status': status,
            'grandTotal': '620000',
            'placedAt': '2026-10-03T09:00:00.000Z',
            'paidAt': null,
            'shippedAt': null,
            'deliveredAt': null,
            'cancelledAt': null,
            'deliveryMethod': 'HOME_DELIVERY',
            'paymentReview': paymentReview,
            'scope': 'LOCAL',
            'global': null,
            'shippingAddress': {
              'recipientName': 'Dilnoza',
              'phone': '+998901234567',
              'region': 'Toshkent',
              'city': 'Yunusobod',
              'district': null,
              'street': 'Amir Temur 1',
              'building': null,
              'apartment': '25-uy',
            },
            'pickupPoint': null,
            'itemCount': 2,
            'items': [
              {
                'id': 'i1',
                'quantity': 2,
                // Nom KO'P TILLI — bazada `Json`.
                'nameSnapshot': {'uz': 'Nike Air Max', 'ru': 'Найк Эйр Макс'},
                'totalPrice': '600000',
                'slug': 'nike-air-max',
                'imageUrl': null,
              },
              {
                'id': 'i2',
                'quantity': 1,
                'nameSnapshot': {'uz': 'Paypoq'},
                'totalPrice': '20000',
                'slug': 'paypoq',
                'imageUrl': null,
              },
            ],
          },
        ],
      },
    });

/// `GET /api/orders/{id}` javobi — `serialize()` tuzilishi bo'yicha.
String _detailJson({
  String status = 'PENDING',
  bool returnable = false,
  bool editable = true,
}) =>
    json.encode({
      'success': true,
      'data': {
        'order': {
          'id': _orderId,
          'number': 'ORD-2026-00012345',
          'status': status,
          'paymentProvider': 'CASH_ON_DELIVERY',
          'paymentStatus': 'PENDING',
          'paymentReview': false,
          'subtotal': '600000',
          'shippingTotal': '20000',
          'discountTotal': '0',
          'grandTotal': '620000',
          'promoCode': null,
          'notes': null,
          'deliveryMethod': 'HOME_DELIVERY',
          'placedAt': '2026-10-03T09:00:00.000Z',
          'paidAt': null,
          'shippedAt': null,
          'deliveredAt': null,
          'cancelledAt': null,
          'editable': editable,
          'returnable': returnable,
          'returnWindowDays': 14,
          'scope': 'LOCAL',
          'global': null,
          'shippingAddress': {
            'recipientName': 'Dilnoza',
            'phone': '+998901234567',
            'region': 'Toshkent',
            'city': 'Yunusobod',
            'district': null,
            'street': 'Amir Temur 1',
            'building': null,
            'apartment': '25-uy',
          },
          'pickupPoint': null,
          'itemCount': 1,
          'items': [
            {
              'id': 'i1',
              'quantity': 2,
              'nameSnapshot': {'uz': 'Nike Air Max'},
              'unitPrice': '300000',
              'totalPrice': '600000',
              'slug': 'nike-air-max',
              'imageUrl': null,
            },
          ],
        },
      },
    });

void main() {
  group('OrderStatus', () {
    test('serverdagi enum bilan bir xil', () {
      expect(
        OrderStatus.values.map((s) => s.value).toSet(),
        {
          'PENDING',
          'CONFIRMED',
          'PAID',
          'PROCESSING',
          'PACKED',
          'SHIPPED',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
          'CANCELLED',
          'RETURNED',
          'REFUNDED',
        },
      );
    });

    test('faqat PENDING bekor qilinadi', () {
      // Server qoidasi: boshqa holatda `409 NOT_CANCELLABLE`.
      expect(OrderStatus.pending.isCancellable, isTrue);
      for (final s in OrderStatus.values.where((s) => s != OrderStatus.pending)) {
        expect(s.isCancellable, isFalse, reason: s.value);
      }
    });

    test('noma`lum holat — null, lekin xom qiymat saqlanadi', () {
      expect(OrderStatus.fromValue('ALLAQACHON_YANGI'), isNull);
      final page = OrderSummary.fromJson(
        (json.decode(_listJson(status: 'ALLAQACHON_YANGI')) as Map)['data']['items'][0]
            as Map<String, dynamic>,
      );
      expect(page.status, isNull);
      expect(page.rawStatus, 'ALLAQACHON_YANGI');
    });

    test('i18n kaliti', () {
      expect(OrderStatus.outForDelivery.labelKey, 'order.status.OUT_FOR_DELIVERY');
    });
  });

  group('OrdersRepository', () {
    test('ro`yxat o`qiladi, nom KO`P TILLI', () async {
      final backend = FakeBackend((options, body) => rawJson(_listJson()));
      final repo = OrdersRepository(buildClient(backend).api);

      final orders = await repo.fetchOrders();

      expect(backend.calls, ['/api/orders']);
      final order = orders.single;
      expect(order.number, 'ORD-2026-00012345');
      expect(order.status, OrderStatus.pending);
      expect(order.grandTotal, Decimal.parse('620000'));
      expect(order.itemCount, 2);
      expect(order.items.first.name.pick('uz'), 'Nike Air Max');
      expect(order.items.first.name.pick('ru'), 'Найк Эйр Макс');
      // Ro'yxatda `unitPrice` YO'Q — faqat detalda.
      expect(order.items.first.unitPrice, isNull);
    });

    test('detal summa taqsimotini beradi', () async {
      final backend = FakeBackend((options, body) => rawJson(_detailJson()));
      final repo = OrdersRepository(buildClient(backend).api);

      final order = await repo.fetchOrder(_orderId);

      expect(backend.calls, ['/api/orders/$_orderId']);
      expect(order.subtotal, Decimal.parse('600000'));
      expect(order.shippingTotal, Decimal.parse('20000'));
      expect(order.grandTotal, Decimal.parse('620000'));
      expect(order.hasDiscount, isFalse);
      expect(order.items.single.unitPrice, Decimal.parse('300000'));
      expect(order.address!.oneLine, 'Toshkent, Yunusobod, Amir Temur 1, 25-uy');
      expect(order.returnWindowDays, 14);
    });

    test('qaytarish oynasini SERVER hal qiladi', () async {
      // Sanani Dart'da hisoblamaymiz — `returnable` bayrog'iga ishonamiz.
      final open = FakeBackend(
        (o, b) => rawJson(_detailJson(status: 'DELIVERED', returnable: true)),
      );
      final closed = FakeBackend(
        (o, b) => rawJson(_detailJson(status: 'DELIVERED', returnable: false)),
      );

      expect((await OrdersRepository(buildClient(open).api).fetchOrder(_orderId)).returnable,
          isTrue);
      expect((await OrdersRepository(buildClient(closed).api).fetchOrder(_orderId)).returnable,
          isFalse);
    });

    test('bekor qilish — POST, sabab ixtiyoriy', () async {
      final backend = FakeBackend((options, body) => apiOk({'ok': true}));
      final repo = OrdersRepository(buildClient(backend).api);

      await repo.cancelOrder(_orderId);
      expect(backend.calls, ['/api/orders/$_orderId/cancel']);
      // Sabab berilmasa kalit umuman yuborilmaydi.
      expect(backend.bodies.single!.containsKey('reason'), isFalse);

      await repo.cancelOrder(_orderId, reason: 'Fikrim o`zgardi');
      expect(backend.bodies.last!['reason'], 'Fikrim o`zgardi');
    });

    test('qaytarish so`rovi — alohida yo`l', () async {
      final backend = FakeBackend((options, body) => apiOk({'ok': true}));
      await OrdersRepository(buildClient(backend).api).requestReturn(_orderId);
      expect(backend.calls, ['/api/orders/$_orderId/return']);
    });

    test('kech bekor qilish — serverning matni chiqadi', () async {
      final backend = FakeBackend(
        (options, body) => apiErr(
          409,
          'NOT_CANCELLABLE',
          'Buyurtma allaqachon qabul qilingan — bekor qilib bo‘lmaydi',
        ),
      );
      final repo = OrdersRepository(buildClient(backend).api);

      await expectLater(
        repo.cancelOrder(_orderId),
        throwsA(
          isA<ApiException>()
              .having((e) => e.code, 'code', 'NOT_CANCELLABLE')
              .having((e) => e.statusCode, 'status', 409),
        ),
      );
    });

    test('boshqa odamning buyurtmasi — 403', () async {
      final backend = FakeBackend((options, body) => apiErr(403, 'FORBIDDEN', "Ruxsat yo'q"));
      final repo = OrdersRepository(buildClient(backend).api);

      await expectLater(
        repo.fetchOrder(_orderId),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 403)),
      );
    });
  });

  group('formatOrderDate', () {
    test('web`dagi `formatDate` bilan bir xil shakl', () {
      // TS: `${pad2(day)} ${MONTHS_UZ_SHORT[month]}, ${year}`
      final d = DateTime(2026, 10, 3, 14, 5);
      expect(formatOrderDate(d), '03 okt, 2026');
      expect(formatOrderDateTime(d), '03 okt, 2026 14:05');
    });

    test('yanvar va dekabr chegaralari', () {
      expect(formatOrderDate(DateTime(2026, 1, 1)), '01 yan, 2026');
      expect(formatOrderDate(DateTime(2026, 12, 31)), '31 dek, 2026');
    });
  });
}
