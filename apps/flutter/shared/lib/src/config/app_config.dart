/// Qurish vaqtidagi sozlamalar.
class AppConfig {
  const AppConfig({required this.apiBaseUrl});

  /// Ishlab chiqarishdagi backend.
  ///
  /// Alohida mobil backend YO'Q — bu `apps/web` dagi Next.js API'si
  /// (`apps/web/src/app/api/**`). Web ham, mobil ham ayni o'shanga
  /// ulanadi, shuning uchun alohida `api.` subdomeni ham yo'q.
  ///
  /// Aynan `www.` bilan: yalang'och `https://sellobay.uz` Vercel'da
  /// `308` bilan `www.` ga yo'naltiriladi, Dart'ning HTTP klienti esa
  /// POST so'rovida redirect'ga ERGASHMAYDI — kirish, savat va buyurtma
  /// jim yiqilardi (GET ishlagani uchun nuqson darhol ko'rinmasdi).
  ///
  /// Eski APK'lar `https://sellobay-web.vercel.app` ga ulanib turadi:
  /// o'sha host Vercel'da redirect'siz, TO'G'RIDAN-TO'G'RI xizmat
  /// qiladi, shuning uchun ular ham ishlayveradi. Yangi manzil esa
  /// foydalanuvchiga faqat yangi APK bilan yetadi.
  static const prodBaseUrl = 'https://www.sellobay.uz';

  /// Android emulyatorida `localhost` ISHLAMAYDI — `10.0.2.2` kerak
  /// (emulyator uchun host mashina shu manzilda).
  static const devBaseUrl = 'http://10.0.2.2:3000';

  /// Xarita plitkalari — Protomaps pmtiles arxivi (O'zbekiston).
  ///
  /// Bitta fayl, HTTP Range so'rovlari bilan o'qiladi: alohida plitka
  /// serveri ham, uning xarajati ham yo'q. Fayl bizning R2 bucket'da,
  /// shuning uchun tashqi xarita xizmatining limiti yoki narxiga
  /// bog'liq emasmiz.
  ///
  /// Expo ilovasi ham AYNI shu manbani ishlatadi — ikki ilova bir xil
  /// xaritani ko'rsatadi.
  static const pmtilesUrl =
      'https://pub-a8adf525367442ce88806dc6dd797272.r2.dev/uzbekistan.pmtiles';

  /// Backend manzili.
  ///
  /// `--dart-define=API_BASE_URL=...` bilan almashtiriladi:
  ///
  ///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
  ///
  /// Berilmasa, RELIZ qurilmasi [prodBaseUrl] ga, debug esa
  /// [devBaseUrl] ga ulanadi. Ikkalasi uchun bitta standart qiymat
  /// qo'ysak, biri albatta noto'g'ri bo'lardi: define'siz yig'ilgan
  /// reliz APK emulyator manziliga gapirib, do'konga shu holda
  /// chiqib ketishi mumkin edi.
  final String apiBaseUrl;

  static const AppConfig fromEnvironment = AppConfig(
    // `dart.vm.product` — reliz qurilmasida `true`. Shart const
    // kontekstda hisoblanadi, shuning uchun bu yer `const` bo'lib
    // qoladi (u `ApiClient` da standart qiymat sifatida ishlatiladi).
    apiBaseUrl: bool.fromEnvironment('dart.vm.product')
        ? String.fromEnvironment('API_BASE_URL', defaultValue: prodBaseUrl)
        : String.fromEnvironment('API_BASE_URL', defaultValue: devBaseUrl),
  );
}
