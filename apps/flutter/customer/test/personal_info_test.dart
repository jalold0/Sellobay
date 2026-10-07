// Shaxsiy ma'lumotlar ekrani — forma.
//
// Ilgari bu forma profil ekranining ICHIDA edi; u o'sib
// borgani uchun alohida ekranga chiqarildi.

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/home_tabs.dart';
import 'package:sellobay_customer/src/screens/home_shell.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

/// Tarjima faylini HAQIQIY zonada o'qitadi.
///
/// Til almashganda `Translations.load` assetni diskdan o'qiydi.
/// `testWidgets` soxta vaqtda ishlagani uchun bu o'qish hech qachon
/// tugamaydi — qancha kadr sursak ham. `runAsync` shu bitta ish uchun
/// haqiqiy zonaga chiqaradi.
Future<void> settleAssets(WidgetTester tester) async {
  await settle(tester);
  await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 50)));
  await settle(tester);
}

/// Dangasa ro'yxatda pastdagi element qurilmaydi — avval surib
/// chiqamiz. Profil o'sgani sari bu kerak bo'ladi.
Future<void> scrollToTop(WidgetTester tester) async {
  await tester.drag(find.byType(Scrollable).first, const Offset(0, 4000));
  await settle(tester);
}

Future<void> scrollTo(WidgetTester tester, Finder target) async {
  await tester.scrollUntilVisible(
    target,
    220,
    scrollable: find.byType(Scrollable).first,
    maxScrolls: 40,
  );
  await settle(tester);
}

Future<void> settleRoute(WidgetTester tester) async {
  await settle(tester);
  await tester.pump(const Duration(milliseconds: 400));
  await settle(tester);
}

/// Oxirgi YUBORILGAN body.
///
/// `bodies.last` yaramaydi: profil so'rovidan keyin fonda sevimlilar
/// ham so'raladi va uning body'si `null`.
Map<String, dynamic> lastBody(FakeBackend backend) =>
    backend.bodies.whereType<Map<String, dynamic>>().last;

Map<String, dynamic> _user({
  String? firstName = 'Dilnoza',
  String? lastName,
  String? email,
  String locale = 'uz',
  int points = 340,
}) =>
    {
      'id': '11111111-1111-4111-8111-111111111111',
      'email': email,
      'phone': '+998901234567',
      'firstName': firstName,
      'lastName': lastName,
      'avatarUrl': null,
      'locale': locale,
      'status': 'ACTIVE',
      'loyaltyPoints': points,
      'roles': ['CUSTOMER'],
    };

/// `/api/auth/me` — GET tizimga kirishda, PATCH saqlashda.
FakeBackend _backend({
  Map<String, dynamic>? after,
  ResponseBody Function()? patch,
}) =>
    FakeBackend((options, body) {
      if (options.path == '/api/auth/me') {
        if (options.method == 'PATCH') {
          return patch?.call() ?? apiOk({'user': after ?? _user()});
        }
        return apiOk({'user': _user()});
      }
      if (options.path == '/api/auth/login') {
        return apiOk({'user': _user(), 'tokens': tokenPair('1')});
      }
      if (options.path == '/api/categories') return okJson('{"items":[]}');
      if (options.path == '/api/products') {
        return okJson('{"items":[],"total":0,"page":1,"limit":24,"hasMore":false}');
      }
      if (options.path == '/api/orders') return apiOk({'items': <Map<String, dynamic>>[]});
      if (options.path == '/api/cart') return apiOk({'cartId': 'c1', 'items': <Map<String, dynamic>>[]});
      if (options.path == '/api/wishlist') return apiOk({'productIds': <String>[]});
      return apiErr(500, 'UNEXPECTED', '${options.method} ${options.path}');
    });

