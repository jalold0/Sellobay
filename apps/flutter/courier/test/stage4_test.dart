// 4-bosqich: qo'ng'iroq, yo'l ko'rsatish, yetkazish isboti, statistika.

import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:sellobay_courier/src/external_actions.dart';
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

Map<String, dynamic> _delivery({
  String status = 'IN_TRANSIT',
  List<String> next = const ['ARRIVED', 'DELIVERED', 'FAILED'],
  double? lat,
  double? lng,
  bool hasProofPhoto = false,
  String? phone = '+998 90 123-45-67',
}) =>
    {
      'id': _deliveryId,
      'status': status,
      'claimed': true,
      'method': 'HOME_DELIVERY',
      'destinationAddress': 'Toshkent, Yunusobod, Amir Temur 1',
      'destinationLat': lat,
      'destinationLng': lng,
      'pickedUpAt': null,
      'deliveredAt': null,
      'failureReason': null,
      'hasProofPhoto': hasProofPhoto,
      'createdAt': '2026-10-04T08:00:00.000Z',
      'nextStatuses': next,
      'order': {
        'id': 'oooooooo-1111-4111-8111-111111111111',
        'number': 'ORD-2026-00012345',
        'grandTotal': '620000',
        'placedAt': '2026-10-04T07:55:00.000Z',
        'notes': null,
        'recipientName': 'Dilnoza',
        'recipientPhone': phone,
        'itemCount': 1,
        'items': [
          {
            'id': 'i1',
            'quantity': 1,
            'nameSnapshot': {'uz': 'Nike Air Max'},
          },
        ],
      },
    };

Map<String, dynamic> _stats({
  int delivered = 7,
  int failed = 1,
  int active = 2,
  int allTime = 143,
}) =>
    {
      'today': {'delivered': delivered, 'failed': failed},
      'active': active,
      'allTimeDelivered': allTime,
    };

