// Olib ketish punktlari — xarita va ro'yxat.
//
// Xaritaning O'ZI testda chizilmaydi (pmtiles tarmoqdan o'qiladi va
// widget testida tarmoq yo'q). Shuning uchun bu yerda ro'yxat,
// filtr va tanlash tekshiriladi — ya'ni mijoz qaror qabul qiladigan
// qism.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/map/sellobay_map.dart';
import 'package:sellobay_customer/src/screens/pickup_points_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

Map<String, dynamic> _point({
  required String id,
  required String name,
  String city = 'Toshkent',
  String street = 'Amir Temur 1',
  double? lat = 41.31,
  double? lng = 69.28,
  String? hours = 'Du-Sha 09:00-19:00',
  String? landmark,
  String type = 'PVZ',
}) =>
    {
      'id': id,
      'code': 'PVZ-$id',
      'name': {'uz': name},
      'region': 'Toshkent',
      'city': city,
      'street': street,
      'building': null,
      'district': null,
      'landmark': landmark,
      'latitude': lat,
      'longitude': lng,
      'phone': null,
      'workingHours': hours,
      'type': type,
    };

FakeBackend _backend({List<Map<String, dynamic>>? points, ResponseBody Function()? fail}) =>
    FakeBackend((options, body) {
      if (options.path == '/api/pickup-points') {
        return fail?.call() ??
            apiOk({
              'items': points ??
                  [
                    _point(id: 'p1', name: 'Yunusobod PVZ'),
                    _point(id: 'p2', name: 'Chilonzor PVZ', street: 'Bunyodkor 5'),
                    _point(id: 'p3', name: 'Samarqand PVZ', city: 'Samarqand', lat: 39.65, lng: 66.96),
                  ],
            });
      }
      return apiErr(500, 'UNEXPECTED', options.path);
    });

Future<void> pump(WidgetTester tester, FakeBackend backend, Widget home) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 1600 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(backend, locale: uz);
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
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
    // Plitkalar tarmoqdan olinmasin — qarang `SellobayMap.tilesEnabled`.
    SellobayMap.tilesEnabled = false;
  });

  tearDownAll(() => SellobayMap.tilesEnabled = true);

  testWidgets('punktlar serverdan keladi', (tester) async {
    await pump(tester, _backend(), const PickupPointsScreen());

    expect(find.text('Yunusobod PVZ'), findsOneWidget);
    expect(find.text('Samarqand PVZ'), findsOneWidget);
    // Ish vaqti ham ko'rinadi — mijoz qachon borishni bilishi kerak.
    expect(find.text('Du-Sha 09:00-19:00'), findsWidgets);
  });

  testWidgets('punkt yo`q — TO`QIMA ro`yxat ko`rsatilmaydi', (tester) async {
    await pump(
      tester,
      _backend(points: const []),
      const PickupPointsScreen(),
    );
    expect(find.text('Punktlar topilmadi'), findsOneWidget);
  });

  testWidgets('shahar bo`yicha filtr', (tester) async {
    await pump(tester, _backend(), const PickupPointsScreen());

    // Boshida hamma shahar ko'rinadi.
    expect(find.text('Yunusobod PVZ'), findsOneWidget);
    expect(find.text('Samarqand PVZ'), findsOneWidget);

    // Chiplar gorizontal ro'yxatda — hammasi bir vaqtda ekranga
    // sig'maydi, shuning uchun KO'RINADIGAN birini bosamiz.
    await tester.tap(find.widgetWithText(ChoiceChip, 'Samarqand'));
    await settle(tester);

    expect(find.text('Samarqand PVZ'), findsOneWidget);
    expect(find.text('Yunusobod PVZ'), findsNothing);

    // «Barcha shaharlar» filtrni bekor qiladi.
    await tester.tap(find.widgetWithText(ChoiceChip, 'Barcha shaharlar'));
    await settle(tester);
    expect(find.text('Yunusobod PVZ'), findsOneWidget);
  });

  testWidgets('boshlang`ich shahar oldindan tanlanadi', (tester) async {
    // Checkout'dan ochilganda formadagi shahar uzatiladi — mijoz
    // o'z shahridagi punktni darhol ko'radi.
    await pump(
      tester,
      _backend(),
      const PickupPointsScreen(initialCity: 'Samarqand'),
    );
    expect(find.text('Samarqand PVZ'), findsOneWidget);
    expect(find.text('Yunusobod PVZ'), findsNothing);
  });

  testWidgets('tanlash rejimida punkt QAYTARILADI', (tester) async {
    PickupPoint? picked;
    await pump(
      tester,
      _backend(),
      Builder(
        builder: (context) => Center(
          child: ElevatedButton(
            onPressed: () async {
              picked = await Navigator.of(context).push<PickupPoint>(
                MaterialPageRoute(
                  builder: (_) => const PickupPointsScreen(selectable: true),
                ),
              );
            },
            child: const Text('Ochish'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Ochish'));
    await settle(tester);
    await tester.pump(const Duration(milliseconds: 400));
    await settle(tester);

    await tester.tap(find.widgetWithText(FilledButton, 'Shu punktni tanlash').first);
    await settle(tester);
    await tester.pump(const Duration(milliseconds: 400));

    expect(picked, isNotNull);
    expect(picked!.name.pick('uz'), 'Yunusobod PVZ');
  });

  testWidgets('ko`rish rejimida tanlash tugmasi YO`Q', (tester) async {
    await pump(tester, _backend(), const PickupPointsScreen());
    expect(find.text('Shu punktni tanlash'), findsNothing);
  });

  testWidgets('server xatosi — xabar va qayta urinish', (tester) async {
    await pump(
      tester,
      _backend(fail: () => apiErr(500, 'INTERNAL', 'Ichki xato')),
      const PickupPointsScreen(),
    );
    expect(find.text('Ichki xato'), findsOneWidget);
    expect(find.text('Qayta urinish'), findsOneWidget);
  });

  group('model', () {
    test('koordinata SERVERDAN o`qiladi', () {
      // Ilgari model `latitude`/`longitude` ni butunlay tashlardi va
      // punktlarni xaritada ko'rsatib bo'lmasdi.
      final p = PickupPoint.fromJson(_point(id: 'p1', name: 'PVZ'));
      expect(p.latitude, 41.31);
      expect(p.longitude, 69.28);
      expect(p.hasCoordinates, isTrue);
    });

    test('koordinatasiz punkt ham o`qiladi', () {
      final p = PickupPoint.fromJson(_point(id: 'p1', name: 'PVZ', lat: null, lng: null));
      expect(p.hasCoordinates, isFalse);
    });

    test('noma`lum tur XOM saqlanadi', () {
      // Server yangi tur qo'shsa, eski ilova yiqilmasligi kerak.
      final p = PickupPoint.fromJson(_point(id: 'p1', name: 'PVZ', type: 'LOCKER'));
      expect(p.type, 'LOCKER');
    });
  });
}
