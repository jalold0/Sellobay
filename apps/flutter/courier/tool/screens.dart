// Kuryer ilovasi ekranlarining HAQIQIY rasmi.
//
// Izohlar uchun qarang: apps/flutter/customer/tool/screens.dart
//
//   flutter test tool/screens.dart --update-goldens
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_courier/src/courier_location.dart';
import 'package:sellobay_courier/src/screens/deliveries_screen.dart';
import 'package:sellobay_courier/src/screens/delivery_detail_screen.dart';
import 'package:sellobay_courier/src/screens/login_screen.dart';
import 'package:sellobay_courier/src/screens/scan_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

Future<void> _settle(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

/// Sinov shrifti o'rniga brend shriftlari (shared paketdan).
Future<void> loadRealFonts() => loadBrandFontsForScreens();

ThemeData previewTheme() => buildSellobayTheme();

Future<void> shoot(
  WidgetTester tester,
  String name,
  Widget home, {
  FakeBackend? backend,
  Future<void> Function(WidgetTester tester)? act,
}) async {
  tester.view
    ..physicalSize = const Size(390 * 2, 844 * 2)
    ..devicePixelRatio = 2;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(
    backend ?? FakeBackend((options, body) => apiErr(500, 'UNEXPECTED', options.path)),
    locale: uz,
    requiredRole: UserRoles.courier,
  );

  await tester.pumpWidget(
    SellobayRuntimeScope(
      runtime: runtime,
      child: TranslationsScope(
        translations: uz.translations!,
        child: AuthScope(
          controller: runtime.auth,
          child: MaterialApp(debugShowCheckedModeBanner: false, theme: previewTheme(), home: home),
        ),
      ),
    ),
  );
  await _settle(tester);
  if (act != null) {
    await act(tester);
    await _settle(tester);
    await tester.pump(const Duration(milliseconds: 400));
  }

  await expectLater(find.byType(MaterialApp), matchesGoldenFile('shots/$name.png'));
}

Map<String, dynamic> _delivery({
  required String id,
  required String number,
  String status = 'ASSIGNED',
  List<String> next = const ['PICKED_UP', 'FAILED'],
  String address = 'Toshkent, Yunusobod, Amir Temur shoh ko\'chasi 1, 25-uy',
  bool claimed = true,
}) => {
  'id': id,
  'status': status,
  'claimed': claimed,
  'method': 'HOME_DELIVERY',
  'destinationAddress': address,
  'destinationLat': 41.33,
  'destinationLng': 69.28,
  'pickedUpAt': null,
  'deliveredAt': null,
  'failureReason': null,
  'createdAt': '2026-10-04T08:00:00.000Z',
  'nextStatuses': next,
  'parcelCode': claimed ? 'SB-7K3M-9QXZ' : null,
  'handover': {'required': true, 'attemptsLeft': 5, 'locked': false, 'method': null},
  'order': {
    'id': 'oooooooo-1111-4111-8111-111111111111',
    'number': number,
    'grandTotal': '620000',
    'codAmount': '620000',
    'placedAt': '2026-10-04T07:55:00.000Z',
    'notes': claimed ? 'Domofon 25, 3-qavat. Qo‘ng‘iroq qilib keling' : null,
    'recipientName': 'Dilnoza Karimova',
    'recipientPhone': '+998901234567',
    'itemCount': 2,
    'items': [
      {
        'id': 'i1',
        'quantity': 2,
        'nameSnapshot': {'uz': 'Nike Air Max 90'},
        'sku': 'NK-AM90-WHT-42',
        'variant': [
          {
            'name': {'uz': 'Rang'},
            'value': {'uz': 'Oq'},
          },
          {
            'name': {'uz': 'O‘lcham'},
            'value': '42',
          },
        ],
      },
      {
        'id': 'i2',
        'quantity': 1,
        'nameSnapshot': {'uz': 'Puma RS-X krossovkalar'},
        'sku': 'PM-RSX-BLK-41',
      },
    ],
  },
};

FakeBackend _backend() => FakeBackend((options, body) {
  if (options.path == '/api/courier/deliveries') {
    return rawJson(
      json.encode({
        'success': true,
        'data': {
          'mine': [
            _delivery(
              id: 'd1',
              number: 'ORD-2026-00012345',
              status: 'IN_TRANSIT',
              next: const ['ARRIVED', 'DELIVERED', 'FAILED'],
            ),
          ],
          'available': [
            _delivery(
              id: 'd2',
              number: 'ORD-2026-00012346',
              claimed: false,
              address: 'Toshkent, Chilonzor, Bunyodkor shoh ko\'chasi 12',
            ),
          ],
        },
      }),
    );
  }
  return apiErr(500, 'UNEXPECTED', options.path);
});

void main() {
  setUpAll(() async {
    // Testda GPS yo'q — joylashuvsiz yuboriladi (ilovada ham «iloji bo'lsa»).
    // ignore: invalid_use_of_visible_for_testing_member
    CourierLocation.source = () async => null;
    TestWidgetsFlutterBinding.ensureInitialized();
    await loadRealFonts();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('01 kirish', (t) => shoot(t, '01-login', const CourierLoginScreen()));

  testWidgets(
    '02 topshiriqlar',
    (t) => shoot(t, '02-deliveries', const DeliveriesScreen(), backend: _backend()),
  );

  testWidgets(
    '03 topshiriq detali',
    (t) => shoot(
      t,
      '03-delivery',
      DeliveryDetailScreen(
        delivery: CourierDelivery.fromJson(
          _delivery(
            id: 'd1',
            number: 'ORD-2026-00012345',
            status: 'IN_TRANSIT',
            next: const ['ARRIVED', 'DELIVERED', 'FAILED'],
          ),
        ),
      ),
      backend: _backend(),
    ),
  );

  testWidgets(
    '04 mijozga topshirish',
    (t) => shoot(
      t,
      '04-handover',
      DeliveryDetailScreen(
        delivery: CourierDelivery.fromJson(
          _delivery(
            id: 'd1',
            number: 'ORD-2026-00012345',
            status: 'ARRIVED',
            next: const ['DELIVERED', 'FAILED'],
          ),
        ),
      ),
      backend: _backend(),
      act: (t) => t.tap(find.text('Mijozga topshirish')),
    ),
  );

  testWidgets('05 skaner', (t) {
    // ignore: invalid_use_of_visible_for_testing_member
    ScanScreen.cameraBuilder = (context, onCode) => const ColoredBox(color: Color(0xFF2A2A2E));
    return shoot(
      t,
      '05-scan',
      ScanScreen(
        title: 'Posilka yorlig‘ini skanerlang',
        onDetect: (_) async => const ScanOutcome.ok('SB-7K3M-9QXZ: Posilka olindi'),
      ),
      act: (t) async {
        await t.enterText(find.byType(TextField), 'SB-7K3M-9QXZ');
        await t.tap(find.text('Posilkani olish'));
      },
    );
  });
}
