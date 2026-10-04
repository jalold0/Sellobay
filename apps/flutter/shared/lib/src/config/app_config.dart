/// Qurish vaqtidagi sozlamalar.
class AppConfig {
  const AppConfig({required this.apiBaseUrl});

  /// Ishlab chiqarishdagi backend.
  ///
  /// Alohida mobil backend YO'Q — bu `apps/web` dagi Next.js API'si
  /// (`apps/web/src/app/api/**`). Web ham, mobil ham ayni o'shanga
  /// ulanadi, shuning uchun alohida `api.` subdomeni ham yo'q.
  static const prodBaseUrl = 'https://sellobay.uz';

  /// Android emulyatorida `localhost` ISHLAMAYDI — `10.0.2.2` kerak
  /// (emulyator uchun host mashina shu manzilda).
  static const devBaseUrl = 'http://10.0.2.2:3000';

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
