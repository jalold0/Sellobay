import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/screens/login_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

/// Tarjima kalitiga o'xshash matn: `auth.loginTitle`, `common.appName`.
final _looksLikeKey = RegExp(r'^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$');

/// Tillar `setUpAll` da yuklanadi.
///
/// `testWidgets` tanasi SOXTA vaqt zonasida ishlaydi va u yerdagi haqiqiy
/// fayl/asset o'qish hech qachon tugamaydi — test to'xtab qoladi.
/// `setUpAll` esa oddiy zonada ishlaydi.
late LocaleController uz;
late LocaleController ru;

Widget wrap(Widget screen, {LocaleController? locale, FakeBackend? backend}) {
  final loc = locale ?? uz;
  final client = buildClient(backend ?? FakeBackend((options, body) => apiOk(const {})));
  final auth = AuthController(repository: client.repo);
  return SellobayRuntimeScope(
    runtime: SellobayRuntime(
      api: client.api,
      repository: client.repo,
      auth: auth,
      locale: loc,
    ),
    child: TranslationsScope(
      translations: loc.translations!,
      child: AuthScope(
        controller: auth,
        child: MaterialApp(theme: buildSellobayTheme(), home: screen),
      ),
    ),
  );
}

/// Ekranda tarjima qilinmagan kalit qolib ketmaganini tekshiradi.
///
/// `Translations.t()` topilmagan kalitni O'ZINI qaytaradi — bu ataylab,
/// yetishmayotgan tarjima ko'rinib tursin deb. Test ana shuni ushlaydi.
void expectNoRawKeys(WidgetTester tester) {
  final leaked = tester
      .widgetList<Text>(find.byType(Text))
      .map((w) => w.data)
      .whereType<String>()
      .where(_looksLikeKey.hasMatch)
      .toList();
  expect(leaked, isEmpty, reason: 'tarjima qilinmagan kalitlar: $leaked');
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    ru = LocaleController(initialLocale: 'ru');
    await uz.load();
    await ru.load();
  });

  testWidgets('kirish ekrani haqiqiy tarjimalar bilan chiziladi', (tester) async {
    await tester.pumpWidget(wrap(const LoginScreen()));

    expect(find.text('Xush kelibsiz'), findsOneWidget);
    expect(find.text('Kod olish'), findsOneWidget);
    expectNoRawKeys(tester);
  });

  testWidgets('Email bo`limida parol maydoni chiqadi', (tester) async {
    await tester.pumpWidget(wrap(const LoginScreen()));

    expect(find.text('Parol'), findsNothing);
    await tester.tap(find.text('Email').first);
    await tester.pumpAndSettle();

    expect(find.text('Parol'), findsOneWidget);
    expect(find.text('Kirish'), findsOneWidget);
    expectNoRawKeys(tester);
  });

  testWidgets('yaroqsiz telefon — xato ko`rsatiladi, so`rov ketmaydi', (tester) async {
    final backend = FakeBackend((options, body) => apiOk(const {}));
    await tester.pumpWidget(wrap(const LoginScreen(), backend: backend));

    await tester.enterText(find.byType(TextField).first, '123');
    await tester.tap(find.text('Kod olish'));
    await tester.pump();

    expect(find.text("Telefon raqamini to'liq kiriting"), findsOneWidget);
    expect(backend.calls, isEmpty);
  });

  testWidgets('to`g`ri telefon — SMS so`raladi va kod ekraniga o`tiladi', (tester) async {
    final backend = FakeBackend(
      (options, body) => apiOk({'sent': true, 'expiresInSec': 300, 'resendAfterSec': 60}),
    );
    await tester.pumpWidget(wrap(const LoginScreen(), backend: backend));

    await tester.enterText(find.byType(TextField).first, '90 123 45 67');
    await tester.tap(find.text('Kod olish'));
    await tester.pumpAndSettle();

    expect(backend.calls, ['/api/auth/otp/send']);
    // E.164 ga keltirilgan holda ketdi.
    expect(backend.bodies.first!['phone'], '+998901234567');
    // Kod ekrani ochildi va raqamni o'qiladigan ko'rinishda ko'rsatdi.
    expect(find.text('+998 90 123 45 67 raqamiga yuborildi'), findsOneWidget);
    expectNoRawKeys(tester);
  });

  testWidgets('ruscha tarjimalar ham to`liq', (tester) async {
    await tester.pumpWidget(wrap(const LoginScreen(), locale: ru));

    expect(find.text('Добро пожаловать'), findsOneWidget);
    expectNoRawKeys(tester);
  });
}
