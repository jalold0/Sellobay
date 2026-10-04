import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/screens/order_detail_screen.dart';
import 'package:sellobay_customer/src/screens/orders_screen.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

const _orderId = 'aaaaaaaa-1111-4111-8111-111111111111';

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

Map<String, dynamic> _summary({String status = 'PENDING', bool paymentReview = false}) => {
      'id': _orderId,
      'number': 'ORD-2026-00012345',
      'status': status,
      'grandTotal': '620000',
      'placedAt': '2026-10-03T09:00:00.000Z',
      'deliveredAt': null,
      'deliveryMethod': 'HOME_DELIVERY',
      'paymentReview': paymentReview,
      'itemCount': 2,
      'items': [
        {
          'id': 'i1',
          'quantity': 2,
          'nameSnapshot': {'uz': 'Nike Air Max'},
          'totalPrice': '600000',
          'slug': 'nike-air-max',
          'imageUrl': null,
        },
      ],
    };

Map<String, dynamic> _detail({String status = 'PENDING', bool returnable = false}) => {
      ..._summary(status: status),
      'paymentProvider': 'CASH_ON_DELIVERY',
      'paymentStatus': 'PENDING',
      'subtotal': '600000',
      'shippingTotal': '20000',
      'discountTotal': '0',
      'promoCode': null,
      'notes': null,
      'editable': status == 'PENDING',
      'returnable': returnable,
      'returnWindowDays': 14,
      'shippingAddress': {
        'recipientName': 'Dilnoza',
        'phone': '+998901234567',
        'region': 'Toshkent',
        'city': 'Yunusobod',
        'street': 'Amir Temur 1',
        'apartment': '25-uy',
      },
      'pickupPoint': null,
      'items': [
        {
          'id': 'i1',
          'quantity': 2,
          'nameSnapshot': {'uz': 'Nike Air Max'},
          'unitPrice': '300000',
          'totalPrice': '600000',
          'slug': 'nike-air-max',
          'imageUrl': null,
        },
      ],
    };

FakeBackend _backend({
  List<Map<String, dynamic>>? orders,
  Map<String, dynamic>? detail,
  ResponseBody Function()? cancel,
}) =>
    FakeBackend((options, body) {
      if (options.path == '/api/orders') {
        return rawJson(json.encode({
          'success': true,
          'data': {'items': orders ?? [_summary()]},
        }));
      }
      if (options.path.endsWith('/cancel')) {
        return cancel?.call() ?? apiOk({'ok': true});
      }
      if (options.path.endsWith('/return')) return apiOk({'ok': true});
      if (options.path.startsWith('/api/orders/')) {
        return rawJson(json.encode({
          'success': true,
          'data': {'order': detail ?? _detail()},
        }));
      }
      return apiErr(500, 'UNEXPECTED', options.path);
    });

