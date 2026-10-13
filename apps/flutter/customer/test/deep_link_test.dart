import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/app.dart';
import 'package:sellobay_customer/src/deep_links.dart';
import 'package:sellobay_customer/src/screens/order_detail_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

const _id = 'aaaaaaaa-1111-4111-8111-111111111111';

late LocaleController uz;

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

class _FakeSource implements OrderLinkSource {
  final controller = StreamController<String>.broadcast();

  @override
  Stream<String> get orderIds => controller.stream;
}

FakeBackend _backend() => FakeBackend((options, body) {
  if (options.path == '/api/auth/me') {
    return apiOk({
      'user': userJson(roles: ['CUSTOMER']),
    });
  }
  if (options.path == '/api/auth/login') {
    return apiOk({'user': userJson(), 'tokens': tokenPair('1')});
  }
  // Boshqa hammasi (bosh sahifa, buyurtma tafsiloti) — xato: ekran baribir
  // quriladi, bizga faqat marshrutlash kerak.
  return apiErr(500, 'UNEXPECTED', options.path);
});

class _Harness {
  _Harness(this.runtime, this.source, this.backend);

  final SellobayRuntime runtime;
  final _FakeSource source;
  final FakeBackend backend;
}

Future<_Harness> _pump(WidgetTester tester) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final backend = _backend();
  final source = _FakeSource();
  addTearDown(source.controller.close);

  final runtime = buildRuntime(backend, locale: uz);
  await tester.pumpWidget(SellobayCustomerApp(runtime: runtime, linkSources: [source]));
  await settle(tester);
  return _Harness(runtime, source, backend);
}

Future<void> _signIn(WidgetTester tester, _Harness h) async {
  // `await` QILINMAYDI: soxta vaqtda kadr surilmaguncha tugamaydi.
  unawaited(h.runtime.auth.signInWithPassword(identifier: '+998901234567', password: 'parol1234'));
  await settle(tester);
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('kirgan foydalanuvchiga buyurtma tafsiloti ochiladi', (tester) async {
    final h = await _pump(tester);
    await _signIn(tester, h);
    expect(find.byType(OrderDetailScreen), findsNothing);

    h.source.controller.add(_id);
    await settle(tester);

    expect(find.byType(OrderDetailScreen), findsOneWidget);
    expect(h.backend.calls, contains('/api/orders/$_id'));
  });

  testWidgets('kirmagan foydalanuvchiga hech narsa ochilmaydi — va keyin ham ochilmaydi', (
    tester,
  ) async {
    final h = await _pump(tester);
    // Sessiyasiz: ilova mehmon rejimida.
    unawaited(h.runtime.auth.restore());
    await settle(tester);
    expect(h.runtime.auth.status, AuthStatus.signedOut);

    h.source.controller.add(_id);
    await settle(tester);
    expect(find.byType(OrderDetailScreen), findsNothing);

    // Keyin BOSHQA hisob bilan kirilsa, begona buyurtma ochilmasin.
    await _signIn(tester, h);
    expect(find.byType(OrderDetailScreen), findsNothing);
    expect(h.backend.calls, isNot(contains('/api/orders/$_id')));
  });

  testWidgets('sessiya hali o`qilmoqda — so`rov kutadi va tiklangach bajariladi', (tester) async {
    final h = await _pump(tester);
    // `restore()` chaqirilmadi: holat `unknown`.
    expect(h.runtime.auth.status, AuthStatus.unknown);

    h.source.controller.add(_id);
    await settle(tester);
    expect(find.byType(OrderDetailScreen), findsNothing);

    await _signIn(tester, h);

    expect(find.byType(OrderDetailScreen), findsOneWidget);
  });

  testWidgets('tafsilot ochiq paytda ikkinchi havola ustiga qatlam yig`ilmaydi', (tester) async {
    final h = await _pump(tester);
    await _signIn(tester, h);

    h.source.controller.add(_id);
    await settle(tester);
    h.source.controller.add('bbbbbbbb-2222-4222-8222-222222222222');
    await settle(tester);
    // Eski ekranning chiqish animatsiyasi tugasin.
    await tester.pump(const Duration(seconds: 1));

    // Ikkinchisi birinchisini almashtiradi (popUntil first), yig`ilmaydi.
    expect(find.byType(OrderDetailScreen), findsOneWidget);
    expect(h.backend.calls, contains('/api/orders/bbbbbbbb-2222-4222-8222-222222222222'));
  });
}
