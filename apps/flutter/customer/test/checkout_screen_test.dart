import 'dart:async';
import 'dart:convert';

import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/screens/checkout_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

const _product = '11111111-1111-4111-8111-111111111111';

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

CartStore _cartWithItem() => CartStore(storage: InMemoryCartStorage())
  ..add(
    CartLine.fromProduct(
      ProductSummary.fromJson({
        'id': _product,
        'slug': 'nike-air-max',
        'sku': 'NK-1',
        'name': {'uz': 'Nike Air Max'},
        'price': '300000',
        'oldPrice': null,
        'currency': 'UZS',
        'rating': 4.6,
        'reviewCount': 1,
        'soldCount': 1,
        'isFeatured': false,
        'brand': {'id': 'b', 'slug': 'nike', 'name': 'Nike'},
        'imageUrl': null,
        'category': null,
        'stock': 10,
        'inStock': true,
      }),
      quantity: 2,
    ),
  );

String _orderOk({bool replayed = false}) => json.encode({
      'success': true,
      'data': {
        'order': {
          'id': 'aaaaaaaa-1111-4111-8111-111111111111',
          'number': 'ORD-2026-00012345',
          'status': 'PENDING',
          // Server o'z hisobini qaytaradi — mijozdagi taxmin emas.
          'grandTotal': '615000',
          'placedAt': '2026-10-03T12:00:00.000Z',
          'coinsEarned': 615,
          'coinsRedeemed': 0,
          'discountSom': 5000,
          'promoDiscountSom': 5000,
          'appliedPromoCode': 'SALE10',
        },
        if (replayed) 'replayed': true,
      },
    });

/// Standart backend: to'lov usullari + buyurtma.
const _card = {
  'number': '8600 1234 5678 9012',
  'holder': 'SELLOBAY MCHJ',
  'bank': 'Uzcard',
};

FakeBackend _backend({
  List<String> providers = const ['CLICK', 'PAYME', 'CASH_ON_DELIVERY'],
  List<Map<String, dynamic>> cards = const [],
  int coins = 0,
  ResponseBody Function(int attempt)? order,
  ResponseBody Function()? receipt,
}) {
  var attempt = 0;
  return FakeBackend((options, body) {
    switch (options.path) {
      case '/api/uploads/receipt':
        return receipt?.call() ?? apiOk({'pathname': 'receipts/chek-1.jpg'});
      case '/api/payment-cards':
        return apiOk({'cards': cards, 'providers': providers});
      case '/api/auth/me':
        return apiOk({
          'user': userJson(roles: ['CUSTOMER']),
        });
      case '/api/addresses':
        return apiOk({'items': <Map<String, dynamic>>[]});
      case '/api/loyalty':
        return apiOk({
          'coins': coins,
          'spentSom': 0,
          'history': <Map<String, dynamic>>[],
          'checkedInToday': false,
        });
      case '/api/orders':
        attempt++;
        return order?.call(attempt) ?? rawJson(_orderOk());
      case '/api/payments/create':
        return apiOk({'online': true, 'checkoutUrl': null});
      case '/api/cart':
        // Buyurtmadan keyin savat tozalanadi va sinxron serverga ham
        // bo'sh ro'yxatni yozadi.
        return apiOk({'cartId': 'c1', 'items': <Map<String, dynamic>>[]});
    }
    return apiErr(500, 'UNEXPECTED', options.path);
  });
}

/// Dangasa ro'yxatda pastdagi element UMUMAN qurilmaydi — `find` uni
/// topa olmaydi. Shuning uchun avval surib chiqamiz.
Future<void> scrollTo(WidgetTester tester, Finder target) async {
  await tester.scrollUntilVisible(
    target,
    220,
    // Ekranda bir nechta suriluvchi bor (matn maydonlarining ichkisi
    // ham) — sahifanikini ANIQ ko'rsatamiz, aks holda qaysi birini
    // surishni bilmay yiqiladi.
    scrollable: find.byType(Scrollable).first,
    maxScrolls: 40,
  );
  await settle(tester);
}

