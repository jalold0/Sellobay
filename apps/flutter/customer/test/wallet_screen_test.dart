import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/screens/wallet_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

FakeBackend _backend() => FakeBackend((options, body) {
  if (options.path == '/api/loyalty') return apiOk(<String, dynamic>{});
  if (options.path == '/api/promo') {
    return apiOk({'items': <Map<String, dynamic>>[]});
  }
  return apiErr(500, 'UNEXPECTED', options.path);
});

Future<FakeBackend> _pump(WidgetTester tester, {int initialTab = 0}) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final backend = _backend();
  await tester.pumpWidget(
    SellobayScope(
      runtime: buildRuntime(backend, locale: uz),
      child: MaterialApp(
        theme: buildSellobayTheme(),
        home: WalletScreen(initialTab: initialTab),
      ),
    ),
  );
  await settle(tester);
  return backend;
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('bitta ekran, ikki tab: Sello Coins va Promokodlarim', (
    tester,
  ) async {
    await _pump(tester);

    expect(find.text('Hamyon'), findsOneWidget);
    expect(find.widgetWithText(Tab, 'Sello Coins'), findsOneWidget);
    expect(find.widgetWithText(Tab, 'Promokodlarim'), findsOneWidget);
  });

  testWidgets(
    'promokod tabiga o`tilganda bo`sh holat va «qo`shish» tugmasi chiqadi',
    (tester) async {
      await _pump(tester);

      await tester.tap(find.widgetWithText(Tab, 'Promokodlarim'));
      await settle(tester);

      expect(find.text("Sizda hali promokod yo'q"), findsOneWidget);
      expect(find.text("Promokod qo'shish"), findsOneWidget);
    },
  );

  testWidgets(
    'ikkala tab ham AppBar sarlavhasini bitta Scaffold bilan ulashadi',
    (tester) async {
      await _pump(tester);

      // Ichki ekranlar `embedded` — o'zlarining AppBar'ini chizmaydi.
      expect(find.byType(AppBar), findsOneWidget);
    },
  );

  testWidgets('initialTab: 1 — promokodlar tabi ochiq boshlanadi', (
    tester,
  ) async {
    await _pump(tester, initialTab: 1);

    expect(find.text("Promokod qo'shish"), findsOneWidget);
  });

  testWidgets('tab almashganda ekran qayta yuklanmaydi', (tester) async {
    final backend = await _pump(tester);
    final loads = backend.countOf('/api/loyalty');

    await tester.tap(find.widgetWithText(Tab, 'Promokodlarim'));
    await settle(tester);
    await tester.tap(find.widgetWithText(Tab, 'Sello Coins'));
    await settle(tester);

    expect(backend.countOf('/api/loyalty'), loads);
  });
}
