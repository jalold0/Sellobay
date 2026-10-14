import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

void main() {
  group('AppConfig', () {
    test('testda (debug) emulyator manzili', () {
      // `flutter test` reliz emas, shuning uchun dev qiymati keladi.
      expect(AppConfig.fromEnvironment.apiBaseUrl, AppConfig.devBaseUrl);
    });

    test('prod manzili `apps/web` ning o`zi — alohida subdomen yo`q', () {
      // Aynan `www.` bilan: yalang'och `sellobay.uz` `308` bilan `www.`
      // ga yo'naltiriladi, Dart'ning HTTP klienti esa POST'da
      // redirect'ga ergashmaydi — kirish va buyurtma jim yiqilardi.
      // Test aynan shu qiymatni ushlab turish uchun qattiq yozilgan.
      expect(AppConfig.prodBaseUrl, 'https://www.sellobay.uz');
      expect(AppConfig.prodBaseUrl, startsWith('https://'));
      // Oxiridagi `/` bo'lsa, so'rov yo'li `//api/...` bo'lib ketardi.
      expect(AppConfig.prodBaseUrl, isNot(endsWith('/')));
    });

    test('dev va prod manzillari BOSHQA', () {
      // Bitta standart qiymat qo'ysak, biri albatta noto'g'ri bo'lardi.
      expect(AppConfig.devBaseUrl, isNot(AppConfig.prodBaseUrl));
    });
  });
}
