// 5-bosqich (ADR 0017): yorliqni skanerlab olish, mijozga kod bilan topshirish,
// naqd pul va tovar tafsilotlari.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_courier/src/courier_location.dart';
import 'package:sellobay_courier/src/screens/deliveries_screen.dart';
import 'package:sellobay_courier/src/screens/delivery_detail_screen.dart';
import 'package:sellobay_courier/src/screens/scan_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

const _id = 'dddddddd-5555-4555-8555-555555555555';

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 40));
  }
}

Map<String, dynamic> _delivery({
  String status = 'ARRIVED',
  List<String> next = const ['DELIVERED', 'FAILED'],
  String? codAmount = '620000',
  bool locked = false,
  int attemptsLeft = 5,
  String? notes = 'Domofon 25, 3-qavat',
}) => {
  'id': _id,
  'kind': 'OUTBOUND',
  'status': status,
  'claimed': true,
  'method': 'HOME_DELIVERY',
  'destinationAddress': 'Toshkent, Yunusobod, Amir Temur 1',
  'destinationLat': 41.33,
  'destinationLng': 69.28,
  'pickedUpAt': null,
  'deliveredAt': null,
  'failureReason': null,
  'hasProofPhoto': false,
  'createdAt': '2026-10-15T08:00:00.000Z',
  'nextStatuses': next,
  'parcelCode': 'SB-7K3M-9QXZ',
  'handover': {'required': true, 'attemptsLeft': attemptsLeft, 'locked': locked, 'method': null},
  'order': {
    'id': 'oooooooo-5555-4555-8555-555555555555',
    'number': 'ORD-2026-00000077',
    'grandTotal': '620000',
    'codAmount': codAmount,
    'placedAt': '2026-10-15T07:55:00.000Z',
    'notes': notes,
    'recipientName': 'Dilnoza',
    'recipientPhone': '+998901234567',
    'itemCount': 1,
    'items': [
      {
        'id': 'i1',
        'quantity': 2,
        'nameSnapshot': {'uz': 'Paxta ko‘ylak'},
        'sku': 'SHIRT-RED-M',
        'imageUrl': null,
        'variant': [
          {
            'name': {'uz': 'Rang'},
            'value': {'uz': 'Qizil'},
          },
          {
            'name': {'uz': 'O‘lcham'},
            'value': 'M',
          },
        ],
      },
    ],
  },
};

/// Kamera o'rniga: test [fire] orqali «o'qilgan» matnni yuboradi.
void Function(String)? _camera;

FakeBackend _backend({Object Function(Map<String, dynamic>? body)? onStatus}) =>
    FakeBackend((options, body) {
      if (options.path.endsWith('/status')) {
        final res = onStatus?.call(body);
        if (res != null) return res as dynamic;
        return apiOk({'delivery': _delivery(status: 'DELIVERED', next: const [])});
      }
      if (options.path == '/api/courier/scan') {
        if (body?['payload'] == 'SBP1:BADCODE1') {
          return apiErr(404, 'PARCEL_NOT_FOUND', 'Bunday posilka topilmadi');
        }
        return apiOk({
          'delivery': _delivery(status: 'PICKED_UP', next: const ['IN_TRANSIT', 'FAILED']),
          'pickedUp': true,
        });
      }
      if (options.path == '/api/courier/deliveries') {
        return apiOk({'mine': <Object>[], 'available': <Object>[]});
      }
      if (options.path == '/api/courier/stats') {
        return apiOk({
          'stats': {
            'today': {'delivered': 0, 'failed': 0},
            'active': 0,
            'allTimeDelivered': 0,
          },
        });
      }
      return apiErr(500, 'UNEXPECTED', options.path);
    });

