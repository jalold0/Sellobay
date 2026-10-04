import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_courier/src/app.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

final _looksLikeKey = RegExp(r'^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$');

void _expectNoRawKeys(WidgetTester tester) {
  final leaked = tester
      .widgetList<Text>(find.byType(Text))
      .map((w) => w.data)
      .whereType<String>()
      .where(_looksLikeKey.hasMatch)
      .toList();
  expect(leaked, isEmpty, reason: 'tarjima qilinmagan kalitlar: $leaked');
}

/// Tillar `setUpAll` da yuklanadi: `testWidgets` tanasi soxta vaqt
/// zonasida ishlaydi va u yerda haqiqiy asset o'qish hech qachon
/// tugamaydi — test to'xtab qoladi.
late LocaleController uz;

SellobayRuntime _runtime(FakeBackend backend) =>
    buildRuntime(backend, locale: uz, requiredRole: UserRoles.courier);

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('kirish ekrani chiziladi, tugma bo`sh maydonda o`chiq', (tester) async {
    final backend = FakeBackend((options, body) => apiOk(const {}));
    final runtime = _runtime(backend);

    await tester.pumpWidget(SellobayCourierApp(runtime: runtime));
    // `restore()` chaqirilmagani uchun holat `unknown` — gate'ni
    // `signedOut` ga o'tkazamiz.
    await runtime.auth.restore();
    await tester.pumpAndSettle();

    expect(find.text('Kuryer kabineti'), findsOneWidget);
    _expectNoRawKeys(tester);

    final button = tester.widget<FilledButton>(find.byType(FilledButton));
    expect(button.onPressed, isNull, reason: 'bo`sh forma yuborilmasligi kerak');

    await tester.enterText(find.byType(TextField).first, 'kuryer@sellobay.uz');
    await tester.enterText(find.byType(TextField).last, 'parol123');
    await tester.pump();

    expect(tester.widget<FilledButton>(find.byType(FilledButton)).onPressed, isNotNull);
  });

  testWidgets('mijoz hisobi kiritilmaydi — xabar ko`rsatiladi', (tester) async {
    // Butun zanjir: login 200 -> me() da rol yo'q -> serverda logout ->
    // login ekranida kuryerga tushunarli sabab.
    final backend = FakeBackend((options, body) {
      switch (options.path) {
        case '/api/auth/login':
          return apiOk({'user': userJson(), 'tokens': tokenPair('mijoz')});
        case '/api/auth/me':
          return apiOk({
            'user': userJson(roles: ['CUSTOMER']),
          });
        case '/api/auth/logout':
          return apiOk({'loggedOut': true});
      }
      return apiErr(500, 'UNEXPECTED', options.path);
    });
    final runtime = _runtime(backend);

    await tester.pumpWidget(SellobayCourierApp(runtime: runtime));
    await runtime.auth.restore();
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).first, 'mijoz@sellobay.uz');
    await tester.enterText(find.byType(TextField).last, 'parol123');
    await tester.pump();
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(
      find.text('Bu hisobda kuryer huquqi yo\'q. Administratorga murojaat qiling.'),
      findsOneWidget,
    );
    // Sessiya serverda ham bekor qilingani — mahalliy tozalash yetarli emas.
    expect(backend.countOf('/api/auth/logout'), 1);
    expect(find.text('Bugungi yetkazib berishlar'), findsNothing);
  });

  testWidgets('kuryer kiradi va topshiriqlar ekraniga o`tadi', (tester) async {
    final backend = FakeBackend((options, body) {
      if (options.path == '/api/auth/login') {
        return apiOk({'user': userJson(), 'tokens': tokenPair('kuryer')});
      }
      if (options.path == '/api/courier/deliveries') {
        // Bo'sh ro'yxat — bu test kirish oqimini tekshiradi, topshiriq
        // mazmunini emas (u `deliveries_test.dart` da).
        return apiOk({'mine': <Map<String, dynamic>>[], 'available': <Map<String, dynamic>>[]});
      }
      return apiOk({
        'user': userJson(roles: ['CUSTOMER', 'COURIER']),
      });
    });
    final runtime = _runtime(backend);

    await tester.pumpWidget(SellobayCourierApp(runtime: runtime));
    await runtime.auth.restore();
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).first, 'kuryer@sellobay.uz');
    await tester.enterText(find.byType(TextField).last, 'parol123');
    await tester.pump();
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();

    expect(find.text('Bugungi yetkazib berishlar'), findsOneWidget);
    // Topshiriqlar ekrani ochildi: ikkala bo'lim sarlavhasi ham bor.
    expect(find.text('Mening topshiriqlarim'), findsOneWidget);
    expect(find.text("Bo'sh topshiriqlar"), findsOneWidget);
    _expectNoRawKeys(tester);
  });
}
