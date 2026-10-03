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
}