FakeBackend _backend({
  Map<String, dynamic>? stats,
  bool statsFails = false,
  List<Map<String, dynamic>> mine = const [],
  ResponseBody Function()? upload,
}) =>
    FakeBackend((options, body) {
      if (options.path == '/api/courier/stats') {
        if (statsFails) return apiErr(500, 'BOOM', 'Server xatosi');
        return apiOk({'stats': stats ?? _stats()});
      }
      if (options.path == '/api/uploads/delivery-proof') {
        return upload?.call() ?? apiOk({'pathname': 'delivery-proofs/2026-10/x.jpg'});
      }
      if (options.path.endsWith('/status')) {
        return apiOk({'delivery': _delivery(status: 'DELIVERED', next: const [])});
      }
      if (options.path == '/api/courier/deliveries') {
        return rawJson(json.encode({
          'success': true,
          'data': {'mine': mine, 'available': const []},
        }));
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
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  // ---------------------------------------------------------------- URI

  group('tel: manzili', () {
    test('bo`shliq, qavs va tire olib tashlanadi, `+` QOLADI', () {
      // Ba'zi dialerlar formatlangan raqamni birinchi bo'shliqda
      // kesib tashlaydi; `+` esa xalqaro raqam uchun shart.
      expect(callUri('+998 90 123-45-67').toString(), 'tel:+998901234567');
      expect(callUri('(90) 123 45 67').toString(), 'tel:901234567');
    });
  });

  group('xarita manzillari', () {
    test('koordinata bo`lsa — geo:, keyin brauzer zaxirasi', () {
      final uris = navigationUris(latitude: 41.31, longitude: 69.24, address: 'Amir Temur 1');
      expect(uris, hasLength(2));
      expect(uris.first.scheme, 'geo');
      expect(uris.first.toString(), startsWith('geo:41.31,69.24?q=41.31,69.24'));
      // Zaxira — xarita ilovasi umuman bo'lmagan qurilma uchun.
      expect(uris.last.scheme, 'https');
      expect(uris.last.toString(), contains('41.31,69.24'));
    });

    test('koordinatasiz — manzil MATNI bo`yicha qidiriladi', () {
      final uris = navigationUris(address: 'Toshkent, Yunusobod 1');
      expect(uris, hasLength(2));
      expect(uris.first.toString(), startsWith('geo:0,0?q='));
      expect(uris.first.toString(), contains('Yunusobod'));
    });

    test('manzil ham, koordinata ham yo`q — BO`SH ro`yxat', () {
      // Ochadigan narsa yo'q: «xaritani ochib bo'lmadi» deb aytish
      // bo'sh qidiruvni ochishdan to'g'riroq.
      expect(navigationUris(address: '   '), isEmpty);
    });
  });

  group('openFirst', () {
    tearDown(() => urlOpener = (uri) async => false);

    test('birinchisi ochilmasa — IKKINCHISIGA o`tadi', () async {
      final tried = <String>[];
      urlOpener = (uri) async {
        tried.add(uri.scheme);
        return uri.scheme == 'https';
      };
      expect(await openFirst(navigationUris(latitude: 1, longitude: 2, address: 'X')), isTrue);
      expect(tried, ['geo', 'https']);
    });

    test('birinchisi OTILSA ham ikkinchisi sinaladi', () async {
      // Xarita ilovasi yo'q qurilmada platforma kanali otiladi,
      // `false` qaytarmaydi.
      final tried = <String>[];
      urlOpener = (uri) async {
        tried.add(uri.scheme);
        if (uri.scheme == 'geo') throw Exception('ActivityNotFoundException');
        return true;
      };
      expect(await openFirst(navigationUris(latitude: 1, longitude: 2, address: 'X')), isTrue);
      expect(tried, ['geo', 'https']);
    });

    test('hammasi yiqilsa — false', () async {
      urlOpener = (uri) async => false;
      expect(await openFirst(navigationUris(address: 'X')), isFalse);
    });
  });

  // ------------------------------------------------------- qo'ng'iroq

  group('qo`ng`iroq va yo`l ko`rsatish', () {
    tearDown(() => urlOpener = (uri) async => false);

    testWidgets('qo`ng`iroq tugmasi `tel:` ochadi', (tester) async {
      final opened = <Uri>[];
      urlOpener = (uri) async {
        opened.add(uri);
        return true;
      };

      await pump(
        tester,
        _backend(),
        DeliveryDetailScreen(delivery: CourierDelivery.fromJson(_delivery())),
      );
      await tester.tap(find.widgetWithText(OutlinedButton, "Qo'ng'iroq"));
      await settle(tester);

      expect(opened.single.toString(), 'tel:+998901234567');
    });

    testWidgets('telefon YO`Q — qo`ng`iroq tugmasi ham yo`q', (tester) async {
      await pump(
        tester,
        _backend(),
        DeliveryDetailScreen(delivery: CourierDelivery.fromJson(_delivery(phone: null))),
      );
      expect(find.text("Qo'ng'iroq"), findsNothing);
    });

    testWidgets('yo`l ko`rsatish koordinatani ishlatadi', (tester) async {
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
      await tester.tap(find.widgetWithText(OutlinedButton, "Yo'l ko'rsatish"));
      await settle(tester);

      expect(opened.single.scheme, 'geo');
      expect(opened.single.toString(), contains('41.31,69.24'));
    });
  });

  // ----------------------------------------------------- isbot surati

  group('yetkazish isboti', () {
    setUp(() => DeliveryDetailScreen.picker = _FakePicker());
    tearDown(() => DeliveryDetailScreen.picker = ImagePicker());

    testWidgets('surat yuklanadi va DELIVERED ga biriktiriladi', (tester) async {
      final backend = _backend();
      await pump(
        tester,
        backend,
        DeliveryDetailScreen(delivery: CourierDelivery.fromJson(_delivery())),
      );

      await tester.tap(find.widgetWithText(OutlinedButton, 'Surat olish'));
      await settle(tester);
      expect(find.text('Surat biriktirildi'), findsOneWidget);

      await tester.tap(find.widgetWithText(FilledButton, 'Yetkazdim'));
      await settle(tester);

      final sent = backend.bodies.whereType<Map<String, dynamic>>().last;
      expect(sent['status'], 'DELIVERED');
      expect(sent['proofPhotoUrl'], 'delivery-proofs/2026-10/x.jpg');
    });

    testWidgets('ORALIQ holatga surat YUBORILMAYDI', (tester) async {
      // Server oraliq holatga suratni rad etadi (`PROOF_NOT_ALLOWED`),
      // shuning uchun ilova uni umuman qo'shmaydi — aks holda butun
      // o'tish yiqilardi.
      final backend = _backend();
      await pump(
        tester,
        backend,
        DeliveryDetailScreen(delivery: CourierDelivery.fromJson(_delivery())),
      );

      await tester.tap(find.widgetWithText(OutlinedButton, 'Surat olish'));
      await settle(tester);

      await tester.tap(find.widgetWithText(FilledButton, 'Yetib keldim'));
      await settle(tester);

      final sent = backend.bodies.whereType<Map<String, dynamic>>().last;
      expect(sent['status'], 'ARRIVED');
      expect(sent.containsKey('proofPhotoUrl'), isFalse);
    });

    testWidgets('yuklash yiqilsa — biriktirilgan deb KO`RSATILMAYDI', (tester) async {
      // Eng xavfli holat: kuryer «biriktirdim» deb o'ylab ketadi,
      // surat esa hech qayerda yo'q.
      await pump(
        tester,
        _backend(upload: () => apiErr(503, 'STORAGE_UNAVAILABLE', 'Vaqtincha ishlamayapti')),
        DeliveryDetailScreen(delivery: CourierDelivery.fromJson(_delivery())),
      );

      await tester.tap(find.widgetWithText(OutlinedButton, 'Surat olish'));
      await settle(tester);

      expect(find.text('Surat biriktirildi'), findsNothing);
      expect(find.text('Vaqtincha ishlamayapti'), findsOneWidget);
    });

    testWidgets('yakuniy holatda surat tugmasi yo`q', (tester) async {
      await pump(
        tester,
        _backend(),
        DeliveryDetailScreen(
          delivery: CourierDelivery.fromJson(
            _delivery(status: 'DELIVERED', next: const [], hasProofPhoto: true),
          ),
        ),
      );
      expect(find.text('Surat olish'), findsNothing);
      // Biriktirilgani esa ko'rinadi.
      expect(find.text('Surat biriktirildi'), findsOneWidget);
    });
  });

  // ------------------------------------------------------- statistika

  group('statistika', () {
    testWidgets('serverdan kelgan raqamlar ko`rsatiladi', (tester) async {
      await pump(tester, _backend(), const DeliveriesScreen());

      expect(find.text('Bugun'), findsOneWidget);
      expect(find.text('7'), findsOneWidget);
      expect(find.text('1'), findsOneWidget);
      expect(find.text('2'), findsOneWidget);
      expect(find.text('143'), findsOneWidget);
    });

    testWidgets('statistika YIQILSA ham ro`yxat ko`rinadi', (tester) async {
      // Statistika — bezak, ro'yxat — mazmun. Ikkinchi darajali so'rov
      // butun ekranni «tarmoq xatosi» ga aylantirmasligi kerak.
      await pump(tester, _backend(statsFails: true), const DeliveriesScreen());

      expect(find.text('Bugun'), findsNothing);
      expect(find.text("Sizda faol topshiriq yo'q"), findsOneWidget);
    });
  });
}

/// Kamera o'rniga tayyor rasm qaytaradi — testda platforma kanali yo'q.
class _FakePicker extends ImagePicker {
  @override
  Future<XFile?> pickImage({
    required ImageSource source,
    double? maxWidth,
    double? maxHeight,
    int? imageQuality,
    CameraDevice preferredCameraDevice = CameraDevice.rear,
    bool requestFullMetadata = true,
  }) async =>
      XFile.fromData(Uint8List.fromList(const [1, 2, 3]), name: 'isbot.jpg');
}
