import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_courier/src/screens/deliveries_screen.dart';
import 'package:sellobay_courier/src/screens/delivery_detail_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

const _deliveryId = 'dddddddd-1111-4111-8111-111111111111';

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

Future<void> settleRoute(WidgetTester tester) async {
  await settle(tester);
  await tester.pump(const Duration(milliseconds: 400));
  await settle(tester);
}

Map<String, dynamic> _delivery({
  String id = _deliveryId,
  String number = 'ORD-2026-00012345',
  String status = 'ASSIGNED',
  List<String> next = const ['PICKED_UP', 'FAILED'],
  String? failureReason,
  bool claimed = true,
}) =>
    {
      'id': id,
      'status': status,
      'claimed': claimed,
      'method': 'HOME_DELIVERY',
      'destinationAddress': 'Toshkent, Yunusobod, Amir Temur 1',
      'destinationLat': null,
      'destinationLng': null,
      'pickedUpAt': null,
      'deliveredAt': null,
      'failureReason': failureReason,
      'createdAt': '2026-10-04T08:00:00.000Z',
      'nextStatuses': next,
      'order': {
        'id': 'oooooooo-1111-4111-8111-111111111111',
        'number': number,
        'grandTotal': '620000',
        'placedAt': '2026-10-04T07:55:00.000Z',
        'notes': null,
        'recipientName': 'Dilnoza',
        'recipientPhone': '+998901234567',
        'itemCount': 2,
        'items': [
          {
            'id': 'i1',
            'quantity': 2,
            'nameSnapshot': {'uz': 'Nike Air Max'},
          },
        ],
      },
    };

FakeBackend _backend({
  List<Map<String, dynamic>> mine = const [],
  List<Map<String, dynamic>> available = const [],
  ResponseBody Function()? claim,
  ResponseBody Function(Map<String, dynamic>? body)? status,
}) =>
    FakeBackend((options, body) {
      if (options.path.endsWith('/claim')) {
        return claim?.call() ?? apiOk({'delivery': _delivery()});
      }
      if (options.path.endsWith('/status')) {
        return status?.call(body) ??
            apiOk({
              'delivery': _delivery(status: 'PICKED_UP', next: const ['IN_TRANSIT', 'FAILED']),
            });
      }
      if (options.path == '/api/courier/deliveries') {
        return rawJson(json.encode({
          'success': true,
          'data': {'mine': mine, 'available': available},
        }));
      }
      return apiErr(500, 'UNEXPECTED', options.path);
    });

