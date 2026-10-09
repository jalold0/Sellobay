// Kuryer profili va topshiriqlar tarixi.

import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_courier/src/screens/courier_history_screen.dart';
import 'package:sellobay_courier/src/screens/courier_profile_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

Map<String, dynamic> _user({String locale = 'uz'}) => {
      'id': '11111111-1111-4111-8111-111111111111',
      'email': 'courier@test.uz',
      'phone': '+998904444444',
      'firstName': 'Test',
      'lastName': 'Kuryer',
      'avatarUrl': null,
      'locale': locale,
      'status': 'ACTIVE',
      'loyaltyPoints': 0,
      'roles': ['CUSTOMER', 'COURIER'],
    };

Map<String, dynamic> _delivery(String id, String number, {String status = 'DELIVERED'}) => {
      'id': id,
      'status': status,
      'claimed': true,
      'method': 'HOME_DELIVERY',
      'destinationAddress': 'Toshkent, Yunusobod 1',
      'destinationLat': null,
      'destinationLng': null,
      'pickedUpAt': null,
      'deliveredAt': '2026-10-04T12:00:00.000Z',
      'failureReason': null,
      'hasProofPhoto': false,
      'createdAt': '2026-10-04T08:00:00.000Z',
      'nextStatuses': <String>[],
      'order': {
        'id': 'oooooooo-1111-4111-8111-111111111111',
        'number': number,
        'grandTotal': '620000',
        'placedAt': '2026-10-04T07:55:00.000Z',
        'notes': null,
        'recipientName': 'Dilnoza',
        'recipientPhone': '+998901234567',
        'itemCount': 1,
        'items': <Map<String, dynamic>>[],
      },
    };

FakeBackend _backend({
  ResponseBody Function(Map<String, dynamic> query)? history,
  ResponseBody Function()? patch,
  Map<String, dynamic>? stats,
}) =>
    FakeBackend((options, body) {
      if (options.path == '/api/auth/login') {
        return apiOk({'user': _user(), 'tokens': tokenPair('1')});
      }
      if (options.path == '/api/auth/me') {
        if (options.method == 'PATCH') {
          return patch?.call() ?? apiOk({'user': _user(locale: 'ru')});
        }
        return apiOk({'user': _user()});
      }
      if (options.path == '/api/courier/stats') {
        return apiOk({
          'stats': stats ??
              {
                'today': {'delivered': 3, 'failed': 0},
                'active': 1,
                'allTimeDelivered': 57,
              },
        });
      }
      if (options.path == '/api/courier/history') {
        final q = options.queryParameters.map((k, v) => MapEntry(k, v as Object?));
        return history?.call(q) ??
            apiOk({
              'items': [_delivery('d1', 'ORD-1')],
              'nextCursor': null,
            });
      }
      if (options.path == '/api/courier/deliveries') {
        return rawJson(json.encode({
          'success': true,
          'data': {'mine': <Map<String, dynamic>>[], 'available': <Map<String, dynamic>>[]},
        }));
      }
      return apiErr(500, 'UNEXPECTED', '${options.method} ${options.path}');
    });

