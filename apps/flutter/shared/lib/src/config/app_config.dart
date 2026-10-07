/// Qurish vaqtidagi sozlamalar.
class AppConfig {
  const AppConfig({required this.apiBaseUrl});

  /// Ishlab chiqarishdagi backend.
  ///
  /// Alohida mobil backend YO'Q — bu `apps/web` dagi Next.js API'si
  /// (`apps/web/src/app/api/**`). Web ham, mobil ham ayni o'shanga
  /// ulanadi, shuning uchun alohida `api.` subdomeni ham yo'q.
  ///
  /// DIQQAT: bu yerda ilgari `https://sellobay.uz` turardi, lekin o'sha
  /// domen hali RO'YXATDAN O'TMAGAN — DNS'da umuman yo'q. Natijada
  /// reliz APK har bir so'rovda «tarmoq yo'q» deb turardi va buni
  /// telefon aybi deb o'ylash oson edi. `.env.example` dagi
  /// `NEXT_PUBLIC_SITE_URL=https://sellobay.uz` — kelajak rejasi, hozirgi
  /// haqiqat emas.
  ///
  /// Domen ulangach shu qator o'zgaradi (va eski manzil Vercel'da
  /// redirect bo'lib qoladi, shuning uchun eski APK'lar ham ishlaydi).
  static const prodBaseUrl = 'https://sellobay-web.vercel.app';

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
