import 'dart:convert';

import 'package:decimal/decimal.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

const _deliveryId = 'dddddddd-1111-4111-8111-111111111111';

Map<String, dynamic> _delivery({
  String id = _deliveryId,
  String status = 'ASSIGNED',
  List<String> next = const ['PICKED_UP', 'FAILED'],
}) =>
    {
      'id': id,
      'status': status,
      'method': 'HOME_DELIVERY',
      'destinationAddress': 'Toshkent, Yunusobod, Amir Temur 1, 25-uy',
      'destinationLat': 41.33,
      'destinationLng': 69.28,
      'assignedAt': null,
      'pickedUpAt': null,
      'deliveredAt': null,
      'failureReason': null,
      'createdAt': '2026-10-04T08:00:00.000Z',
      'nextStatuses': next,
      'order': {
        'id': 'oooooooo-1111-4111-8111-111111111111',
        'number': 'ORD-2026-00012345',
        'grandTotal': '620000',
        'placedAt': '2026-10-04T07:55:00.000Z',
        'notes': null,
        'recipientName': 'Dilnoza',
        'recipientPhone': '+998901234567',
        'itemCount': 2,
        'items': [
          {'id': 'i1', 'quantity': 2, 'nameSnapshot': {'uz': 'Nike Air Max'}},
        ],
      },
    };

String _listJson({
  List<Map<String, dynamic>> mine = const [],
  List<Map<String, dynamic>> available = const [],
}) =>
    json.encode({
      'success': true,
      'data': {'mine': mine, 'available': available},
    });