Future<SellobayRuntime> pump(WidgetTester tester, FakeBackend backend, Widget home) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 1200 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(backend, locale: uz, requiredRole: UserRoles.courier);
  // `await` QILINMAYDI: soxta vaqtda kadr surilmaguncha dio futurelari
  // tugamaydi va test shu yerda osilib qolardi.
  unawaited(runtime.auth.signInWithPassword(identifier: '+998904444444', password: 'Test1234'));

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

  group('kuryer profili', () {
    testWidgets('foydalanuvchi va ko`rsatkichlar', (tester) async {
      await pump(tester, _backend(), const CourierProfileScreen());

      expect(find.text('Test Kuryer'), findsOneWidget);
      expect(find.text('+998904444444'), findsOneWidget);
      expect(find.text('57'), findsOneWidget);
    });

    testWidgets('ism TAHRIRLANMAYDI — hisobni admin yaratadi', (tester) async {
      // Kuryer hisobini administrator yaratadi, shuning uchun tahrirlash
      // maydoni bo'lsa saqlash har safar serverda rad etilardi.
      await pump(tester, _backend(), const CourierProfileScreen());
      expect(find.byType(TextField), findsNothing);
    });

    testWidgets('til almashtiriladi va SERVERGA yuboriladi', (tester) async {
      final backend = _backend();
      await pump(tester, backend, const CourierProfileScreen());

      await tester.tap(find.text('Русский'));
      await settle(tester);

      // `calls` faqat yo'lni yozadi, metodni emas; `/api/auth/me` ga
      // kirishda GET ham ketadi. Shuning uchun BODY bo'yicha
      // qaraymiz — `locale` kaliti faqat PATCH'da bo'ladi.
      final sent = backend.bodies
          .whereType<Map<String, dynamic>>()
          .where((b) => b.containsKey('locale'))
          .toList();
      expect(sent, hasLength(1), reason: 'til serverda saqlanishi kerak');
      expect(sent.single['locale'], 'ru');
    });

    testWidgets('joriy til QAYTA yuborilmaydi', (tester) async {
      final backend = _backend();
      await pump(tester, backend, const CourierProfileScreen());

      await tester.tap(find.text("O'zbekcha"));
      await settle(tester);

      expect(
        backend.bodies.whereType<Map<String, dynamic>>().where((b) => b.containsKey('locale')),
        isEmpty,
      );
    });

    testWidgets('chiqish TASDIQ so`raydi', (tester) async {
      // Ilgari chiqish AppBar'da bir bosishda ishlardi — kuryer kun
      // o'rtasida tasodifan bosib, qayta kirishga majbur bo'lardi.
      final runtime = await pump(tester, _backend(), const CourierProfileScreen());

      await tester.tap(find.text('Chiqish'));
      await settle(tester);
      expect(find.text('Bekor qilish'), findsOneWidget);

      await tester.tap(find.text('Bekor qilish'));
      await settle(tester);
      expect(runtime.auth.isSignedIn, isTrue, reason: 'bekor qilindi — chiqmasligi kerak');
    });
  });

  group('topshiriqlar tarixi', () {
    testWidgets('tugagan topshiriqlar ko`rsatiladi', (tester) async {
      await pump(tester, _backend(), const CourierHistoryScreen());
      expect(find.text('ORD-1'), findsOneWidget);
    });

    testWidgets('bo`sh tarix — TO`QIMA ro`yxat yo`q', (tester) async {
      await pump(
        tester,
        _backend(history: (_) => apiOk({'items': <Map<String, dynamic>>[], 'nextCursor': null})),
        const CourierHistoryScreen(),
      );
      expect(find.text("Hali tugagan topshiriq yo'q"), findsOneWidget);
    });

    testWidgets('«Yana yuklash» KURSOR yuboradi va qo`shib qo`yadi', (tester) async {
      final seen = <String?>[];
      final backend = _backend(history: (q) {
        final cursor = q['cursor'] as String?;
        seen.add(cursor);
        return cursor == null
            ? apiOk({
                'items': [_delivery('d1', 'ORD-1')],
                'nextCursor': 'd1',
              })
            : apiOk({
                'items': [_delivery('d2', 'ORD-2')],
                'nextCursor': null,
              });
      });
      await pump(tester, backend, const CourierHistoryScreen());

      expect(find.text('ORD-2'), findsNothing);
      await tester.tap(find.text('Yana yuklash'));
      await settle(tester);

      // Birinchisi O'RNIDA qoladi, ikkinchisi qo'shiladi.
      expect(find.text('ORD-1'), findsOneWidget);
      expect(find.text('ORD-2'), findsOneWidget);
      expect(seen, [null, 'd1']);
      // Oxiri — tugma yo'qoladi.
      expect(find.text('Yana yuklash'), findsNothing);
    });

    testWidgets('ikkinchi sahifa yiqilsa — BIRINCHISI qoladi', (tester) async {
      // Yuklangan sahifani xato ekraniga almashtirsak, kuryer
      // ko'rib turgan ma'lumotini yo'qotardi.
      var first = true;
      final backend = _backend(history: (_) {
        if (first) {
          first = false;
          return apiOk({
            'items': [_delivery('d1', 'ORD-1')],
            'nextCursor': 'd1',
          });
        }
        return apiErr(500, 'BOOM', 'Server xatosi');
      });
      await pump(tester, backend, const CourierHistoryScreen());

      await tester.tap(find.text('Yana yuklash'));
      await settle(tester);

      expect(find.text('ORD-1'), findsOneWidget);
      expect(find.text('Server xatosi'), findsOneWidget);
    });
  });
}
