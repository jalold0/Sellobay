import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

void main() {
  const t = Translations('uz', {
    'cart': {
      'title': 'Savat',
      'empty': {'title': 'Savat bo`sh'},
    },
    'home': {'productCount': '{count} mahsulot'},
  });

  group('Translations', () {
    test('nuqtali kalit bo`yicha topadi', () {
      expect(t.t('cart.title'), 'Savat');
      expect(t.t('cart.empty.title'), 'Savat bo`sh');
    });

    test('o`rin egalarini to`ldiradi', () {
      expect(t.t('home.productCount', params: {'count': 7}), '7 mahsulot');
    });

    test('topilmagan kalit KALITNING O`ZINI qaytaradi', () {
      // Jim bo'sh satr qoldirsa, yetishmayotgan tarjima sezilmay qolardi.
      expect(t.t('yoq.kalit'), 'yoq.kalit');
      expect(t.has('yoq.kalit'), isFalse);
    });

    test('oraliq tugunni matn sifatida qaytarmaydi', () {
      // `cart.empty` — obyekt, matn emas.
      expect(t.t('cart.empty'), 'cart.empty');
    });
  });

  group('errorText', () {
    const t = Translations('uz', {
      'common': {
        'error': 'Xatolik yuz berdi',
        'networkError': "Internet aloqasi yo'q",
        'unexpectedResponse': 'Server kutilmagan javob qaytardi ({status}).',
      },
    });

    Future<String> render(WidgetTester tester, Object error) async {
      late String text;
      await tester.pumpWidget(
        TranslationsScope(
          translations: t,
          child: Builder(
            builder: (context) {
              text = context.errorText(error);
              return const SizedBox();
            },
          ),
        ),
      );
      return text;
    }

    testWidgets('shaklsiz javobda HTTP KODI ko`rsatiladi', (tester) async {
      // Ilgari bu «Noma'lum xato» edi: deploy qilinmagan route (404),
      // yiqilgan server (500) va shlyuz xatosi (502) bir xil
      // ko'rinardi va nosozlikni topib bo'lmasdi.
      final text = await render(
        tester,
        const ApiException(
          code: 'UNEXPECTED_RESPONSE',
          message: 'common.unexpectedResponse',
          statusCode: 404,
        ),
      );
      expect(text, contains('404'));
    });

    testWidgets('serverning TAYYOR matni qayta yozilmaydi', (tester) async {
      final text = await render(
        tester,
        const ApiException(code: 'NOT_PURCHASED', message: 'Siz bu mahsulotni sotib olmagansiz'),
      );
      expect(text, 'Siz bu mahsulotni sotib olmagansiz');
    });

    testWidgets('tarmoq uzilishi alohida xabar', (tester) async {
      expect(await render(tester, const NetworkException('timeout')), "Internet aloqasi yo'q");
    });
  });
}