Future<void> pump(WidgetTester tester, FakeBackend backend, Widget home) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 1400 * 3)
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
    CourierLocation.source = () async => (latitude: 41.3, longitude: 69.2);
    ScanScreen.cameraBuilder = (context, onCode) {
      _camera = onCode;
      return const ColoredBox(color: Colors.black);
    };
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  group('tafsilot', () {
    testWidgets('naqd summa, izoh, variant va SKU ko`rinadi', (tester) async {
      await pump(
        tester,
        _backend(),
        DeliveryDetailScreen(delivery: CourierDelivery.fromJson(_delivery())),
      );
      expect(find.textContaining('Naqd oling'), findsOneWidget);
      expect(find.textContaining('620'), findsWidgets);
      expect(find.text('Domofon 25, 3-qavat'), findsOneWidget);
      expect(find.text('Rang: Qizil, O‘lcham: M'), findsOneWidget);
      expect(find.text('SKU SHIRT-RED-M'), findsOneWidget);
      expect(find.text('×2'), findsOneWidget);
      expect(find.text('Posilka SB-7K3M-9QXZ'), findsOneWidget);
    });

    testWidgets('to`langan buyurtmada pul so`ralmaydi', (tester) async {
      await pump(
        tester,
        _backend(),
        DeliveryDetailScreen(delivery: CourierDelivery.fromJson(_delivery(codAmount: null))),
      );
      expect(find.textContaining('Naqd oling'), findsNothing);
      expect(find.text('To‘langan — pul olinmaydi'), findsOneWidget);
    });
  });

  group('mijozga topshirish', () {
    testWidgets('«Yetkazdim» o`rniga topshirish oynasi — kod bilan', (tester) async {
      final backend = _backend();
      await pump(
        tester,
        backend,
        DeliveryDetailScreen(delivery: CourierDelivery.fromJson(_delivery())),
      );

      await tester.tap(find.text('Mijozga topshirish'));
      await settle(tester);
      expect(find.text('5 ta urinish qoldi'), findsOneWidget);

      await tester.tap(find.text('4 xonali kodni kiritish'));
      await settle(tester);
      await tester.enterText(find.byType(TextField), '0420');
      await tester.tap(find.text('Topshirishni tasdiqlash'));
      await settle(tester);

      final sent = backend.bodies.last!;
      expect(sent['status'], 'DELIVERED');
      expect(sent['handover'], {'method': 'CODE', 'value': '0420'});
      // Joylashuv jurnalga ketadi.
      expect(sent['latitude'], 41.3);
      expect(find.text('Posilka topshirildi'), findsOneWidget);
    });

    testWidgets('mijoz QR`i skanerlanadi va yuboriladi', (tester) async {
      final backend = _backend();
      await pump(
        tester,
        backend,
        DeliveryDetailScreen(delivery: CourierDelivery.fromJson(_delivery())),
      );

      await tester.tap(find.text('Mijozga topshirish'));
      await settle(tester);
      await tester.tap(find.text('Mijoz QR kodini skanerlash'));
      await settle(tester);
      expect(find.byType(ScanScreen), findsOneWidget);

      _camera!('SBH1:7K3M9QXZ:0420');
      await settle(tester);

      expect(backend.bodies.last!['handover'], {'method': 'QR', 'value': 'SBH1:7K3M9QXZ:0420'});
      // Muvaffaqiyatda skaner yopiladi (yopilish animatsiyasidan keyin).
      await tester.pump(const Duration(seconds: 1));
      expect(find.byType(ScanScreen), findsNothing);
    });

    testWidgets('noto`g`ri kod — skaner ochiq qoladi va xato ko`rinadi', (tester) async {
      final backend = _backend(
        onStatus: (_) =>
            apiErr(400, 'HANDOVER_WRONG_PIN', 'Kod noto`g`ri. Yana 4 ta urinish qoldi'),
      );
      await pump(
        tester,
        backend,
        DeliveryDetailScreen(delivery: CourierDelivery.fromJson(_delivery())),
      );

      await tester.tap(find.text('Mijozga topshirish'));
      await settle(tester);
      await tester.tap(find.text('Mijoz QR kodini skanerlash'));
      await settle(tester);
      _camera!('SBH1:7K3M9QXZ:1111');
      await settle(tester);

      expect(find.byType(ScanScreen), findsOneWidget);
      expect(find.text('Kod noto`g`ri. Yana 4 ta urinish qoldi'), findsOneWidget);
    });

    testWidgets('kod bloklangan — faqat kodsiz variant faol', (tester) async {
      await pump(
        tester,
        _backend(),
        DeliveryDetailScreen(
          delivery: CourierDelivery.fromJson(_delivery(locked: true, attemptsLeft: 0)),
        ),
      );
      await tester.tap(find.text('Mijozga topshirish'));
      await settle(tester);

      expect(
        find.text('Kod ko‘p marta xato kiritildi — faqat surat bilan topshirish mumkin'),
        findsOneWidget,
      );
      await tester.tap(find.text('4 xonali kodni kiritish'));
      await settle(tester);
      // Varaq yopilmadi — kod dialogi ochilmadi.
      expect(find.byType(AlertDialog), findsNothing);
    });
  });

  group('yorliqni skanerlash', () {
    testWidgets('ro`yxatdan skaner — posilka olindi, keyingisi uchun ochiq', (tester) async {
      final backend = _backend();
      await pump(tester, backend, const DeliveriesScreen());

      await tester.tap(find.text('Skanerlash'));
      await settle(tester);
      _camera!('SBP1:7K3M9QXZ');
      await settle(tester);

      expect(backend.bodies.last!['payload'], 'SBP1:7K3M9QXZ');
      expect(find.text('SB-7K3M-9QXZ: Posilka olindi'), findsOneWidget);
      expect(find.byType(ScanScreen), findsOneWidget);

      _camera!('SBP1:BADCODE1');
      await settle(tester);
      expect(find.text('Bunday posilka topilmadi'), findsOneWidget);
    });

    testWidgets('kodni qo`lda kiritish', (tester) async {
      final backend = _backend();
      await pump(tester, backend, const DeliveriesScreen());

      await tester.tap(find.text('Skanerlash'));
      await settle(tester);
      await tester.enterText(find.byType(TextField), 'sb-7k3m-9qxz');
      await tester.tap(find.text('Posilkani olish'));
      await settle(tester);

      expect(backend.bodies.last!['payload'], 'sb-7k3m-9qxz');
      expect(find.text('SB-7K3M-9QXZ: Posilka olindi'), findsOneWidget);
    });
  });
}
