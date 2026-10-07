// Yordam markazi — aloqa kanallari serverdan keladi.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/screens/help_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

/// `realConfigResponse` ga `support` qo'shadi.
SellobayConfig _config({String? phone, String? email, String? telegram}) {
  final map = json.decode(realConfigResponse) as Map<String, dynamic>;
  map['support'] = {'phone': phone, 'email': email, 'telegram': telegram};
  return SellobayConfig.fromJson(map);
}

Future<void> pump(WidgetTester tester, {SellobayConfig? config}) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 1400 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(
    FakeBackend((o, b) => apiErr(500, 'UNEXPECTED', o.path)),
    locale: uz,
    config: config ?? _config(),
  );
  await tester.pumpWidget(
    SellobayRuntimeScope(
      runtime: runtime,
      child: TranslationsScope(
        translations: uz.translations!,
        child: AuthScope(
          controller: runtime.auth,
          child: MaterialApp(theme: buildSellobayTheme(), home: const HelpScreen()),
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

  testWidgets('sozlangan kanallar ko`rsatiladi', (tester) async {
    await pump(
      tester,
      config: _config(
        phone: '+998 71 200 00 00',
        email: 'support@sellobay.uz',
        telegram: 'sellobay_support',
      ),
    );

    expect(find.text('Telegram'), findsOneWidget);
    expect(find.text('Telefon'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
  });

  testWidgets('SOZLANMAGAN kanal ko`rsatilmaydi', (tester) async {
    // Ilgari web footer'ida `info@example.uz` turardi — o'rin egasi.
    // Bunday tugma bosilganda hech narsa ochilmasdi.
    await pump(tester, config: _config(phone: '+998 71 200 00 00'));

    expect(find.text('Telefon'), findsOneWidget);
    expect(find.text('Telegram'), findsNothing);
    expect(find.text('Email'), findsNothing);
  });

  testWidgets('kanal umuman yo`q — sabab yoziladi, bo`sh joy emas', (tester) async {
    await pump(tester, config: _config());

    expect(find.text('Aloqa kanallari hali sozlanmagan'), findsOneWidget);
    expect(find.text('Telefon'), findsNothing);
  });

  testWidgets('savollar ochiladi va yopiladi', (tester) async {
    await pump(tester, config: _config());

    const question = 'Buyurtmamni qanday kuzataman?';
    expect(find.text(question), findsOneWidget);
    // Javob boshida YASHIRIN.
    expect(find.textContaining('Buyurtmalarim'), findsNothing);

    await tester.tap(find.text(question));
    await settle(tester);
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.textContaining('Buyurtmalarim'), findsOneWidget);
  });

  group('model', () {
    test('bo`sh satr SOZLANMAGAN deb hisoblanadi', () {
      // ENV da `SUPPORT_EMAIL=` qolib ketsa, server bo'sh satr
      // yuborishi mumkin — u ham yo'qlik bilan barobar.
      final s = SupportChannels.fromJson({'phone': '  ', 'email': '', 'telegram': null});
      expect(s.isEmpty, isTrue);
    });

    test('maydon yo`q bo`lsa ham yiqilmaydi', () {
      expect(SupportChannels.fromJson(null).isEmpty, isTrue);
    });
  });
}
