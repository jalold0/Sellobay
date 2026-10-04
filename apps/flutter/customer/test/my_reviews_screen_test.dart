import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/screens/my_reviews_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

Map<String, dynamic> _review(String id, String productName, {int rating = 5}) => {
      'id': id,
      'rating': rating,
      'title': null,
      'body': 'Zo`r mahsulot',
      'isVerifiedPurchase': true,
      'createdAt': '2026-10-04T08:00:00.000Z',
      'author': 'Dilnoza K.',
      'userId': 'u1',
      'product': {
        'slug': 'nike-air-max',
        'name': {'uz': productName},
      },
    };

Future<void> pumpScreen(WidgetTester tester, FakeBackend backend) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  await tester.pumpWidget(
    SellobayScope(
      runtime: buildRuntime(backend, locale: uz),
      child: MaterialApp(theme: buildSellobayTheme(), home: const MyReviewsScreen()),
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

  testWidgets('sharhlar mahsulot nomi bilan chiqadi', (tester) async {
    final backend = FakeBackend(
      (options, body) => apiOk({
        'items': [_review('r1', 'Nike Air Max'), _review('r2', 'Puma RS-X', rating: 3)],
      }),
    );
    await pumpScreen(tester, backend);

    expect(backend.calls, ['/api/reviews/mine']);
    expect(find.text('Nike Air Max'), findsOneWidget);
    expect(find.text('Puma RS-X'), findsOneWidget);
    expect(find.text('Sizning sharhingiz'), findsNWidgets(2));
  });

  testWidgets('bo`sh ro`yxat', (tester) async {
    final backend = FakeBackend((options, body) => apiOk({'items': <Object>[]}));
    await pumpScreen(tester, backend);

    expect(find.text('Hali sharh yozmagansiz'), findsOneWidget);
  });

  testWidgets('o`chirish tasdiqlansa sharh ro`yxatdan chiqadi', (tester) async {
    final backend = FakeBackend((options, body) {
      if (options.method == 'DELETE') return apiOk({'ok': true});
      return apiOk({
        'items': [_review('r1', 'Nike Air Max'), _review('r2', 'Puma RS-X')],
      });
    });
    await pumpScreen(tester, backend);

    await tester.tap(find.byIcon(Icons.delete_outline).first);
    await settle(tester);
    await tester.tap(find.widgetWithText(FilledButton, "O'chirish"));
    await settle(tester);

    expect(backend.calls.last, '/api/reviews/r1');
    expect(find.text('Nike Air Max'), findsNothing);
    expect(find.text('Puma RS-X'), findsOneWidget);
  });

  testWidgets('o`chirish bekor qilinsa so`rov ketmaydi', (tester) async {
    final backend = FakeBackend(
      (options, body) => apiOk({
        'items': [_review('r1', 'Nike Air Max')],
      }),
    );
    await pumpScreen(tester, backend);

    await tester.tap(find.byIcon(Icons.delete_outline));
    await settle(tester);
    await tester.tap(find.text('Bekor qilish'));
    await settle(tester);

    expect(backend.calls, ['/api/reviews/mine']);
    expect(find.text('Nike Air Max'), findsOneWidget);
  });

  testWidgets('xato — qayta urinish', (tester) async {
    final backend = FakeBackend((options, body) => apiErr(500, 'SERVER', 'Ichki xato'));
    await pumpScreen(tester, backend);

    expect(find.text('Qayta urinish'), findsOneWidget);
  });
}
