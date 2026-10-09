import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

void main() {
  final theme = buildSellobayTheme();

  group('shrift oilasi', () {
    test('mavzu brend oilasini beradi', () {
      expect(theme.textTheme.bodyMedium?.fontFamily, SellobayType.sans);
      expect(theme.textTheme.titleLarge?.fontFamily, SellobayType.sans);
    });

    testWidgets('aniq fontSize bergan Text ham oilani oladi', (tester) async {
      // Bu ilovadagi 238 ta chaqiruvning namunasi: o'lcham qo'lda
      // berilgan, oila berilmagan. Flutter uslublarni QO'SHADI, shuning
      // uchun oila mavzudan tushishi kerak. Agar bu test yiqilsa,
      // demak hamma matn jimgina platforma shriftiga qaytgan.
      await tester.pumpWidget(
        MaterialApp(
          theme: theme,
          home: const Scaffold(
            body: Text('Narx', style: TextStyle(fontSize: 14.5)),
          ),
        ),
      );

      final text = tester.widget<Text>(find.text('Narx'));
      final merged = DefaultTextStyle.of(
        tester.element(find.text('Narx')),
      ).style.merge(text.style);

      expect(merged.fontSize, 14.5, reason: 'ekran bergan o\'lcham saqlanadi');
      expect(merged.fontFamily, SellobayType.sans, reason: 'oila mavzudan keladi');
    });

    test('sarlavha yordamchisi serif oilasini beradi', () {
      expect(SellobayType.heading(28).fontFamily, SellobayType.serif);
    });
  });

  group('o\'lchov shkalasi', () {
    test('qiymatlar butun — yarim punkt yo\'q', () {
      final sizes = [
        theme.textTheme.labelSmall,
        theme.textTheme.bodyMedium,
        theme.textTheme.titleMedium,
        theme.textTheme.headlineMedium,
        theme.textTheme.displayLarge,
      ].map((s) => s!.fontSize!);

      for (final size in sizes) {
        expect(size % 1, 0, reason: '$size butun bo\'lishi kerak');
      }
    });

    test('kattaroq pog\'ona — torroq satr oralig\'i', () {
      // 28 punktli sarlavhada 1.5 oraliq qatorlarni uzib yuboradi.
      final body = theme.textTheme.bodyMedium!;
      final hero = theme.textTheme.displayMedium!;
      expect(hero.fontSize!, greaterThan(body.fontSize!));
      expect(hero.height!, lessThan(body.height!));
    });
  });

  group('tugma matni', () {
    test('tugma uslubi oilani O\'ZI olib yuradi', () {
      // ButtonStyle dagi uslub mavzunikini merge qilmay almashtiradi.
      // Shuning uchun oila shu yerda aniq ko'rsatilgan bo'lishi shart —
      // aks holda butun ilovada faqat tugma matni boshqa shriftda
      // chiqadi va buni ko'z bilan payqash qiyin.
      final resolved = theme.filledButtonTheme.style?.textStyle?.resolve({});
      expect(resolved?.fontFamily, SellobayType.sans);
      expect(resolved?.fontSize, 16);
      expect(resolved?.fontWeight, FontWeight.w600);
    });

    test('labelLarge Material o\'lchamida qoladi', () {
      // Chip, Tab va SegmentedButton shu slotdan o'qiydi. Uni 16 ga
      // ko'targanda punkt ekranidagi shahar chiplari 390px kenglikdan
      // chiqib ketgan edi — pickup_points_test shuni tutgan.
      expect(theme.textTheme.labelLarge?.fontSize, 14);
      expect(theme.textTheme.labelLarge?.fontWeight, FontWeight.w500);
    });
  });
}
