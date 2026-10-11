import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_customer/src/screens/orders_screen.dart';
import 'package:sellobay_customer/src/widgets/skeleton.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

late LocaleController uz;

Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

/// Skeleton `context.t` ishlatadi — tarjimalar ham kerak.
Widget _host(Widget child, {MediaQueryData? media}) {
  final runtime = buildRuntime(FakeBackend((o, b) => apiErr(500, 'X', 'x')), locale: uz);
  Widget app = MaterialApp(theme: buildSellobayTheme(), home: Scaffold(body: child));
  if (media != null) app = MediaQuery(data: media, child: app);
  return SellobayScope(runtime: runtime, child: app);
}

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    uz = LocaleController(initialLocale: 'uz');
    await uz.load();
  });

  group('Skeleton', () {
    testWidgets('pulsatsiya qiladi', (tester) async {
      await tester.pumpWidget(_host(const Skeleton(child: SkeletonBox(width: 40))));
      await tester.pump(const Duration(milliseconds: 100));

      expect(tester.hasRunningAnimations, isTrue);
    });

    testWidgets('«animatsiyani kamaytirish» yoqilgan bo`lsa to`xtaydi', (tester) async {
      await tester.pumpWidget(
        _host(
          const Skeleton(child: SkeletonBox(width: 40)),
          media: const MediaQueryData(disableAnimations: true),
        ),
      );
      await tester.pump(const Duration(milliseconds: 100));

      expect(tester.hasRunningAnimations, isFalse);
      // Skeletning o'zi turaveradi.
      expect(find.byType(SkeletonBox), findsOneWidget);
    });

    testWidgets('ekran o`qiydiganlarga «Yuklanmoqda» deydi, qutilar shovqin qilmaydi', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(_host(const ProductGridSkeleton()));
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.bySemanticsLabel('Yuklanmoqda...'), findsOneWidget);
      handle.dispose();
    });

    testWidgets('bosish o`tmaydi (IgnorePointer)', (tester) async {
      var taps = 0;
      await tester.pumpWidget(
        _host(
          Skeleton(
            child: GestureDetector(onTap: () => taps++, child: const SkeletonBox(width: 80, height: 80)),
          ),
        ),
      );

      await tester.tap(find.byType(SkeletonBox), warnIfMissed: false);
      expect(taps, 0);
    });
  });

  group('Maket', () {
    final builders = <String, Widget Function()>{
      'ProductGridSkeleton': () => const ProductGridSkeleton(),
      'HomeSkeleton': () => const HomeSkeleton(),
      'OrderListSkeleton': () => const OrderListSkeleton(),
      'ReviewListSkeleton': () => const ReviewListSkeleton(),
      'ProductDetailSkeleton': () => const ProductDetailSkeleton(),
    };
    for (final entry in builders.entries) {
      testWidgets('${entry.key}: tor ekran va katta shriftda ham overflow yo`q', (tester) async {
        tester.view
          ..physicalSize = const Size(320 * 2, 640 * 2)
          ..devicePixelRatio = 2;
        addTearDown(tester.view.reset);

        await tester.pumpWidget(
          _host(
            entry.value(),
            media: const MediaQueryData(
              size: Size(320, 640),
              textScaler: TextScaler.linear(1.8),
            ),
          ),
        );
        await tester.pump(const Duration(milliseconds: 50));

        // Overflow bo'lsa Flutter test xatosi sifatida tushadi.
        expect(tester.takeException(), isNull);
      });
    }
  });

  group('Ekranlarda', () {
    testWidgets('Buyurtmalar: yuklanayotganda skeleton, keyin ro`yxat', (tester) async {
      final release = Completer<void>();
      final backend = FakeBackend((options, body) async {
        await release.future;
        return apiOk({'items': <Map<String, dynamic>>[]});
      });

      tester.view
        ..physicalSize = const Size(390 * 3, 844 * 3)
        ..devicePixelRatio = 3;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(
        SellobayScope(
          runtime: buildRuntime(backend, locale: uz),
          child: MaterialApp(theme: buildSellobayTheme(), home: const OrdersScreen()),
        ),
      );
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.byType(OrderListSkeleton), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsNothing);

      release.complete();
      await settle(tester);

      expect(find.byType(OrderListSkeleton), findsNothing);
      expect(find.text("Hali buyurtmalar yo'q"), findsOneWidget);
    });
  });
}
