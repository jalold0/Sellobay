// Sello Coins ekrani — balans, daraja, check-in, tarix.


import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/screens/loyalty_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

Map<String, dynamic> _summary({
  int coins = 340,
  int spent = 1500000,
  bool checkedIn = false,
  List<Map<String, dynamic>>? history,
}) =>
    {
      'coins': coins,
      'spentSom': spent,
      'checkedInToday': checkedIn,
      'history': history ??
          [
            {'id': 'h1', 'type': 'earn', 'amount': 5, 'reasonKey': 'checkin', 'daysAgo': 0},
            {'id': 'h2', 'type': 'spend', 'amount': -120, 'reasonKey': 'discount', 'daysAgo': 3},
          ],
    };

FakeBackend _backend({
  Map<String, dynamic>? summary,
  ResponseBody Function()? checkin,
  ResponseBody Function()? fail,
}) =>
    FakeBackend((options, body) {
      if (options.path == '/api/loyalty') {
        return fail?.call() ?? apiOk(summary ?? _summary());
      }
      if (options.path == '/api/loyalty/checkin') {
        return checkin?.call() ??
            apiOk({'alreadyClaimed': false, 'awarded': 5, 'balance': 345});
      }
      return apiErr(500, 'UNEXPECTED', options.path);
    });

Future<SellobayRuntime> pump(WidgetTester tester, FakeBackend backend) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 2200 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(backend, locale: uz, config: testConfig());
  await tester.pumpWidget(
    SellobayRuntimeScope(
      runtime: runtime,
      child: TranslationsScope(
        translations: uz.translations!,
        child: AuthScope(
          controller: runtime.auth,
          child: MaterialApp(theme: buildSellobayTheme(), home: const LoyaltyScreen()),
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

  testWidgets('balans va coin qiymati SERVERDAN', (tester) async {
    await pump(tester, _backend());

    expect(find.text('340'), findsOneWidget);
    // Kurs `/api/config` dan: 340 * 10 = 3 400 so'm.
    expect(find.textContaining('3 400'), findsOneWidget);
  });

  testWidgets('tarix serverdan keladi', (tester) async {
    await pump(tester, _backend());

    expect(find.text('Kunlik kirish bonusi'), findsOneWidget);
    expect(find.text('Chegirmaga ishlatildi'), findsOneWidget);
    // Yig'ilgan musbat, sarflangan manfiy ko'rinishda.
    expect(find.text('+5'), findsOneWidget);
    expect(find.text('-120'), findsOneWidget);
  });

  testWidgets('bugungi yozuv «0 kun oldin» EMAS', (tester) async {
    // `{days} kun oldin` da 0 bo'lsa «0 kun oldin» chiqardi.
    await pump(tester, _backend());
    expect(find.text('Bugun'), findsOneWidget);
    expect(find.text('0 kun oldin'), findsNothing);
    expect(find.text('3 kun oldin'), findsOneWidget);
  });

  testWidgets('tarix bo`sh — TO`QIMA yozuv ko`rsatilmaydi', (tester) async {
    await pump(tester, _backend(summary: _summary(history: const [])));
    expect(find.textContaining('Hali coin tarixi yo`q'), findsNothing);
    expect(find.textContaining('Hali coin tarixi'), findsOneWidget);
  });

  testWidgets('check-in bosiladi va ro`yxat yangilanadi', (tester) async {
    final backend = _backend();
    await pump(tester, backend);

    await tester.tap(find.widgetWithText(FilledButton, 'Bugun kirib +5 coin oling'));
    await settle(tester);

    expect(backend.calls, contains('/api/loyalty/checkin'));
    // Natijadan keyin xulosa QAYTA o'qiladi — balans yangilansin.
    expect(backend.calls.where((c) => c == '/api/loyalty').length, greaterThan(1));
  });

  testWidgets('allaqachon olingan bo`lsa SOXTA «+5» ko`rsatilmaydi', (tester) async {
    // Server atomik tekshiradi; ikkinchi bosishda coin berilmaydi va
    // ilova ham «qo'shildi» deb yozmasligi kerak.
    await pump(
      tester,
      _backend(checkin: () => apiOk({'alreadyClaimed': true, 'awarded': 0, 'balance': 340})),
    );

    await tester.tap(find.widgetWithText(FilledButton, 'Bugun kirib +5 coin oling'));
    await settle(tester);

    expect(find.text("+5 Sello Coin qo'shildi!"), findsNothing);
    expect(find.textContaining('Bugun olindi'), findsWidgets);
  });

  testWidgets('bugun olingan bo`lsa tugma O`CHIQ', (tester) async {
    await pump(tester, _backend(summary: _summary(checkedIn: true)));

    expect(find.widgetWithText(FilledButton, 'Bugun kirib +5 coin oling'), findsNothing);
    final button = tester.widget<OutlinedButton>(
      find.widgetWithText(OutlinedButton, 'Bugun olindi · ertaga qaytib keling'),
    );
    expect(button.onPressed, isNull);
  });

  testWidgets('daraja xarid summasidan hisoblanadi', (tester) async {
    // 1 500 000 so'm -> Kumush (1 000 000 dan), keyingisi Oltin.
    await pump(tester, _backend());
    expect(find.text('Kumush'), findsOneWidget);
    expect(find.textContaining('Oltin'), findsOneWidget);
  });

  testWidgets('server xatosi — xabar va qayta urinish', (tester) async {
    await pump(tester, _backend(fail: () => apiErr(500, 'INTERNAL', 'Ichki xato')));
    expect(find.text('Ichki xato'), findsOneWidget);
    expect(find.text('Qayta urinish'), findsOneWidget);
  });

  group('model', () {
    test('tarix SERVERDAN o`qiladi', () {
      // Ilgari `LoyaltySummary` `history` ni butunlay tashlardi.
      final s = LoyaltySummary.fromJson(_summary());
      expect(s.history, hasLength(2));
      expect(s.history.first.reasonKey, 'checkin');
      expect(s.history.first.isEarn, isTrue);
      expect(s.history.last.isEarn, isFalse);
    });

    test('noma`lum sabab kaliti XOM saqlanadi', () {
      final s = LoyaltySummary.fromJson(_summary(history: [
        {'id': 'h1', 'amount': 10, 'reasonKey': 'yangi_sabab', 'daysAgo': 1},
      ]));
      expect(s.history.single.reasonKey, 'yangi_sabab');
    });
  });
}