Future<SellobayRuntime> pumpCheckout(
  WidgetTester tester,
  FakeBackend backend, {
  CartStore? cart,
  bool signedIn = false,
}) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(
    backend,
    locale: uz,
    config: testConfig(),
    cart: cart ?? _cartWithItem(),
    // Savat sinxroni 800 ms kutadi; test uni kutib o'tirmasin.
    cartDebounce: const Duration(milliseconds: 10),
  );
  if (signedIn) {
    // `runAsync` SHART: `testWidgets` tanasi soxta vaqt zonasida ishlaydi
    // va u yerda tarmoq zanjirini kutish hech qachon tugamaydi (soat
    // faqat `pump()` bilan suriladi, bu yerda esa hali pump yo'q).
    await tester.runAsync(() async {
      await runtime.api.session.save(access: 'a', refresh: 'r');
      await runtime.auth.restore();
    });
  }

  await tester.pumpWidget(
    SellobayRuntimeScope(
      runtime: runtime,
      child: TranslationsScope(
        translations: uz.translations!,
        child: AuthScope(
          controller: runtime.auth,
          child: CartScope(
            store: runtime.cart,
            child: MaterialApp(theme: buildSellobayTheme(), home: const CheckoutScreen()),
          ),
        ),
      ),
    ),
  );
  await settle(tester);
  return runtime;
}

/// Sahifani pastga suradi — pastdagi bo'limlar bosilishi uchun.
Future<void> scrollDown(WidgetTester tester, [double dy = -320]) async {
  await tester.drag(find.byType(Scrollable).first, Offset(0, dy));
  await settle(tester);
}

/// Element ekranning ko'rinadigan qismidami (AppBar va pastki panel orasida).
bool isOnScreen(WidgetTester tester, Finder finder) {
  final rect = tester.getRect(finder);
  final viewport = tester.getRect(find.byType(Scrollable).first);
  return rect.top >= viewport.top - 1 && rect.bottom <= viewport.bottom + 1;
}

/// Majburiy maydonlarni to'ldiradi.
Future<void> fillAddress(WidgetTester tester) async {
  await tester.enterText(find.widgetWithText(TextField, 'Ism*'), 'Dilnoza');
  await tester.enterText(find.widgetWithText(TextField, 'Telefon*'), '90 123 45 67');
  await tester.enterText(find.widgetWithText(TextField, 'Shahar/tuman*'), 'Yunusobod');
  await tester.enterText(find.widgetWithText(TextField, "Ko'cha, uy raqami*"), 'Amir Temur 1');
  await settle(tester);
}

