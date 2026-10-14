import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/home_tabs.dart';
import 'package:sellobay_customer/src/screens/notifications_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

/// O'qilmaganlik nuqtasi (ekran o'quvchi uchun «O'qilmagan» yorlig'i bilan).
final _unreadDot = find.byWidgetPredicate(
  (w) => w is Semantics && w.properties.label == 'O‘qilmagan',
);

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

Map<String, dynamic> _note(String id, {bool read = false, String? orderNumber}) => {
      'id': id,
      'title': 'Buyurtma $id yo‘lda',
      'body': 'Kuryer yo‘lga chiqdi',
      'data': {'orderNumber': ?orderNumber},
      'read': read,
      'createdAt': '2026-10-14T09:05:00.000Z',
    };

FakeBackend _backend({required List<Map<String, dynamic>> items, int unread = 1}) =>
    FakeBackend((options, body) {
      switch (options.path) {
        case '/api/auth/login':
          return apiOk({'user': userJson(), 'tokens': tokenPair('1')});
        case '/api/auth/me':
          return apiOk({'user': userJson(roles: ['CUSTOMER'])});
        case '/api/notifications':
          return apiOk({'items': items, 'unreadCount': unread, 'nextCursor': null});
        case '/api/notifications/read':
          return apiOk({'updated': 1, 'unreadCount': 0});
      }
      return apiErr(500, 'UNEXPECTED', options.path);
    });

Future<(SellobayRuntime, HomeTabsController)> _pump(
  WidgetTester tester,
  FakeBackend backend, {
  bool signIn = true,
}) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(backend, locale: uz);
  if (signIn) {
    // `await` QILINMAYDI: soxta vaqtda kadr surilmaguncha tugamaydi.
    unawaited(runtime.auth.signInWithPassword(identifier: '+998901234567', password: 'parol1234'));
  } else {
    unawaited(runtime.auth.restore());
  }
  final tabs = HomeTabsController();
  await tester.pumpWidget(
    SellobayScope(
      runtime: runtime,
      child: HomeTabsScope(
        controller: tabs,
        child: MaterialApp(theme: buildSellobayTheme(), home: const NotificationsScreen()),
      ),
    ),
  );
  await settle(tester);
  return (runtime, tabs);
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('ro`yxat ko`rsatiladi; ochilishning o`zi o`qildi qilmaydi', (tester) async {
    final backend = _backend(items: [_note('1'), _note('2', read: true)]);
    await _pump(tester, backend);

    expect(find.text('Buyurtma 1 yo‘lda'), findsOneWidget);
    expect(find.text('Buyurtma 2 yo‘lda'), findsOneWidget);
    expect(_unreadDot, findsOneWidget);
    expect(backend.calls, isNot(contains('/api/notifications/read')));
  });

  testWidgets('bosilgan xabar o`qildi deb belgilanadi', (tester) async {
    final backend = _backend(items: [_note('aaaaaaaa-1111-4111-8111-111111111111')]);
    await _pump(tester, backend);

    await tester.tap(find.textContaining('Buyurtma'));
    await settle(tester);

    expect(backend.calls, contains('/api/notifications/read'));
    expect(_unreadDot, findsNothing);
  });

  testWidgets('«Hammasini o`qildi» — bitta so`rov', (tester) async {
    final backend = _backend(items: [_note('1'), _note('2')], unread: 2);
    await _pump(tester, backend);

    await tester.tap(find.byTooltip("Hammasini o‘qildi deb belgilash"));
    await settle(tester);

    expect(backend.calls.where((c) => c == '/api/notifications/read'), hasLength(1));
    expect(_unreadDot, findsNothing);
  });

  testWidgets('buyurtma xabari Buyurtmalar bo`limiga olib boradi', (tester) async {
    final backend = _backend(items: [_note('1', orderNumber: 'SB-100')]);
    final (_, tabs) = await _pump(tester, backend);

    await tester.tap(find.textContaining('Buyurtma'));
    await settle(tester);

    expect(tabs.tab, HomeTab.orders);
  });

  testWidgets('bo`sh — nima chiqishini aytadi', (tester) async {
    await _pump(tester, _backend(items: const [], unread: 0));

    expect(find.text('Hozircha xabar yo‘q'), findsOneWidget);
  });

  testWidgets('mehmon — ro`yxat so`ralmaydi, kirish taklif qilinadi', (tester) async {
    final backend = _backend(items: [_note('1')]);
    await _pump(tester, backend, signIn: false);

    expect(backend.calls, isNot(contains('/api/notifications')));
    expect(find.text('Bildirishnomalar akkauntingizga keladi'), findsOneWidget);
  });
}
