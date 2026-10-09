// «Promokodlarim» — hamyon va kod qo'shish.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/screens/promo_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

Map<String, dynamic> _coupon({
  String id = 'c1',
  String code = 'WELCOME10',
  String type = 'PERCENT',
  num value = 10,
  String status = 'ACTIVE',
  num? minOrder = 100000,
  String? endsAt = '2027-01-01T00:00:00.000Z',
}) =>
    {
      'id': id,
      'code': code,
      'type': type,
      'value': value,
      'minOrderTotal': minOrder,
      'maxDiscount': null,
      'endsAt': endsAt,
      'redeemedAt': null,
      'status': status,
    };

FakeBackend _backend({
  List<Map<String, dynamic>>? items,
  ResponseBody Function(Map<String, dynamic>? body)? claim,
  ResponseBody Function()? fail,
}) =>
    FakeBackend((options, body) {
      if (options.path == '/api/promo') {
        if (options.method == 'POST') {
          return claim?.call(body) ??
              apiOk({'id': 'c9', 'code': 'FREESHIP', 'alreadyHad': false});
        }
        return fail?.call() ??
            apiOk({
              'items': items ??
                  [
                    _coupon(),
                    _coupon(
                      id: 'c2',
                      code: 'FREESHIP',
                      type: 'FREE_SHIPPING',
                      value: 0,
                      minOrder: null,
                    ),
                  ],
            });
      }
      return apiErr(500, 'UNEXPECTED', options.path);
    });

Future<void> pump(WidgetTester tester, FakeBackend backend) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 1200 * 3)
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
          child: MaterialApp(theme: buildSellobayTheme(), home: const PromoScreen()),
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

  testWidgets('promokodlar serverdan keladi', (tester) async {
    await pump(tester, _backend());

    expect(find.text('WELCOME10'), findsOneWidget);
    expect(find.text('FREESHIP'), findsOneWidget);
    // Tur bo'yicha tavsif.
    expect(find.textContaining('10% chegirma'), findsOneWidget);
    expect(find.textContaining('Bepul yetkazib berish'), findsOneWidget);
  });

  testWidgets('holatni SERVER aytadi', (tester) async {
    // Klient muddat va bayroqlardan o'zi chiqarmaydi.
    await pump(
      tester,
      _backend(items: [_coupon(status: 'EXPIRED'), _coupon(id: 'c2', code: 'USED1', status: 'USED')]),
    );
    expect(find.text('MUDDATI TUGAGAN'), findsOneWidget);
    expect(find.text('ISHLATILGAN'), findsOneWidget);
  });

  testWidgets('promokod yo`q — TO`QIMA ro`yxat ko`rsatilmaydi', (tester) async {
    await pump(tester, _backend(items: const []));
    expect(find.text("Sizda hali promokod yo'q"), findsOneWidget);
  });

  testWidgets('kod qo`shiladi va KATTA harfga keltiriladi', (tester) async {
    final backend = _backend();
    await pump(tester, backend);

    await tester.tap(find.widgetWithText(FilledButton, "Promokod qo'shish"));
    await settle(tester);
    await tester.enterText(find.byType(TextField), 'freeship');
    await tester.tap(find.widgetWithText(FilledButton, "Qo'shish"));
    await settle(tester);

    final sent = backend.bodies.whereType<Map<String, dynamic>>().last;
    expect(sent['code'], 'FREESHIP');
  });

  testWidgets('allaqachon bor — XATO EMAS, boshqa xabar', (tester) async {
    // Server amalni idempotent qilgan: ikki marta qo'shish ikkita
    // nusxa yaratmaydi.
    await pump(
      tester,
      _backend(claim: (_) => apiOk({'id': 'c1', 'code': 'WELCOME10', 'alreadyHad': true})),
    );

    await tester.tap(find.widgetWithText(FilledButton, "Promokod qo'shish"));
    await settle(tester);
    await tester.enterText(find.byType(TextField), 'WELCOME10');
    await tester.tap(find.widgetWithText(FilledButton, "Qo'shish"));
    await settle(tester);

    expect(find.text('Bu promokod allaqachon hamyoningizda'), findsOneWidget);
    expect(find.text("Promokod qo'shildi"), findsNothing);
  });

  testWidgets('server xatosi — uning MATNI ko`rsatiladi', (tester) async {
    await pump(
      tester,
      _backend(claim: (_) => apiErr(404, 'NOT_FOUND', 'Promokod topilmadi')),
    );

    await tester.tap(find.widgetWithText(FilledButton, "Promokod qo'shish"));
    await settle(tester);
    await tester.enterText(find.byType(TextField), 'YOQKOD');
    await tester.tap(find.widgetWithText(FilledButton, "Qo'shish"));
    await settle(tester);

    expect(find.text('Promokod topilmadi'), findsOneWidget);
  });

  testWidgets('ro`yxat yiqilsa — xabar va qayta urinish', (tester) async {
    await pump(tester, _backend(fail: () => apiErr(500, 'INTERNAL', 'Ichki xato')));
    expect(find.text('Ichki xato'), findsOneWidget);
    expect(find.text('Qayta urinish'), findsOneWidget);
  });

  group('model', () {
    test('noma`lum tur va holat XOM saqlanadi', () {
      // Server yangi qiymat qo'shsa, eski ilova yiqilmasligi kerak.
      final c = UserCoupon.fromJson(_coupon(type: 'BOGO', status: 'PENDING'));
      expect(c.type, 'BOGO');
      expect(c.status, 'PENDING');
      expect(c.isUsable, isFalse);
    });

    test('muddatsiz kod ham o`qiladi', () {
      final c = UserCoupon.fromJson(_coupon(endsAt: null));
      expect(c.endsAt, isNull);
      expect(c.isUsable, isTrue);
    });
  });
}
