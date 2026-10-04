import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/screens/track_order_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

Map<String, dynamic> _order({String status = 'SHIPPED'}) => {
      'order': {
        'number': 'ORD-2026-00012345',
        'status': status,
        'placedAt': '2026-10-01T09:00:00.000Z',
        'total': '620000',
        'currency': 'UZS',
        'deliveryMethod': 'HOME_DELIVERY',
        'itemCount': 2,
        'timeline': [
          {'status': 'PENDING', 'at': '2026-10-01T09:00:00.000Z'},
          {'status': 'PAID', 'at': '2026-10-01T09:05:00.000Z'},
          {'status': status, 'at': '2026-10-02T11:00:00.000Z'},
        ],
      },
    };

Future<FakeBackend> pumpTrack(WidgetTester tester, FakeBackend backend) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(backend, locale: uz);
  await tester.pumpWidget(
    SellobayScope(
      runtime: runtime,
      child: MaterialApp(theme: buildSellobayTheme(), home: const TrackOrderScreen()),
    ),
  );
  await settle(tester);
  return backend;
}

Future<void> fill(WidgetTester tester, {String number = 'ord-2026-00012345'}) async {
  await tester.enterText(find.widgetWithText(TextField, 'Buyurtma raqami'), number);
  await tester.enterText(find.widgetWithText(TextField, 'Telefon raqami'), '90 123 45 67');
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('topilgan buyurtma holati va tarixi', (tester) async {
    await pumpTrack(tester, FakeBackend((o, b) => apiOk(_order())));
    await fill(tester);
    await tester.tap(find.widgetWithText(FilledButton, 'Qidirish'));
    await settle(tester);

    // Raqam ikki joyda: kiritilgan maydonda (matn katta harfga
    // keltirilgan holda qaytmaydi) va natija kartochkasida.
    expect(find.text('ORD-2026-00012345'), findsWidgets);
    expect(find.text("620 000 so'm"), findsOneWidget);
    expect(find.text('2 ta mahsulot'), findsOneWidget);
    // Tarixdagi uchala qadam.
    expect(find.text('Kutilmoqda'), findsOneWidget);
    expect(find.text("To'landi"), findsOneWidget);
  });

  testWidgets('raqam katta harfga keltiriladi', (tester) async {
    // Server `.toUpperCase()` transformatsiyasini qo'llaydi; biz ham
    // shunday yuboramiz, aks holda jonli javob bilan taqqoslashda
    // chalkashlik bo'lardi.
    final backend = await pumpTrack(tester, FakeBackend((o, b) => apiOk(_order())));
    await fill(tester);
    await tester.tap(find.widgetWithText(FilledButton, 'Qidirish'));
    await settle(tester);

    final sent = backend.bodies.whereType<Map<String, dynamic>>().single;
    expect(sent['number'], 'ORD-2026-00012345');
    // Telefon E.164 ga keltiriladi.
    expect(sent['phone'], '+998901234567');
  });

  testWidgets('bo`sh maydonlar — so`rov KETMAYDI', (tester) async {
    final backend = await pumpTrack(tester, FakeBackend((o, b) => apiOk(_order())));

    await tester.tap(find.widgetWithText(FilledButton, 'Qidirish'));
    await settle(tester);

    expect(backend.calls, isEmpty);
  });

  testWidgets('yaroqsiz telefon — so`rov KETMAYDI', (tester) async {
    final backend = await pumpTrack(tester, FakeBackend((o, b) => apiOk(_order())));
    await tester.enterText(find.widgetWithText(TextField, 'Buyurtma raqami'), 'ORD-1');
    await tester.enterText(find.widgetWithText(TextField, 'Telefon raqami'), '12345');
    await tester.tap(find.widgetWithText(FilledButton, 'Qidirish'));
    await settle(tester);

    expect(backend.calls, isEmpty);
  });

  testWidgets('topilmadi — serverning matni', (tester) async {
    await pumpTrack(
      tester,
      FakeBackend((o, b) => apiErr(404, 'NOT_FOUND', 'Bunday buyurtma topilmadi')),
    );
    await fill(tester);
    await tester.tap(find.widgetWithText(FilledButton, 'Qidirish'));
    await settle(tester);

    expect(find.text('Bunday buyurtma topilmadi'), findsOneWidget);
  });

  testWidgets('ilova bilmaydigan holat XOM ko`rsatiladi', (tester) async {
    await pumpTrack(tester, FakeBackend((o, b) => apiOk(_order(status: 'ALLAQACHON_YANGI'))));
    await fill(tester);
    await tester.tap(find.widgetWithText(FilledButton, 'Qidirish'));
    await settle(tester);

    expect(find.text('ALLAQACHON_YANGI'), findsWidgets);
  });
}
