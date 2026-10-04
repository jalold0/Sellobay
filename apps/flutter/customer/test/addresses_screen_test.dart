import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/screens/addresses_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

const _id = 'aaaaaaaa-1111-4111-8111-111111111111';

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

Future<void> settleRoute(WidgetTester tester) async {
  await settle(tester);
  await tester.pump(const Duration(milliseconds: 400));
  await settle(tester);
}

Map<String, dynamic> _address({
  String id = _id,
  String? label = 'Uy',
  bool isDefault = false,
  String city = 'Yunusobod',
}) =>
    {
      'id': id,
      'label': label,
      'type': 'HOME',
      'recipientName': 'Dilnoza Karimova',
      'phone': '+998901234567',
      'region': 'Toshkent',
      'city': city,
      'street': 'Amir Temur 1',
      'apartment': '25-uy',
      'isDefault': isDefault,
    };

FakeBackend _backend({
  List<Map<String, dynamic>>? items,
  ResponseBody Function(String method)? write,
}) {
  var listCount = 0;
  return FakeBackend((options, body) {
    if (options.path == '/api/addresses' && options.method == 'GET') {
      listCount++;
      return apiOk({'items': items ?? const <Map<String, dynamic>>[]});
    }
    if (options.path == '/api/addresses' && options.method == 'POST') {
      return write?.call('POST') ?? apiOk({'address': _address(id: 'new', label: 'Ish')});
    }
    if (options.path.startsWith('/api/addresses/')) {
      return write?.call(options.method) ??
          apiOk({'address': _address(isDefault: true), 'deleted': true});
    }
    return apiErr(500, 'UNEXPECTED', '${options.method} ${options.path} ($listCount)');
  });
}