void main() {
  group('DeliveryStatus', () {
    test('serverdagi enum bilan bir xil', () {
      expect(
        DeliveryStatus.values.map((s) => s.value).toSet(),
        {
          'ASSIGNED',
          'PICKED_UP',
          'IN_TRANSIT',
          'ARRIVED',
          'DELIVERED',
          'FAILED',
          'RETURNED',
        },
      );
    });

    test('i18n kalitlari', () {
      expect(DeliveryStatus.inTransit.labelKey, 'courier.status.IN_TRANSIT');
      expect(DeliveryStatus.inTransit.actionKey, 'courier.action.IN_TRANSIT');
    });

    test('yakuniy holatlar', () {
      expect(DeliveryStatus.delivered.isTerminal, isTrue);
      expect(DeliveryStatus.failed.isTerminal, isTrue);
      expect(DeliveryStatus.returned.isTerminal, isTrue);
      expect(DeliveryStatus.assigned.isTerminal, isFalse);
      expect(DeliveryStatus.arrived.isTerminal, isFalse);
    });

    test('noma`lum qiymat — null', () {
      expect(DeliveryStatus.fromValue('YANGI_HOLAT'), isNull);
    });
  });

  group('CourierRepository', () {
    test('ro`yxat ikki bo`limga ajraladi', () async {
      final backend = FakeBackend(
        (options, body) => rawJson(_listJson(
          mine: [_delivery(id: 'd1', status: 'IN_TRANSIT', next: ['ARRIVED', 'DELIVERED', 'FAILED'])],
          available: [_delivery(id: 'd2')],
        )),
      );
      final repo = CourierRepository(buildClient(backend).api);

      final data = await repo.fetchDeliveries();

      expect(backend.calls, ['/api/courier/deliveries']);
      expect(data.mine, hasLength(1));
      expect(data.available, hasLength(1));
      expect(data.mine.single.status, DeliveryStatus.inTransit);
      expect(data.isEmpty, isFalse);
    });

    test('bo`sh javob — to`qima topshiriq yaratilmaydi', () async {
      final backend = FakeBackend((options, body) => rawJson(_listJson()));
      final data = await CourierRepository(buildClient(backend).api).fetchDeliveries();

      expect(data.isEmpty, isTrue);
    });

    test('maydonlar to`g`ri o`qiladi', () async {
      final backend = FakeBackend(
        (options, body) => rawJson(_listJson(available: [_delivery()])),
      );
      final data = await CourierRepository(buildClient(backend).api).fetchDeliveries();
      final d = data.available.single;

      expect(d.orderNumber, 'ORD-2026-00012345');
      expect(d.orderTotal, Decimal.parse('620000'));
      expect(d.destinationAddress, 'Toshkent, Yunusobod, Amir Temur 1, 25-uy');
      expect(d.latitude, 41.33);
      expect(d.recipientPhone, '+998901234567');
      expect(d.itemCount, 2);
      expect(d.items.single.name.pick('uz'), 'Nike Air Max');
    });

    test('`nextStatuses` SERVERDAN keladi, Dart`da hisoblanmaydi', () async {
      // Qoida `courier-server.ts` dagi jadvalda. Dart'da takrorlasak,
      // ikkisi ajralib ketardi va ilova serverda rad etiladigan tugmani
      // ko'rsatardi.
      final backend = FakeBackend(
        (options, body) => rawJson(_listJson(
          mine: [_delivery(status: 'ARRIVED', next: ['DELIVERED', 'FAILED'])],
        )),
      );
      final data = await CourierRepository(buildClient(backend).api).fetchDeliveries();

      expect(
        data.mine.single.nextStatuses,
        [DeliveryStatus.delivered, DeliveryStatus.failed],
      );
    });

    test('ilova bilmaydigan holat ro`yxatdan tashlanadi', () async {
      final backend = FakeBackend(
        (options, body) => rawJson(_listJson(
          mine: [_delivery(next: ['PICKED_UP', 'ALLAQACHON_YANGI'])],
        )),
      );
      final data = await CourierRepository(buildClient(backend).api).fetchDeliveries();

      expect(data.mine.single.nextStatuses, [DeliveryStatus.pickedUp]);
    });

    test('claim — POST va yangilangan yozuv', () async {
      final backend = FakeBackend(
        (options, body) => apiOk({'delivery': _delivery(status: 'ASSIGNED')}),
      );
      final repo = CourierRepository(buildClient(backend).api);

      final updated = await repo.claim(_deliveryId);

      expect(backend.calls, ['/api/courier/deliveries/$_deliveryId/claim']);
      expect(updated.id, _deliveryId);
    });

    test('boshqa kuryer ulgurgan — 409', () async {
      final backend = FakeBackend(
        (options, body) =>
            apiErr(409, 'ALREADY_CLAIMED', 'Bu yetkazishni boshqa kuryer olgan'),
      );
      final repo = CourierRepository(buildClient(backend).api);

      await expectLater(
        repo.claim(_deliveryId),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'ALREADY_CLAIMED')),
      );
    });

    test('holat yangilash — status va ixtiyoriy sabab', () async {
      final backend = FakeBackend(
        (options, body) => apiOk({'delivery': _delivery(status: 'PICKED_UP', next: ['IN_TRANSIT', 'FAILED'])}),
      );
      final repo = CourierRepository(buildClient(backend).api);

      await repo.updateStatus(_deliveryId, DeliveryStatus.pickedUp);

      expect(backend.calls, ['/api/courier/deliveries/$_deliveryId/status']);
      final sent = backend.bodies.single!;
      expect(sent['status'], 'PICKED_UP');
      // Sabab berilmasa kalit umuman yuborilmaydi.
      expect(sent.containsKey('note'), isFalse);
      expect(sent.containsKey('latitude'), isFalse);
    });

    test('FAILED — sabab va koordinata yuboriladi', () async {
      final backend = FakeBackend(
        (options, body) => apiOk({'delivery': _delivery(status: 'FAILED', next: const [])}),
      );
      final repo = CourierRepository(buildClient(backend).api);

      final updated = await repo.updateStatus(
        _deliveryId,
        DeliveryStatus.failed,
        note: 'Mijoz javob bermadi',
        latitude: 41.3,
        longitude: 69.2,
      );

      final sent = backend.bodies.single!;
      expect(sent['status'], 'FAILED');
      expect(sent['note'], 'Mijoz javob bermadi');
      expect(sent['latitude'], 41.3);
      expect(updated.nextStatuses, isEmpty);
    });

    test('noto`g`ri o`tish — serverning matni', () async {
      final backend = FakeBackend(
        (options, body) => apiErr(
          409,
          'INVALID_TRANSITION',
          '«DELIVERED» holatidan «IN_TRANSIT» ga o\'tib bo\'lmaydi',
        ),
      );
      final repo = CourierRepository(buildClient(backend).api);

      await expectLater(
        repo.updateStatus(_deliveryId, DeliveryStatus.inTransit),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'INVALID_TRANSITION')),
      );
    });

    test('kuryer bo`lmagan foydalanuvchi — 403', () async {
      final backend = FakeBackend(
        (options, body) => apiErr(403, 'NOT_A_COURIER', 'Bu bo`lim faqat kuryerlar uchun'),
      );
      final repo = CourierRepository(buildClient(backend).api);

      await expectLater(
        repo.fetchDeliveries(),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 403)),
      );
    });
  });
}
