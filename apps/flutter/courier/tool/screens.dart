// Kuryer ilovasi ekranlarining HAQIQIY rasmi.
//
// Izohlar uchun qarang: apps/flutter/customer/tool/screens.dart
//
//   flutter test tool/screens.dart --update-goldens
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_courier/src/screens/deliveries_screen.dart';
import 'package:sellobay_courier/src/screens/delivery_detail_screen.dart';
import 'package:sellobay_courier/src/screens/login_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

Future<void> _settle(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

/// Sinov shrifti o'rniga SDK bilan kelgan Roboto.
Future<void> loadRealFonts() async {
  final root = Platform.environment['FLUTTER_ROOT'];
  if (root == null) throw StateError('FLUTTER_ROOT yo`q — `flutter test` orqali ishga tushiring');
  final dir = Directory('$root/bin/cache/artifacts/material_fonts');

  Future<void> family(String name, List<String> files) async {
    final loader = FontLoader(name);
    for (final file in files) {
      loader.addFont(
        Future.value(ByteData.sublistView(File('${dir.path}/$file').readAsBytesSync())),
      );
    }
    await loader.load();
  }

  await family('Roboto', const [
    'roboto-regular.ttf',
    'roboto-medium.ttf',
    'roboto-bold.ttf',
    'roboto-black.ttf',
  ]);
  await family('MaterialIcons', const ['materialicons-regular.otf']);
}

ThemeData previewTheme() {
  final theme = buildSellobayTheme();

  // `ButtonStyle.textStyle` uslubni MERGE qilmaydi, butunlay almashtiradi.
  // Mavzuda u shrift oilasisiz berilgan — haqiqiy qurilmada bu platforma
  // shriftiga tushadi (to'g'ri), testda esa sinov shriftiga, ya'ni
  // tugma matni to'rtburchakka aylanadi. Shu yerda oilani qo'shamiz.
  final filled = theme.filledButtonTheme.style;
  return theme.copyWith(
    textTheme: theme.textTheme.apply(fontFamily: 'Roboto'),
    primaryTextTheme: theme.primaryTextTheme.apply(fontFamily: 'Roboto'),
    filledButtonTheme: FilledButtonThemeData(
      style: filled?.copyWith(
        textStyle: WidgetStatePropertyAll(
          filled.textStyle?.resolve(const <WidgetState>{})?.copyWith(fontFamily: 'Roboto'),
        ),
      ),
    ),
  );
}

Future<void> shoot(WidgetTester tester, String name, Widget home, {FakeBackend? backend}) async {
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
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: previewTheme(),
            home: home,
          ),
        ),
      ),
    ),
  );
  await _settle(tester);

  await expectLater(find.byType(MaterialApp), matchesGoldenFile('shots/$name.png'));
}

Map<String, dynamic> _delivery({
  required String id,
  required String number,
  String status = 'ASSIGNED',
  List<String> next = const ['PICKED_UP', 'FAILED'],
  String address = 'Toshkent, Yunusobod, Amir Temur shoh ko\'chasi 1, 25-uy',
  bool claimed = true,
}) =>
    {
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
      'order': {
        'id': 'oooooooo-1111-4111-8111-111111111111',
        'number': number,
        'grandTotal': '620000',
        'placedAt': '2026-10-04T07:55:00.000Z',
        'notes': null,
        'recipientName': 'Dilnoza Karimova',
        'recipientPhone': '+998901234567',
        'itemCount': 2,
        'items': [
          {
            'id': 'i1',
            'quantity': 2,
            'nameSnapshot': {'uz': 'Nike Air Max 90'},
          },
          {
            'id': 'i2',
            'quantity': 1,
            'nameSnapshot': {'uz': 'Puma RS-X krossovkalar'},
          },
        ],
      },
    };

FakeBackend _backend() => FakeBackend((options, body) {
      if (options.path == '/api/courier/deliveries') {
        return rawJson(json.encode({
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
        }));
      }
      return apiErr(500, 'UNEXPECTED', options.path);
    });

void main() {
  setUpAll(() async {
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
}