Future<SellobayRuntime> pump(WidgetTester tester, FakeBackend backend, Widget home) async {
  tester.view
    ..physicalSize = const Size(390 * 3, 844 * 3)
    ..devicePixelRatio = 3;
  addTearDown(tester.view.reset);

  final runtime = buildRuntime(backend, locale: uz, config: testConfig());
  await tester.pumpWidget(
    SellobayRuntimeScope(
      runtime: runtime,
      child: TranslationsScope(
        translations: uz.translations!,
        child: AuthScope(
          controller: runtime.auth,
          child: CartScope(
            store: runtime.cart,
            child: MaterialApp(theme: buildSellobayTheme(), home: home),
          ),
        ),
      ),
    ),
  );
  await settle(tester);
  return runtime;
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  testWidgets('buyurtmalar ro`yxati chiziladi', (tester) async {
    await pump(tester, _backend(), const OrdersScreen());

    expect(find.text('ORD-2026-00012345'), findsOneWidget);
    expect(find.text('Kutilmoqda'), findsOneWidget);
    expect(find.text("620 000 so'm"), findsOneWidget);
    expect(find.text('2 ta mahsulot'), findsOneWidget);
    // Sana web'dagi formatda.
    expect(find.textContaining('okt, 2026'), findsOneWidget);
  });

  testWidgets('bo`sh ro`yxat — to`qima buyurtma ko`rsatilmaydi', (tester) async {
    await pump(tester, _backend(orders: const []), const OrdersScreen());

    expect(find.text("Hali buyurtmalar yo'q"), findsOneWidget);
    expect(find.textContaining('ORD-'), findsNothing);
  });

  testWidgets('xato — qayta urinish tugmasi', (tester) async {
    final backend = FakeBackend((options, body) => apiErr(500, 'SERVER', 'Ichki xato'));
    await pump(tester, backend, const OrdersScreen());

    expect(find.text('Ichki xato'), findsOneWidget);
    expect(find.text('Qayta urinish'), findsOneWidget);
  });

  testWidgets('noma`lum holat — XOM qiymat ko`rsatiladi', (tester) async {
    // Server yangi holat qo'shsa, bo'sh joy emas, qiymatning o'zi chiqsin.
    await pump(
      tester,
      _backend(orders: [_summary(status: 'ALLAQACHON_YANGI')]),
      const OrdersScreen(),
    );

    expect(find.text('ALLAQACHON_YANGI'), findsOneWidget);
  });

  testWidgets('detal — summa taqsimoti va manzil', (tester) async {
    await pump(tester, _backend(), const OrderDetailScreen(orderId: _orderId));

    expect(find.text("600 000 so'm"), findsNWidgets(2)); // satr + "Mahsulotlar"
    expect(find.text("20 000 so'm"), findsOneWidget);
    expect(find.text("620 000 so'm"), findsOneWidget);
    expect(find.text('Toshkent, Yunusobod, Amir Temur 1, 25-uy'), findsOneWidget);
  });

  testWidgets('PENDING — bekor qilish tugmasi bor', (tester) async {
    await pump(tester, _backend(), const OrderDetailScreen(orderId: _orderId));

    expect(find.text('Buyurtmani bekor qilish'), findsOneWidget);
    expect(find.text("Qaytarishni so'rash"), findsNothing);
  });

  testWidgets('SHIPPED — bekor qilish tugmasi YO`Q', (tester) async {
    // Server bunday so'rovni 409 bilan rad etadi; tugmani ko'rsatish
    // mijozni aldash bo'lardi.
    await pump(
      tester,
      _backend(detail: _detail(status: 'SHIPPED')),
      const OrderDetailScreen(orderId: _orderId),
    );

    expect(find.text("Yo'lda"), findsOneWidget);
    expect(find.text('Buyurtmani bekor qilish'), findsNothing);
  });

  testWidgets('returnable — qaytarish tugmasi chiqadi', (tester) async {
    await pump(
      tester,
      _backend(detail: _detail(status: 'DELIVERED', returnable: true)),
      const OrderDetailScreen(orderId: _orderId),
    );

    expect(find.text("Qaytarishni so'rash"), findsOneWidget);
  });

  testWidgets('yetkazilgan, lekin oyna yopiq — sababi yoziladi', (tester) async {
    await pump(
      tester,
      _backend(detail: _detail(status: 'DELIVERED', returnable: false)),
      const OrderDetailScreen(orderId: _orderId),
    );

    expect(find.text("Qaytarishni so'rash"), findsNothing);
    expect(find.textContaining('14 kun ichida'), findsOneWidget);
  });

  testWidgets('bekor qilish tasdiq so`raydi va serverga boradi', (tester) async {
    final backend = _backend();
    await pump(tester, backend, const OrderDetailScreen(orderId: _orderId));

    await tester.tap(find.text('Buyurtmani bekor qilish'));
    await settleRoute(tester);
    expect(find.textContaining('Buyurtma bekor qilinsinmi'), findsOneWidget);
    // Tasdiqdan oldin so'rov YUBORILMAYDI.
    expect(backend.calls.where((c) => c.endsWith('/cancel')), isEmpty);

    await tester.tap(find.text('Ha'));
    await settleRoute(tester);

    expect(backend.calls.where((c) => c.endsWith('/cancel')), hasLength(1));
  });

  testWidgets('bekor qilishdan voz kechish — so`rov ketmaydi', (tester) async {
    final backend = _backend();
    await pump(tester, backend, const OrderDetailScreen(orderId: _orderId));

    await tester.tap(find.text('Buyurtmani bekor qilish'));
    await settleRoute(tester);
    await tester.tap(find.text("Yo'q"));
    await settleRoute(tester);

    expect(backend.calls.where((c) => c.endsWith('/cancel')), isEmpty);
  });

  testWidgets('server rad etsa — uning matni ko`rsatiladi', (tester) async {
    final backend = _backend(
      cancel: () => apiErr(409, 'NOT_CANCELLABLE', 'Buyurtma allaqachon qabul qilingan'),
    );
    await pump(tester, backend, const OrderDetailScreen(orderId: _orderId));

    await tester.tap(find.text('Buyurtmani bekor qilish'));
    await settleRoute(tester);
    await tester.tap(find.text('Ha'));
    await settleRoute(tester);

    expect(find.textContaining('allaqachon qabul qilingan'), findsWidgets);
  });
}
