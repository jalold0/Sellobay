import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

void main() {
  group('AppConfig', () {
    test('testda (debug) emulyator manzili', () {
      // `flutter test` reliz emas, shuning uchun dev qiymati keladi.
      expect(AppConfig.fromEnvironment.apiBaseUrl, AppConfig.devBaseUrl);
    });

    test('prod manzili `apps/web` ning o`zi — alohida subdomen yo`q', () {
      // `sellobay.uz` EMAS: o'sha domen hali ro'yxatdan o'tmagan va
      // DNS'da yo'q. Reliz APK unga ulanib «tarmoq yo'q» deb turardi.
      // Domen ulangach shu qator va `AppConfig.prodBaseUrl` birga
      // o'zgaradi — test aynan shuni ushlab turish uchun qattiq yozilgan.
      expect(AppConfig.prodBaseUrl, 'https://sellobay-web.vercel.app');
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
