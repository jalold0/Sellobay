// Qaytarish topshirig'i: yo'nalish, ikkala manzil, mahsulot ro'yxati.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_courier/src/external_actions.dart';
import 'package:sellobay_courier/src/screens/deliveries_screen.dart';
import 'package:sellobay_courier/src/screens/delivery_detail_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

Map<String, dynamic> _delivery({
  String kind = 'RETURN',
  String? pickup = 'Toshkent, Yunusobod, Amir Temur 1, 42-uy',
  String destination = "Tashkent Main Warehouse, Tashkent, Sanoat ko'chasi 12",
  double? lat,
  double? lng,
  List<Map<String, dynamic>>? items,
}) =>
    {
      'id': 'dddddddd-1111-4111-8111-111111111111',
      'kind': kind,
      'status': 'ASSIGNED',
      'claimed': false,
      'method': 'HOME_DELIVERY',
      'pickupAddress': pickup,
      'destinationAddress': destination,
      'destinationLat': lat,
      'destinationLng': lng,
      'pickedUpAt': null,
      'deliveredAt': null,
      'failureReason': null,
      'hasProofPhoto': false,
      'createdAt': '2026-10-05T08:00:00.000Z',
      'nextStatuses': const ['PICKED_UP', 'FAILED'],
      'order': {
        'id': 'oooooooo-1111-4111-8111-111111111111',
        'number': 'ORD-2026-00012345',
        'grandTotal': '620000',
        'placedAt': '2026-10-04T07:55:00.000Z',
        'notes': null,
        'recipientName': 'Dilnoza',
        'recipientPhone': '+998901234567',
        'itemCount': items?.length ?? 1,
        'items': items ??
            [
              {
                'id': 'i1',
                'quantity': 1,
                'nameSnapshot': {'uz': 'Nike Air Max'},
              },
            ],
      },
    };

FakeBackend _backend({List<Map<String, dynamic>> available = const []}) =>
    FakeBackend((options, body) {
      if (options.path == '/api/courier/stats') {
        return apiOk({
          'stats': {
            'today': {'delivered': 0, 'failed': 0},
            'active': 0,
            'allTimeDelivered': 0,
          },
        });
      }
      if (options.path == '/api/courier/deliveries') {
        return rawJson(json.encode({
          'success': true,
          'data': {'mine': const <Map<String, dynamic>>[], 'available': available},
        }));
      }
      return apiErr(500, 'UNEXPECTED', options.path);
    });

Future<void> pump(WidgetTester tester, FakeBackend backend, Widget home) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 1600 * 3)
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
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  group('model', () {
    test('`kind` SERVERDAN olinadi, taxmin qilinmaydi', () {
      // Bitta buyurtmada avval yetkazish, keyin qaytarish bo'lishi
      // mumkin — buyurtma holatidan yo'nalishni aniqlab bo'lmaydi.
      expect(CourierDelivery.fromJson(_delivery()).isReturn, isTrue);
      expect(CourierDelivery.fromJson(_delivery(kind: 'OUTBOUND')).isReturn, isFalse);
    });

    test('noma`lum `kind` — qaytarish DEB HISOBLANMAYDI', () {
      // Xavfsiz tomon: noma'lum qiymatni qaytarish deb olsak, kuryer
      // oddiy yetkazishda mijozdan mahsulot olib qo'yardi.
      expect(CourierDelivery.fromJson(_delivery(kind: 'ALLAQACHON_YANGI')).isReturn, isFalse);
    });
  });

  group('ro`yxat', () {
    testWidgets('qaytarish topshirig`i BELGILANADI', (tester) async {
      await pump(tester, _backend(available: [_delivery()]), const DeliveriesScreen());
      expect(find.text('Qaytarish'), findsOneWidget);
    });

    testWidgets('oddiy yetkazishda belgi YO`Q', (tester) async {
      await pump(
        tester,
        _backend(available: [_delivery(kind: 'OUTBOUND')]),
        const DeliveriesScreen(),
      );
      expect(find.text('Qaytarish'), findsNothing);
    });
  });

  group('topshiriq sahifasi', () {
    tearDown(() => urlOpener = (uri) async => false);

    testWidgets('IKKALA manzil ko`rsatiladi', (tester) async {
      await pump(
        tester,
        _backend(),
        DeliveryDetailScreen(delivery: CourierDelivery.fromJson(_delivery())),
      );

      expect(find.text('Olib ketish manzili'), findsOneWidget);
      expect(find.text('Qaytariladigan ombor'), findsOneWidget);
      expect(find.text('Toshkent, Yunusobod, Amir Temur 1, 42-uy'), findsOneWidget);
      // Yo'nalishni tushuntiruvchi izoh.
      expect(
        find.text("Mahsulotni mijozdan olib, ko'rsatilgan omborga topshiring."),
        findsOneWidget,
      );
    });

    testWidgets('oddiy yetkazishda BITTA manzil', (tester) async {
      await pump(
        tester,
        _backend(),
        DeliveryDetailScreen(delivery: CourierDelivery.fromJson(_delivery(kind: 'OUTBOUND'))),
      );
      expect(find.text('Olib ketish manzili'), findsNothing);
      expect(find.text('Manzil'), findsOneWidget);
    });

    testWidgets('mijozga yo`l MATN bo`yicha, omborga KOORDINATA bo`yicha', (tester) async {
      // `destinationLat/Lng` qaytarishda OMBORGA tegishli. Mijozning
      // koordinatasi saqlanmaydi, shuning uchun unga manzil matni
      // bo'yicha boriladi — koordinatani ishlatsak, kuryer mijoz
      // o'rniga omborga yo'naltirilardi.
      final opened = <Uri>[];
      urlOpener = (uri) async {
        opened.add(uri);
        return true;
      };

      await pump(
        tester,
        _backend(),
        DeliveryDetailScreen(
          delivery: CourierDelivery.fromJson(_delivery(lat: 41.31, lng: 69.24)),
        ),
      );

      final buttons = find.widgetWithText(OutlinedButton, "Yo'l ko'rsatish");
      expect(buttons, findsNWidgets(2));

      await tester.tap(buttons.first);
      await settle(tester);
      expect(opened.single.toString(), contains('Yunusobod'));
      expect(opened.single.toString(), isNot(contains('41.31')));

      opened.clear();
      await tester.tap(buttons.last);
      await settle(tester);
      expect(opened.single.toString(), contains('41.31,69.24'));
    });

    testWidgets('faqat SHU topshiriqdagi mahsulotlar', (tester) async {
      // Buyurtma ikki omborga bo'linganda server har bir topshiriqqa
      // o'ziga tegishli mahsulotni yuboradi. Kuryer boshqasini
      // ko'rmasligi kerak — aks holda noto'g'ri mahsulotni olib
      // ketardi.
      await pump(
        tester,
        _backend(),
        DeliveryDetailScreen(
          delivery: CourierDelivery.fromJson(
            _delivery(items: [
              {
                'id': 'i1',
                'quantity': 2,
                'nameSnapshot': {'uz': 'Nike Air Max'},
              },
            ]),
          ),
        ),
      );

      expect(find.text('Nike Air Max'), findsOneWidget);
      expect(find.text('2×'), findsOneWidget);
    });
  });
}