Future<void> pumpAddresses(WidgetTester tester, FakeBackend backend) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(backend, locale: uz);
  await tester.pumpWidget(
    SellobayScope(
      runtime: runtime,
      child: MaterialApp(theme: buildSellobayTheme(), home: const AddressesScreen()),
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

  testWidgets('bo`sh ro`yxat — TO`QIMA manzil ko`rsatilmaydi', (tester) async {
    await pumpAddresses(tester, _backend());

    expect(find.text("Hali manzillar yo'q"), findsOneWidget);
    expect(find.textContaining('Toshkent'), findsNothing);
  });

  testWidgets('manzillar ro`yxati va «Asosiy» belgisi', (tester) async {
    await pumpAddresses(
      tester,
      _backend(items: [
        _address(isDefault: true),
        _address(id: 'b2', label: 'Ish', city: 'Chilonzor'),
      ]),
    );

    expect(find.text('Uy'), findsOneWidget);
    expect(find.text('Ish'), findsOneWidget);
    expect(find.text('Toshkent, Yunusobod, Amir Temur 1, 25-uy'), findsOneWidget);
    // Belgi FAQAT asosiysida.
    expect(find.text('Asosiy'), findsNWidgets(2)); // belgi + ikkinchisidagi tugma
  });

  testWidgets('asosiy manzilda «asosiy qilish» tugmasi YO`Q', (tester) async {
    await pumpAddresses(tester, _backend(items: [_address(isDefault: true)]));

    expect(find.widgetWithText(TextButton, 'Asosiy'), findsNothing);
  });

  testWidgets('«asosiy qilish» — faqat `isDefault` yuboriladi', (tester) async {
    final backend = _backend(items: [_address()]);
    await pumpAddresses(tester, backend);

    await tester.tap(find.widgetWithText(TextButton, 'Asosiy'));
    await settle(tester);

    expect(backend.bodies.where((b) => b != null).single, {'isDefault': true});
  });

  testWidgets('o`chirish FAQAT tasdiqdan keyin', (tester) async {
    final backend = _backend(items: [_address()]);
    await pumpAddresses(tester, backend);

    await tester.tap(find.byIcon(Icons.delete_outline));
    await settleRoute(tester);
    expect(find.textContaining('o\'chirasizmi?'), findsOneWidget);

    await tester.tap(find.text('Bekor qilish'));
    await settleRoute(tester);
    expect(backend.calls.where((c) => c == '/api/addresses/$_id'), isEmpty);

    await tester.tap(find.byIcon(Icons.delete_outline));
    await settleRoute(tester);
    await tester.tap(find.widgetWithText(FilledButton, "O'chirish"));
    await settleRoute(tester);

    expect(backend.calls.where((c) => c == '/api/addresses/$_id'), hasLength(1));
  });

  testWidgets('yangi manzil qo`shiladi va ro`yxat qayta olinadi', (tester) async {
    final backend = _backend();
    await pumpAddresses(tester, backend);

    await tester.tap(find.text("Manzil qo'shish"));
    await settleRoute(tester);

    await tester.enterText(find.widgetWithText(TextField, 'Qabul qiluvchi*'), 'Dilnoza');
    await tester.enterText(find.widgetWithText(TextField, 'Telefon*'), '901234567');
    await tester.enterText(find.widgetWithText(TextField, 'Shahar*'), 'Yunusobod');
    await tester.enterText(find.widgetWithText(TextField, "Ko'cha, uy*"), 'Amir Temur 1');
    await tester.tap(find.widgetWithText(FilledButton, 'Saqlash'));
    await settleRoute(tester);

    final sent = backend.bodies.firstWhere((b) => b != null && b.containsKey('city'))!;
    // Telefon E.164 ga keltirilib yuboriladi.
    expect(sent['phone'], '+998901234567');
    expect(sent['recipientName'], 'Dilnoza');
    // Ro'yxat qayta so'raladi: asosiy manzil o'zgargan bo'lsa
    // boshqalarinikini server oldi.
    expect(backend.calls.where((c) => c == '/api/addresses'), hasLength(3)); // GET, POST, GET
  });

  group('forma tekshiruvlari', () {
    Future<FakeBackend> openForm(WidgetTester tester) async {
      final backend = _backend();
      await pumpAddresses(tester, backend);
      await tester.tap(find.text("Manzil qo'shish"));
      await settleRoute(tester);
      return backend;
    }

    testWidgets('bo`sh maydonlar — so`rov KETMAYDI', (tester) async {
      final backend = await openForm(tester);

      await tester.tap(find.widgetWithText(FilledButton, 'Saqlash'));
      await settle(tester);

      expect(find.text("Asosiy maydonlarni to'ldiring"), findsOneWidget);
      expect(backend.calls.where((c) => c == '/api/addresses'), hasLength(1)); // faqat GET
    });

    testWidgets('yaroqsiz telefon — so`rov KETMAYDI', (tester) async {
      final backend = await openForm(tester);

      await tester.enterText(find.widgetWithText(TextField, 'Qabul qiluvchi*'), 'Dilnoza');
      await tester.enterText(find.widgetWithText(TextField, 'Telefon*'), '12345');
      await tester.enterText(find.widgetWithText(TextField, 'Shahar*'), 'Yunusobod');
      await tester.enterText(find.widgetWithText(TextField, "Ko'cha, uy*"), 'Amir Temur 1');
      await tester.tap(find.widgetWithText(FilledButton, 'Saqlash'));
      await settle(tester);

      expect(find.text("Telefon raqamini to'liq kiriting"), findsOneWidget);
      expect(backend.calls.where((c) => c == '/api/addresses'), hasLength(1));
    });

    testWidgets('server xatosi formada qoladi', (tester) async {
      final backend = _backend(
        write: (method) => apiErr(400, 'VALIDATION', 'Shahar juda qisqa'),
      );
      await pumpAddresses(tester, backend);
      await tester.tap(find.text("Manzil qo'shish"));
      await settleRoute(tester);

      await tester.enterText(find.widgetWithText(TextField, 'Qabul qiluvchi*'), 'Dilnoza');
      await tester.enterText(find.widgetWithText(TextField, 'Telefon*'), '901234567');
      await tester.enterText(find.widgetWithText(TextField, 'Shahar*'), 'Yunusobod');
      await tester.enterText(find.widgetWithText(TextField, "Ko'cha, uy*"), 'Amir Temur 1');
      await tester.tap(find.widgetWithText(FilledButton, 'Saqlash'));
      await settleRoute(tester);

      // Forma yopilmaydi — kiritilgan ma'lumot yo'qolmasin.
      expect(find.text('Shahar juda qisqa'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'Dilnoza'), findsOneWidget);
    });
  });

  testWidgets('tahrirlashda maydonlar oldindan to`ladi', (tester) async {
    await pumpAddresses(tester, _backend(items: [_address()]));

    await tester.tap(find.byIcon(Icons.edit_outlined));
    await settleRoute(tester);

    expect(find.widgetWithText(TextField, 'Dilnoza Karimova'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Amir Temur 1'), findsOneWidget);
    expect(find.text('Manzilni tahrirlash'), findsOneWidget);
  });

  testWidgets('xato — qayta urinish', (tester) async {
    final backend = FakeBackend((options, body) => apiErr(500, 'SERVER', 'Ichki xato'));
    await pumpAddresses(tester, backend);

    expect(find.text('Ichki xato'), findsOneWidget);
    expect(find.text('Qayta urinish'), findsOneWidget);
  });
}