Future<void> submit(WidgetTester tester) async {
  await tester.tap(find.widgetWithText(FilledButton, 'Buyurtmani tasdiqlash'));
  await settle(tester);
  // Marshrut o'tishi + savat sinxronining kechikishi.
  await tester.pump(const Duration(milliseconds: 400));
  await settle(tester);
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('to`lov usullari SERVERDAN keladi', (tester) async {
    final backend = _backend(providers: ['PAYME', 'CASH_ON_DELIVERY']);
    await pumpCheckout(tester, backend, signedIn: true);
    await scrollDown(tester);

    expect(find.text('Payme'), findsOneWidget);
    expect(find.text('Naqd pul'), findsOneWidget);
    // Server bermagan usul ko'rsatilmaydi — sozlanmagan Click'ni tanlab,
    // mijoz buzuq to'lov sahifasiga tushmasin.
    expect(find.text('Click'), findsNothing);
  });

  testWidgets('mehmonga FAQAT naqd pul taklif qilinadi', (tester) async {
    // `/api/payments/create` auth talab qiladi (401), ya'ni mehmon
    // onlayn to'lovni boshlay olmaydi.
    await pumpCheckout(tester, _backend());
    await scrollDown(tester);

    expect(find.text('Naqd pul'), findsOneWidget);
    expect(find.text('Click'), findsNothing);
    expect(find.text('Payme'), findsNothing);
  });

  testWidgets('bo`sh forma yuborilmaydi — xato MAYDONLARDA, fokus birinchisida', (tester) async {
    // Ilgari xato sahifa tepasidagi chiziqqa yozilardi, mijoz esa
    // pastdagi tugmani bosib turardi — u xatoni ko'rmasdi.
    final backend = _backend();
    await pumpCheckout(tester, backend);
    // Mijoz pastda — tugma yonida.
    await scrollDown(tester, -2000);

    await submit(tester);

    expect(backend.calls.where((c) => c == '/api/orders'), isEmpty);
    // Ism, telefon, shahar, ko'cha — har biri o'z xatosi bilan.
    expect(find.text("Bu maydonni to'ldiring"), findsNWidgets(4));
    // Birinchi noto'g'ri maydon fokusda va ko'rinadigan joyda.
    final name = find.widgetWithText(TextField, 'Ism*');
    expect(tester.widget<TextField>(name).focusNode!.hasFocus, isTrue);
    expect(isOnScreen(tester, name), isTrue);
    // Tepadagi umumiy chiziq ishlatilmaydi.
    expect(find.text("Majburiy maydonlarni to'ldiring"), findsNothing);

    // Maydon tuzatilsa uning xatosi o'chadi, boshqalariniki qoladi.
    await tester.enterText(name, 'Dilnoza');
    await settle(tester);
    expect(find.text("Bu maydonni to'ldiring"), findsNWidgets(3));
  });

  testWidgets('hudud RO`YXATDAN tanlanadi, standart — Toshkent shahri', (tester) async {
    await pumpCheckout(tester, _backend(), signedIn: true);

    // Erkin matn maydoni emas — serverdagi ro'yxat (web bilan bir xil).
    expect(find.widgetWithText(TextField, 'Viloyat'), findsNothing);
    expect(find.text('Toshkent shahri'), findsOneWidget);
    expect(find.text('Xaritadan belgilash'), findsOneWidget);
  });

  testWidgets('server xatosida tepadagi chiziq KO`RINADIGAN joyga suriladi', (tester) async {
    final backend = _backend(order: (_) => apiErr(500, 'SERVER', 'Ichki xato'));
    await pumpCheckout(tester, backend, signedIn: true);
    await fillAddress(tester);
    await scrollDown(tester, -2000);

    await submit(tester);
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text('Ichki xato'), findsOneWidget);
    expect(isOnScreen(tester, find.text('Ichki xato')), isTrue);
  });

  testWidgets('promokod xatosi promokod qatorida', (tester) async {
    final backend = FakeBackend((options, body) {
      if (options.path == '/api/promo/validate') return offline(options);
      return _backend().handler(options, body);
    });
    await pumpCheckout(tester, backend, signedIn: true);
    await scrollTo(tester, find.text("Qo'llash"));

    await tester.enterText(find.byType(TextField).last, 'SALE10');
    await tester.tap(find.text("Qo'llash"));
    await settle(tester);

    final promoField = tester.widget<TextField>(find.byType(TextField).last);
    expect(promoField.decoration!.errorText, isNotNull);
    // Tepadagi chiziqqa yozilmaydi.
    expect(tester.widget<FormErrorBanner>(find.byType(FormErrorBanner)).message, isNull);
  });

  group('yuklash tartibi', () {
    Map<String, dynamic> savedAddress() => {
          'id': 'addr-1',
          'label': 'Uy',
          'type': 'HOME',
          'recipientName': 'Dilnoza Karimova',
          'phone': '+998901112233',
          'region': 'Toshkent',
          'city': 'Yunusobod',
          'street': 'Registon 5',
          'apartment': null,
          'latitude': null,
          'longitude': null,
          'isDefault': true,
          'createdAt': '2026-10-01T00:00:00.000Z',
        };

    testWidgets('so`rovlar PARALLEL, forma hammasi kelgach ochiladi', (tester) async {
      final options = Completer<ResponseBody>();
      final addresses = Completer<ResponseBody>();
      final base = _backend();
      final backend = FakeBackend((o, body) {
        if (o.path == '/api/payment-cards') return options.future;
        if (o.path == '/api/addresses') return addresses.future;
        return base.handler(o, body);
      });
      await pumpCheckout(tester, backend, signedIn: true);

      // Ikkalasi bir vaqtda so'ralgan — ketma-ket bo'lsa manzillar
      // to'lov usullari kelguncha so'ralmasdi.
      expect(backend.calls, containsAll(['/api/payment-cards', '/api/addresses']));
      // Forma hali yo'q — mijoz yozib ulgurgan matn ustidan yozilmasin.
      expect(find.byType(TextField), findsNothing);

      options.complete(apiOk({'cards': <Map<String, dynamic>>[], 'providers': ['CASH_ON_DELIVERY']}));
      await settle(tester);
      expect(find.byType(TextField), findsNothing);

      addresses.complete(apiOk({'items': [savedAddress()]}));
      await settle(tester);

      // Asosiy manzil oldindan to'ldirildi (profil ismi emas — manzil aniqroq).
      expect(find.widgetWithText(TextField, 'Dilnoza Karimova'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'Registon 5'), findsOneWidget);
    });

    testWidgets('saqlangan manzil chipi formani to`liq almashtiradi', (tester) async {
      final base = _backend();
      final backend = FakeBackend((o, body) {
        if (o.path == '/api/addresses') return apiOk({'items': [savedAddress()]});
        return base.handler(o, body);
      });
      await pumpCheckout(tester, backend, signedIn: true);

      await tester.enterText(find.widgetWithText(TextField, 'Registon 5'), 'Boshqa ko`cha 1');
      await settle(tester);
      // Mijoz chipni O'ZI bosdi — bu aniq buyruq, ustidan yoziladi.
      await tester.tap(find.widgetWithText(ActionChip, 'Uy'));
      await settle(tester);

      expect(find.widgetWithText(TextField, 'Registon 5'), findsOneWidget);
    });
  });

  testWidgets('yaroqsiz telefon — so`rov ketmaydi', (tester) async {
    final backend = _backend();
    await pumpCheckout(tester, backend, signedIn: true);

    await tester.enterText(find.widgetWithText(TextField, 'Ism*'), 'Dilnoza');
    await tester.enterText(find.widgetWithText(TextField, 'Telefon*'), '123');
    await tester.enterText(find.widgetWithText(TextField, 'Shahar/tuman*'), 'Yunusobod');
    await tester.enterText(find.widgetWithText(TextField, "Ko'cha, uy raqami*"), 'Amir Temur 1');
    await submit(tester);

    expect(find.text("Telefon raqamini to'liq kiriting"), findsOneWidget);
    expect(backend.calls.where((c) => c == '/api/orders'), isEmpty);
  });

  testWidgets('buyurtma yaratiladi, savat tozalanadi, SERVER summasi ko`rsatiladi',
      (tester) async {
    final backend = _backend();
    final runtime = await pumpCheckout(tester, backend, signedIn: true);

    await fillAddress(tester);
    await submit(tester);

    final sent = backend.bodies[backend.calls.indexOf('/api/orders')]!;
    expect((sent['items'] as List).single, {'productId': _product, 'quantity': 2});
    // Telefon E.164 ga keltirilgan.
    expect(sent['phone'], '+998901234567');
    expect(sent['recipientName'], 'Dilnoza');

    expect(find.text('ORD-2026-00012345'), findsOneWidget);
    // Mijozdagi taxmin 600 000 edi; ekranda SERVERNING 615 000 i turadi.
    expect(find.text("615 000 so'm"), findsOneWidget);
    expect(runtime.cart.isEmpty, isTrue);
  });

  testWidgets('qayta urinishda `Idempotency-Key` O`ZGARMAYDI', (tester) async {
    // Eng muhim tekshiruv: kalit har urinishda yangilansa, tarmoq uzilib
    // qayta yuborilganda server ikkinchi buyurtma yaratardi.
    final backend = _backend(
      order: (attempt) =>
          attempt == 1 ? apiErr(500, 'SERVER', 'Ichki xato') : rawJson(_orderOk()),
    );
    await pumpCheckout(tester, backend, signedIn: true);

    await fillAddress(tester);
    await submit(tester);
    expect(find.text('Ichki xato'), findsOneWidget);

    await submit(tester);

    final keys = [
      for (var i = 0; i < backend.calls.length; i++)
        if (backend.calls[i] == '/api/orders') backend.headers[i]['Idempotency-Key'],
    ];
    expect(keys, hasLength(2));
    expect(keys.first, keys.last);
    expect(keys.first, isNotNull);
  });

  testWidgets('`replayed` javob ham MUVAFFAQIYAT', (tester) async {
    // Server ayni kalitni ikkinchi marta ko'rdi va birinchi buyurtmani
    // qaytardi. Bu xato emas.
    final backend = _backend(order: (_) => rawJson(_orderOk(replayed: true)));
    final runtime = await pumpCheckout(tester, backend, signedIn: true);

    await fillAddress(tester);
    await submit(tester);

    expect(find.text('ORD-2026-00012345'), findsOneWidget);
    expect(runtime.cart.isEmpty, isTrue);
  });

  testWidgets('zaxira yetmasa — serverning matni, savat SAQLANADI', (tester) async {
    final backend = _backend(
      order: (_) => apiErr(
        409,
        'STOCK_INSUFFICIENT',
        '«Nike Air Max» omborda yetarli emas (1 dona qoldi)',
      ),
    );
    final runtime = await pumpCheckout(tester, backend, signedIn: true);

    await fillAddress(tester);
    await submit(tester);

    expect(find.textContaining('omborda yetarli emas'), findsOneWidget);
    // Buyurtma yaratilmadi — savatni tozalash xato bo'lardi.
    expect(runtime.cart.isEmpty, isFalse);
    expect(find.text('ORD-2026-00012345'), findsNothing);
  });

  testWidgets('hech qanday to`lov usuli yo`q — tugma o`chiq', (tester) async {
    await pumpCheckout(tester, _backend(providers: const []), signedIn: true);

    final button = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Buyurtmani tasdiqlash'),
    );
    expect(button.onPressed, isNull);
  });

  group('qo`lda karta to`lovi (UZCARD)', () {
    setUp(() {
      CheckoutScreen.picker = _FakePicker();
      addTearDown(() => CheckoutScreen.picker = ImagePicker());
    });

    testWidgets('karta YO`Q bo`lsa usul TAKLIF QILINMAYDI', (tester) async {
      // Server `MANUAL_PAYMENT_CARDS` sozlanmagan bo'lsa bo'sh ro'yxat
      // qaytaradi. Usulni ko'rsatsak, mijoz qayerga pul o'tkazishini
      // bilmasdi.
      await pumpCheckout(tester, _backend(), signedIn: true);
      // Boshqa usullargacha surib boramiz — «Karta» chindan ham yo'qmi,
      // yoki shunchaki qurilmaganmi, shu bilan ajratiladi.
      await scrollTo(tester, find.text('Naqd pul'));

      expect(find.text('Karta'), findsNothing);
    });

    testWidgets('karta BOR bo`lsa raqam va summa ko`rinadi', (tester) async {
      await pumpCheckout(tester, _backend(cards: [_card]), signedIn: true);

      await scrollTo(tester, find.text('Karta'));
      await tester.tap(find.text('Karta'));
      await settle(tester);

      expect(find.text('8600 1234 5678 9012'), findsOneWidget);
      expect(find.textContaining('SELLOBAY MCHJ'), findsOneWidget);
      expect(find.text("O'tkaziladigan summa"), findsOneWidget);
      expect(find.text('Chekni yuklash'), findsOneWidget);
    });

    testWidgets('cheksiz yuborilmaydi', (tester) async {
      // Serverda ham chek majburiy (`400 RECEIPT_REQUIRED`).
      final backend = _backend(cards: [_card]);
      await pumpCheckout(tester, backend, signedIn: true);
      // Manzil to'ldiriladi — aks holda to'xtatuvchi sabab boshqa
      // bo'lib, chek tekshiruviga yetib ham bormasdik.
      await fillAddress(tester);

      await scrollTo(tester, find.text('Karta'));
      await tester.tap(find.text('Karta'));
      await settle(tester);
      await tester.tap(find.text('Buyurtmani tasdiqlash'));
      await settle(tester);

      expect(backend.countOf('/api/orders'), 0);
      // Xato chizig'i sahifa tepasida.
      await tester.scrollUntilVisible(
        find.text('Chek (kvitansiya) rasmini yuklang'),
        -220,
        scrollable: find.byType(Scrollable).first,
        maxScrolls: 40,
      );
      expect(find.text('Chek (kvitansiya) rasmini yuklang'), findsOneWidget);
    });

    testWidgets('chek YO`LI buyurtmaga qo`shiladi', (tester) async {
      // Rasmning o'zi emas, yo'l yuboriladi: chek alohida so'rov bilan
      // oldindan yuklanadi.
      final backend = _backend(cards: [_card]);
      await pumpCheckout(tester, backend, signedIn: true);
      await fillAddress(tester);

      await scrollTo(tester, find.text('Karta'));
      await tester.tap(find.text('Karta'));
      await settle(tester);
      await scrollTo(tester, find.text('Chekni yuklash'));
      await tester.tap(find.text('Chekni yuklash'));
      await settle(tester);
      expect(find.text('Chek yuklandi'), findsOneWidget);
      expect(backend.countOf('/api/uploads/receipt'), 1);

      await scrollTo(tester, find.widgetWithText(TextField, "To'lov izohi (ixtiyoriy)"));
      await tester.enterText(
        find.widgetWithText(TextField, "To'lov izohi (ixtiyoriy)"),
        'oxirgi 4 raqam 1234',
      );
      await tester.tap(find.text('Buyurtmani tasdiqlash'));
      await settle(tester);

      final sent = backend.bodies[backend.calls.indexOf('/api/orders')]!;
      expect(sent['paymentProvider'], 'UZCARD');
      expect(sent['paymentReceipt'], 'receipts/chek-1.jpg');
      expect(sent['paymentNote'], 'oxirgi 4 raqam 1234');
    });

    testWidgets('yuklash yiqilsa chek SAQLANMAYDI', (tester) async {
      // Aks holda mijoz chek yuklangan deb o'ylab, buyurtma esa
      // serverda rad etilardi.
      final backend = _backend(
        cards: [_card],
        receipt: () => apiErr(400, 'VALIDATION', 'Rasm juda katta'),
      );
      await pumpCheckout(tester, backend, signedIn: true);

      await scrollTo(tester, find.text('Karta'));
      await tester.tap(find.text('Karta'));
      await settle(tester);
      await scrollTo(tester, find.text('Chekni yuklash'));
      await tester.tap(find.text('Chekni yuklash'));
      await settle(tester);

      expect(find.text('Chekni yuklash'), findsOneWidget);
      expect(find.text('Chek yuklandi'), findsNothing);
      // Xato chizig'i sahifaning TEPASIDA — pastga surilgan holda u
      // dangasa ro'yxatdan chiqib ketadi.
      await tester.scrollUntilVisible(
        find.text('Rasm juda katta'),
        -220,
        scrollable: find.byType(Scrollable).first,
        maxScrolls: 40,
      );
      expect(find.text('Rasm juda katta'), findsOneWidget);
    });

    testWidgets('qo`lda karta ONLAYN emas — to`lov sahifasi ochilmaydi', (tester) async {
      final backend = _backend(cards: [_card]);
      await pumpCheckout(tester, backend, signedIn: true);
      await fillAddress(tester);

      await scrollTo(tester, find.text('Karta'));
      await tester.tap(find.text('Karta'));
      await settle(tester);
      await scrollTo(tester, find.text('Chekni yuklash'));
      await tester.tap(find.text('Chekni yuklash'));
      await settle(tester);
      await tester.tap(find.text('Buyurtmani tasdiqlash'));
      await settle(tester);

      expect(backend.countOf('/api/orders'), 1);
      expect(backend.countOf('/api/payments/create'), 0);
    });

    testWidgets('mehmonga ham ochiq — onlayn usullar esa yashiriladi', (tester) async {
      // `/api/uploads/criteria` auth talab qilmaydi, `payments/create` esa
      // 401 beradi.
      await pumpCheckout(tester, _backend(cards: [_card]));
      await scrollTo(tester, find.text('Karta'));

      expect(find.text('Karta'), findsOneWidget);
      expect(find.text('Click'), findsNothing);
    });
  });

  group('Sello Coins', () {
    testWidgets('balans NOL bo`lsa bo`lim ko`rsatilmaydi', (tester) async {
      // Nolga teng kalitni bosib ko'rgan mijoz nima bo'lmaganini
      // tushunmasdi.
      await pumpCheckout(tester, _backend(), signedIn: true);

      expect(find.text('Sello Coins ishlatish'), findsNothing);
    });

    testWidgets('balans bor — kalit va summa ko`rinadi', (tester) async {
      // Savatda 2 x 300 000 = 600 000 (yetkazish tekin, chegara
      // 500 000). 1 coin = 10 so'm, ya'ni 500 coin bemalol sig'adi.
      await pumpCheckout(tester, _backend(coins: 500), signedIn: true);
      await scrollTo(tester, find.text('Sello Coins ishlatish'));

      expect(find.text('Sello Coins ishlatish'), findsOneWidget);
      expect(find.textContaining('500 coin'), findsOneWidget);
    });

    testWidgets('kalit yoqilmasa coin YUBORILMAYDI', (tester) async {
      final backend = _backend(coins: 500);
      await pumpCheckout(tester, backend, signedIn: true);
      await fillAddress(tester);
      await tester.tap(find.text('Buyurtmani tasdiqlash'));
      await settle(tester);

      final sent = backend.bodies[backend.calls.indexOf('/api/orders')]!;
      expect(sent.containsKey('redeemCoins'), isFalse);
    });

    testWidgets('yoqilsa coin soni yuboriladi', (tester) async {
      final backend = _backend(coins: 500);
      await pumpCheckout(tester, backend, signedIn: true);
      await fillAddress(tester);
      await scrollTo(tester, find.text('Sello Coins ishlatish'));
      await tester.tap(find.byType(SwitchListTile));
      await settle(tester);

      await tester.tap(find.text('Buyurtmani tasdiqlash'));
      await settle(tester);

      final sent = backend.bodies[backend.calls.indexOf('/api/orders')]!;
      expect(sent['redeemCoins'], 500);
    });

    testWidgets('buyurtma summasidan OSHIB ketmaydi', (tester) async {
      // Savat 600 000 so'm, 1 coin = 10 so'm -> ko'pi bilan 60 000
      // coin sig'adi. Serverda ham shunday cheklanadi (`maxByTotal`).
      final backend = _backend(coins: 100000);
      await pumpCheckout(tester, backend, signedIn: true);
      await fillAddress(tester);
      await scrollTo(tester, find.text('Sello Coins ishlatish'));
      await tester.tap(find.byType(SwitchListTile));
      await settle(tester);
      await tester.tap(find.text('Buyurtmani tasdiqlash'));
      await settle(tester);

      final sent = backend.bodies[backend.calls.indexOf('/api/orders')]!;
      // 600 000 / 10 = 60 000 ta coin.
      expect(sent['redeemCoins'], 60000);
    });

    testWidgets('mehmonda bo`lim YO`Q — `/api/loyalty` 401 beradi', (tester) async {
      final backend = _backend(coins: 500);
      await pumpCheckout(tester, backend);

      expect(backend.countOf('/api/loyalty'), 0);
      expect(find.text('Sello Coins ishlatish'), findsNothing);
    });
  });

  group('hudud va xarita', () {
    Map<String, dynamic> address({
      required String region,
      required String city,
      double? lat,
      double? lng,
    }) =>
        {
          'id': 'addr-${city.toLowerCase()}',
          'label': city,
          'type': 'HOME',
          'recipientName': 'Dilnoza Karimova',
          'phone': '+998901112233',
          'region': region,
          'city': city,
          'street': 'Registon 5',
          'apartment': null,
          'latitude': lat,
          'longitude': lng,
          'isDefault': true,
          'createdAt': '2026-10-01T00:00:00.000Z',
        };

    final samarqandPoint = {
      'id': 'pp-sam',
      'code': 'SAM-1',
      'provider': 'SELLOBAY',
      'name': {'uz': 'Samarqand markaz'},
      'region': 'Samarqand',
      'city': 'Samarqand',
      'district': null,
      'street': 'Registon ko`chasi 15',
      'building': null,
      'landmark': null,
      'latitude': 39.65,
      'longitude': 66.96,
      'phone': null,
      'workingHours': 'Du-Sha 09:00-19:00',
      'type': 'PVZ',
      'regionSlug': 'samarqand',
    };

    testWidgets('viloyat manzili — uy maydonlari yo`q, faqat filial', (tester) async {
      final base = _backend();
      final backend = FakeBackend((o, body) {
        if (o.path == '/api/addresses') {
          return apiOk({
            'items': [address(region: 'Samarqand viloyati', city: 'Samarqand')],
          });
        }
        if (o.path == '/api/pickup-points') return apiOk({'items': [samarqandPoint]});
        return base.handler(o, body);
      });
      await pumpCheckout(tester, backend, signedIn: true);

      expect(find.text('Samarqand viloyati'), findsOneWidget);
      // Uygacha yetkazilmaydi — ko'cha va xarita so'ralmaydi.
      expect(find.widgetWithText(TextField, "Ko'cha, uy raqami*"), findsNothing);
      expect(find.text('Xaritadan belgilash'), findsNothing);
      await scrollTo(tester, find.textContaining('filialdan olasiz').last);
      expect(find.text('Uyga yetkazib berish'), findsNothing);
    });

    testWidgets('koordinatali Toshkent manzili — nuqta buyurtmaga ketadi', (tester) async {
      final base = _backend(providers: const ['CASH_ON_DELIVERY']);
      final backend = FakeBackend((o, body) {
        if (o.path == '/api/addresses') {
          return apiOk({
            'items': [address(region: 'Toshkent', city: 'Yunusobod', lat: 41.3111, lng: 69.2797)],
          });
        }
        return base.handler(o, body);
      });
      await pumpCheckout(tester, backend, signedIn: true);

      expect(find.text('Nuqtani o‘zgartirish'), findsOneWidget);
      await submit(tester);

      final sent = backend.bodies[backend.calls.indexOf('/api/orders')]!;
      expect(sent['latitude'], 41.3111);
      expect(sent['longitude'], 69.2797);
      expect(sent['region'], 'Toshkent shahri');
    });
  });
}

/// Galereya o'rniga tayyor rasm qaytaradi.
///
/// Haqiqiy tanlovchi platforma kanaliga chiqadi, testda esa platforma
/// yo'q — chaqiruv javobsiz osilib qolardi.
class _FakePicker extends ImagePicker {
  @override
  Future<XFile?> pickImage({
    required ImageSource source,
    double? maxWidth,
    double? maxHeight,
    int? imageQuality,
    CameraDevice preferredCameraDevice = CameraDevice.rear,
    bool requestFullMetadata = true,
  }) async =>
      XFile.fromData(Uint8List.fromList(const [1, 2, 3]), name: 'chek.jpg');
}