Future<SellobayRuntime> pump(WidgetTester tester, FakeBackend backend, Widget home) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(backend, locale: uz, requiredRole: UserRoles.courier);
  await tester.pumpWidget(
    SellobayRuntimeScope(
      runtime: runtime,
      child: TranslationsScope(
        translations: uz.translations!,
        child: AuthScope(
          controller: runtime.auth,
          child: MaterialApp(theme: buildSellobayTheme(), home: home),
        ),
      ),
    ),
  );
  await settle(tester);
  return runtime;
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('topshiriq yo`q — TO`QIMA ro`yxat ko`rsatilmaydi', (tester) async {
    // Ilgari bu ekranda ikkita qotib yozilgan buyurtma turardi.
    await pump(tester, _backend(), const DeliveriesScreen());

    expect(find.text("Sizda faol topshiriq yo'q"), findsOneWidget);
    expect(find.text("Hozircha bo'sh topshiriq yo'q"), findsOneWidget);
    expect(find.textContaining('ORD-'), findsNothing);
  });

  testWidgets('ikki bo`lim: meniki va bo`shlari', (tester) async {
    await pump(
      tester,
      _backend(
        mine: [_delivery(id: 'd1', number: 'ORD-A', status: 'IN_TRANSIT')],
        available: [_delivery(id: 'd2', number: 'ORD-B')],
      ),
      const DeliveriesScreen(),
    );

    expect(find.text('Mening topshiriqlarim'), findsOneWidget);
    expect(find.text("Bo'sh topshiriqlar"), findsOneWidget);
    expect(find.text('ORD-A'), findsOneWidget);
    expect(find.text('ORD-B'), findsOneWidget);
    expect(find.text("Yo'lda"), findsOneWidget);
  });

  testWidgets('bo`sh topshiriqda «Biriktirildi» EMAS, «Yangi»', (tester) async {
    // Ikkalasining holati ham `ASSIGNED`; farq — kuryer olganmi.
    await pump(
      tester,
      _backend(
        mine: [_delivery(id: 'd1', number: 'ORD-A', claimed: true)],
        available: [_delivery(id: 'd2', number: 'ORD-B', claimed: false)],
      ),
      const DeliveriesScreen(),
    );

    expect(find.text('Yangi'), findsOneWidget);
    expect(find.text('Biriktirildi'), findsOneWidget);
  });

  testWidgets('"o`zimga olish" FAQAT bo`sh topshiriqda', (tester) async {
    await pump(
      tester,
      _backend(
        mine: [_delivery(id: 'd1', number: 'ORD-A')],
        available: [_delivery(id: 'd2', number: 'ORD-B')],
      ),
      const DeliveriesScreen(),
    );

    expect(find.text("O'zimga olish"), findsOneWidget);
  });

  testWidgets('olish — serverga boradi', (tester) async {
    final backend = _backend(available: [_delivery()]);
    await pump(tester, backend, const DeliveriesScreen());

    await tester.tap(find.text("O'zimga olish"));
    await settle(tester);

    expect(
      backend.calls.where((c) => c.endsWith('/claim')),
      ['/api/courier/deliveries/$_deliveryId/claim'],
    );
  });

  testWidgets('boshqa kuryer ulgurgan — serverning matni', (tester) async {
    final backend = _backend(
      available: [_delivery()],
      claim: () => apiErr(409, 'ALREADY_CLAIMED', 'Bu yetkazishni boshqa kuryer olgan'),
    );
    await pump(tester, backend, const DeliveriesScreen());

    await tester.tap(find.text("O'zimga olish"));
    await settle(tester);

    expect(find.textContaining('boshqa kuryer olgan'), findsWidgets);
  });

  testWidgets('xato — qayta urinish', (tester) async {
    final backend = FakeBackend((options, body) => apiErr(500, 'SERVER', 'Ichki xato'));
    await pump(tester, backend, const DeliveriesScreen());

    expect(find.text('Ichki xato'), findsOneWidget);
    expect(find.text('Qayta urinish'), findsOneWidget);
  });

  group('topshiriq sahifasi', () {
    testWidgets('tugmalar SERVERNING `nextStatuses` idan quriladi', (tester) async {
      final delivery = CourierDelivery.fromJson(
        _delivery(status: 'IN_TRANSIT', next: const ['ARRIVED', 'DELIVERED', 'FAILED']),
      );
      await pump(tester, _backend(), DeliveryDetailScreen(delivery: delivery));

      expect(find.text('Yetib keldim'), findsOneWidget);
      expect(find.text('Yetkazdim'), findsOneWidget);
      expect(find.text("Yetkazib bo'lmadi"), findsOneWidget);
      // Serverda ruxsat etilmagan o'tish tugmasi YO'Q.
      expect(find.text('Buyurtmani oldim'), findsNothing);
    });

    testWidgets('yakuniy holat — tugma yo`q', (tester) async {
      final delivery = CourierDelivery.fromJson(
        _delivery(status: 'DELIVERED', next: const []),
      );
      await pump(tester, _backend(), DeliveryDetailScreen(delivery: delivery));

      // Holat o'tish tugmalari YO'Q. Widget turiga emas, MATNGA
      // qaraymiz: ekranda qo'ng'iroq va yo'l ko'rsatish tugmalari ham
      // bor, ular holatga tegmaydi va yakuniy holatda ham qoladi.
      for (final label in const [
        'Buyurtmani oldim',
        "Yo'lga chiqdim",
        'Yetkazdim',
        "Yetkazib bo'lmadi",
      ]) {
        expect(find.widgetWithText(FilledButton, label), findsNothing, reason: label);
        expect(find.widgetWithText(OutlinedButton, label), findsNothing, reason: label);
      }
      // Holat chipi esa o'z joyida.
      expect(find.text('Yetkazildi'), findsOneWidget);
    });

    testWidgets('holat yangilanadi', (tester) async {
      final backend = _backend();
      final delivery = CourierDelivery.fromJson(_delivery());
      await pump(tester, backend, DeliveryDetailScreen(delivery: delivery));

      await tester.tap(find.text('Buyurtmani oldim'));
      await settle(tester);

      expect(backend.bodies.single!['status'], 'PICKED_UP');
      expect(find.text('Olindi'), findsOneWidget);
    });

    testWidgets('FAILED — sabab so`raladi, bo`sh bo`lsa YUBORILMAYDI', (tester) async {
      // Serverda ham sabab majburiy (`400 REASON_REQUIRED`).
      final backend = _backend();
      final delivery = CourierDelivery.fromJson(_delivery());
      await pump(tester, backend, DeliveryDetailScreen(delivery: delivery));

      await tester.tap(find.text("Yetkazib bo'lmadi"));
      await settleRoute(tester);
      expect(find.text('Sababi'), findsOneWidget);

      // Bo'sh sabab bilan tasdiqlash hech narsa qilmaydi.
      await tester.tap(find.text('Tasdiqlash'));
      await settleRoute(tester);
      expect(backend.calls.where((c) => c.endsWith('/status')), isEmpty);

      await tester.enterText(find.byType(TextField), 'Mijoz javob bermadi');
      await tester.tap(find.text('Tasdiqlash'));
      await settleRoute(tester);

      final sent = backend.bodies.last!;
      expect(sent['status'], 'FAILED');
      expect(sent['note'], 'Mijoz javob bermadi');
    });

    testWidgets('sababdan voz kechish — so`rov ketmaydi', (tester) async {
      final backend = _backend();
      final delivery = CourierDelivery.fromJson(_delivery());
      await pump(tester, backend, DeliveryDetailScreen(delivery: delivery));

      await tester.tap(find.text("Yetkazib bo'lmadi"));
      await settleRoute(tester);
      await tester.tap(find.text('Bekor qilish'));
      await settleRoute(tester);

      expect(backend.calls.where((c) => c.endsWith('/status')), isEmpty);
    });

    testWidgets('qabul qiluvchi va manzil ko`rsatiladi', (tester) async {
      final delivery = CourierDelivery.fromJson(_delivery());
      await pump(tester, _backend(), DeliveryDetailScreen(delivery: delivery));

      expect(find.text('Toshkent, Yunusobod, Amir Temur 1'), findsOneWidget);
      expect(find.text('Dilnoza'), findsOneWidget);
      expect(find.text('+998901234567'), findsOneWidget);
      expect(find.text('Nike Air Max'), findsOneWidget);
    });
  });
}
