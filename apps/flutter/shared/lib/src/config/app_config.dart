/// Qurish vaqtidagi sozlamalar.
class AppConfig {
  const AppConfig({required this.apiBaseUrl});

  /// Backend manzili.
  ///
  /// Alohida mobil backend YO'Q — bu `apps/web` dagi Next.js API'si
  /// (`apps/web/src/app/api/**`). Web ham, mobil ham ayni o'shanga ulanadi.
  ///
  /// Kodga yozilmaydi, `--dart-define` bilan beriladi:
  ///
  ///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
  ///
  /// Android emulyatorida `localhost` ISHLAMAYDI — `10.0.2.2` kerak
  /// (emulyator uchun host mashina shu manzilda).
  final String apiBaseUrl;

  static const AppConfig fromEnvironment = AppConfig(
    apiBaseUrl: String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://10.0.2.2:3000',
    ),
  );
}