/// Tizimga kirgan holatda profilni ochadi.
Future<SellobayRuntime> pumpProfile(WidgetTester tester, FakeBackend backend) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(backend, locale: uz);
  // `await` QILINMAYDI: `testWidgets` soxta vaqtda ishlaydi va kadr
  // surilmaguncha dio futurelari tugamaydi — test shu yerda osilib
  // qolardi. Kirishni boshlab, keyin kadrlarni suramiz.
  unawaited(runtime.auth.signInWithPassword(identifier: '+998901234567', password: 'parol1234'));

  await tester.pumpWidget(
    SellobayScope(
      runtime: runtime,
      child: HomeTabsScope(
        controller: HomeTabsController(),
        child: MaterialApp(theme: buildSellobayTheme(), home: const HomeShell()),
      ),
    ),
  );
  await settle(tester);
  expect(runtime.auth.isSignedIn, isTrue, reason: 'kirish tugamadi');

  await tester.tap(find.descendant(
    of: find.byType(NavigationBar),
    matching: find.byIcon(Icons.person_outline),
  ));
  await settleRoute(tester);
  return runtime;
}


/// Profilga kirib, «Shaxsiy ma'lumotlar» ekranini ochadi.
Future<SellobayRuntime> pumpPersonalInfo(WidgetTester tester, FakeBackend backend) async {
  final runtime = await pumpProfile(tester, backend);
  await tester.tap(find.widgetWithText(InkWell, "Shaxsiy ma'lumotlar"));
  await settleRoute(tester);
  return runtime;
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  group('ma`lumotlarni saqlash', () {
    testWidgets('PATCH yuboriladi va holat yangilanadi', (tester) async {
      final backend = _backend(after: _user(firstName: 'Dilnoza', lastName: 'Karimova'));
      await pumpPersonalInfo(tester, backend);

      await tester.enterText(find.widgetWithText(TextField, 'Familiya'), 'Karimova');
      await tester.tap(find.widgetWithText(FilledButton, "O'zgarishlarni saqlash"));
      await settle(tester);

      expect(backend.calls.where((c) => c == '/api/auth/me'), hasLength(2)); // GET + PATCH
      final sent = lastBody(backend);
      expect(sent['firstName'], 'Dilnoza');
      expect(sent['lastName'], 'Karimova');
      expect(find.text('Saqlandi'), findsWidgets);
    });

    testWidgets('bo`sh maydon `null` bo`lib ketadi — yuborilmay qolmaydi', (tester) async {
      // Negativ nazorat: `_compact` nullarni tashlab yuboradi, shuning
      // uchun profil uni ISHLATMAYDI. Aks holda ismni o'chirib bo'lmasdi.
      final backend = _backend(after: _user(firstName: null));
      await pumpPersonalInfo(tester, backend);

      await tester.enterText(find.widgetWithText(TextField, 'Ism'), '');
      await tester.tap(find.widgetWithText(FilledButton, "O'zgarishlarni saqlash"));
      await settle(tester);

      final sent = lastBody(backend);
      expect(sent.containsKey('firstName'), isTrue);
      expect(sent['firstName'], isNull);
    });

    testWidgets('yaroqsiz email — so`rov KETMAYDI', (tester) async {
      final backend = _backend();
      await pumpPersonalInfo(tester, backend);

      await tester.enterText(find.widgetWithText(TextField, 'Email'), 'dilnoza@');
      await tester.tap(find.widgetWithText(FilledButton, "O'zgarishlarni saqlash"));
      await settle(tester);

      expect(backend.calls.where((c) => c == '/api/auth/me'), hasLength(1)); // faqat GET
    });

    testWidgets('server «email band» desa — uning matni ko`rsatiladi', (tester) async {
      final backend = _backend(
        patch: () => apiErr(409, 'EMAIL_TAKEN', 'Bu email allaqachon band'),
      );
      await pumpPersonalInfo(tester, backend);

      await tester.enterText(find.widgetWithText(TextField, 'Email'), 'band@sellobay.uz');
      await tester.tap(find.widgetWithText(FilledButton, "O'zgarishlarni saqlash"));
      await settle(tester);

      expect(find.text('Bu email allaqachon band'), findsOneWidget);
    });
  });

}
