import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/screens/order_detail_screen.dart';
import 'package:sellobay_customer/src/screens/orders_screen.dart';
import 'package:sellobay_customer/src/screens/track_order_screen.dart';
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

Map<String, dynamic> _detail({
  String status = 'PENDING',
  bool returnable = false,
  String provider = 'CASH_ON_DELIVERY',
  String paymentStatus = 'PENDING',
}) =>
    {
      ..._summary(status: status),
      'paymentProvider': provider,
      'paymentStatus': paymentStatus,
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
      if (options.path == '/api/payments/create') {
        return apiOk({'online': true, 'checkoutUrl': 'https://my.click.uz/services/pay?x=1'});
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

  testWidgets('Lokal/Global kaliti buyurtmalarni ajratadi', (tester) async {
    final backend = _backend(orders: [
      {..._summary(), 'scope': 'LOCAL'},
      {..._summary(), 'id': 'bbbbbbbb-2222-4222-8222-222222222222', 'number': 'ORD-GLOBAL-1', 'scope': 'GLOBAL'},
    ]);
    await pump(tester, backend, const OrdersScreen());

    expect(find.text('ORD-2026-00012345'), findsOneWidget);
    expect(find.text('ORD-GLOBAL-1'), findsNothing);

    await tester.tap(find.text('Global'));
    await settle(tester);

    expect(find.text('ORD-GLOBAL-1'), findsOneWidget);
    expect(find.text('ORD-2026-00012345'), findsNothing);
  });

  testWidgets('global buyurtma yo`q — Lokal/Global kaliti ko`rinmaydi', (
    tester,
  ) async {
    await pump(tester, _backend(), const OrdersScreen());

    expect(find.byType(SegmentedButton<OrderScope>), findsNothing);
    expect(find.text('ORD-2026-00012345'), findsWidgets);
  });

  testWidgets('global buyurtma bor, lekin global filtrda — bo`sh holat matni', (
    tester,
  ) async {
    final backend = _backend(
      orders: [
        {..._summary(), 'scope': 'LOCAL'},
        {
          ..._summary(),
          'id': 'bbbbbbbb-2222-4222-8222-222222222222',
          'number': 'ORD-G',
          'scope': 'GLOBAL',
        },
      ],
    );
    await pump(tester, backend, const OrdersScreen());

    await tester.tap(find.text('Global'));
    await settle(tester);
    // «Yetkazilgan» global buyurtmada yo'q — global bo'sh matn.
    await tester.ensureVisible(find.widgetWithText(ChoiceChip, 'Yetkazilgan'));
    await settle(tester);
    await tester.tap(find.widgetWithText(ChoiceChip, 'Yetkazilgan'));
    await settle(tester);

    expect(find.text("Global buyurtmalar yo'q"), findsOneWidget);
  });

  testWidgets('filtr chiplari: Yo`lda / Yetkazilgan / Qaytarishlar', (
    tester,
  ) async {
    String id(int n) => 'aaaaaaaa-0000-4000-8000-00000000000$n';
    final backend = _backend(
      orders: [
        {..._summary(status: 'PENDING'), 'id': id(1), 'number': 'ORD-PEND'},
        {..._summary(status: 'DELIVERED'), 'id': id(2), 'number': 'ORD-DONE'},
        {..._summary(status: 'RETURNED'), 'id': id(3), 'number': 'ORD-RET'},
        {..._summary(status: 'CANCELLED'), 'id': id(4), 'number': 'ORD-CANC'},
      ],
    );
    await pump(tester, backend, const OrdersScreen());

    // Barchasi
    for (final n in ['ORD-PEND', 'ORD-DONE', 'ORD-RET', 'ORD-CANC']) {
      expect(find.text(n), findsOneWidget);
    }

    Future<void> pick(String chip) async {
      // Chiplar qatori gorizontal suriladi — ekran kengligidan chiqib ketgani bor.
      await tester.ensureVisible(find.widgetWithText(ChoiceChip, chip));
      await settle(tester);
      await tester.tap(find.widgetWithText(ChoiceChip, chip));
      await settle(tester);
    }

    await pick("Yo'lda");
    expect(find.text('ORD-PEND'), findsOneWidget);
    expect(
      [
        find.text('ORD-DONE'),
        find.text('ORD-RET'),
        find.text('ORD-CANC'),
      ].map((f) => f.evaluate().length),
      [0, 0, 0],
    );

    await pick('Yetkazilgan');
    expect(find.text('ORD-DONE'), findsOneWidget);
    expect(find.text('ORD-PEND'), findsNothing);

    await pick('Qaytarishlar');
    expect(find.text('ORD-RET'), findsOneWidget);
    expect(find.text('ORD-DONE'), findsNothing);
  });

  testWidgets('AppBardagi belgi raqam bo`yicha kuzatishni ochadi', (
    tester,
  ) async {
    await pump(tester, _backend(), const OrdersScreen());

    await tester.tap(find.byIcon(Icons.local_shipping_outlined));
    await settle(tester);

    expect(find.byType(TrackOrderScreen), findsOneWidget);
  });

  testWidgets('qaytarishlar — faqat RETURNED/REFUNDED, kalit yo`q', (
    tester,
  ) async {
    final backend = _backend(
      orders: [
        _summary(status: 'DELIVERED'),
        {
          ..._summary(status: 'RETURNED'),
          'id': 'bbbbbbbb-2222-4222-8222-222222222222',
          'number': 'ORD-RET-1',
        },
        {
          ..._summary(status: 'REFUNDED'),
          'id': 'cccccccc-3333-4333-8333-333333333333',
          'number': 'ORD-REF-1',
        },
      ],
    );
    await pump(
      tester,
      backend,
      const OrdersScreen(initialFilter: OrdersFilter.returns),
    );

    expect(find.text('ORD-RET-1'), findsOneWidget);
    expect(find.text('ORD-REF-1'), findsOneWidget);
    expect(find.text('ORD-2026-00012345'), findsNothing);
    expect(find.byType(SegmentedButton<OrderScope>), findsNothing);
    // Faqat RETURNED da refund kutilmoqda deyiladi.
    expect(find.textContaining('Pul qaytarilishi kutilmoqda'), findsOneWidget);
  });

  testWidgets('qaytarish yo`q — bo`sh holat', (tester) async {
    await pump(
      tester,
      _backend(),
      const OrdersScreen(initialFilter: OrdersFilter.returns),
    );

    expect(find.text("Qaytarishlar yo'q"), findsOneWidget);
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

  group('to`lov holati', () {
    testWidgets('usul va holat ko`rsatiladi', (tester) async {
      // Ilgari bu ekranda to'lov haqida hech narsa yo'q edi: onlayn
      // to'lagan mijoz pul o'tdimi-yo'qmi bilmasdi.
      await pump(tester, _backend(detail: _detail(provider: 'CLICK')), const OrderDetailScreen(orderId: _orderId));

      expect(find.text("To'lov usuli"), findsOneWidget);
      expect(find.text('Click'), findsOneWidget);
      expect(find.text("To'lov kutilmoqda"), findsOneWidget);
    });

    testWidgets('onlayn va to`lanmagan bo`lsa — «yakunlash» tugmasi', (tester) async {
      await pump(tester, _backend(detail: _detail(provider: 'PAYME')), const OrderDetailScreen(orderId: _orderId));

      expect(find.widgetWithText(FilledButton, "To'lovni yakunlash"), findsOneWidget);
    });

    testWidgets('naqd to`lovda tugma YO`Q', (tester) async {
      // Naqdda to'lanadigan sahifa ham yo'q.
      await pump(tester, _backend(detail: _detail()), const OrderDetailScreen(orderId: _orderId));

      expect(find.text("To'lovni yakunlash"), findsNothing);
      expect(find.text('Naqd pul'), findsOneWidget);
    });

    testWidgets('to`langan bo`lsa tugma YO`Q', (tester) async {
      await pump(
        tester,
        _backend(detail: _detail(provider: 'CLICK', paymentStatus: 'PAID')),
        const OrderDetailScreen(orderId: _orderId),
      );

      expect(find.text("To'landi"), findsOneWidget);
      expect(find.text("To'lovni yakunlash"), findsNothing);
    });

    testWidgets('«yakunlash» YANGI buyurtma yaratmaydi', (tester) async {
      // Buyurtma allaqachon bor — faqat to'lov manzili qayta so'raladi.
      final backend = _backend(detail: _detail(provider: 'CLICK'));
      await pump(tester, backend, const OrderDetailScreen(orderId: _orderId));

      await tester.tap(find.widgetWithText(FilledButton, "To'lovni yakunlash"));
      await settle(tester);

      expect(backend.countOf('/api/payments/create'), 1);
      expect(backend.countOf('/api/orders'), 0);
    });

    testWidgets('ilova bilmaydigan holat XOM ko`rsatiladi', (tester) async {
      // Sxemaga yangi qiymat qo'shilsa, ekranda bo'sh joy qolmasin.
      await pump(
        tester,
        _backend(detail: _detail(provider: 'CLICK', paymentStatus: 'CHARGEBACK')),
        const OrderDetailScreen(orderId: _orderId),
      );

      expect(find.text('CHARGEBACK'), findsOneWidget);
    });
  });
}
