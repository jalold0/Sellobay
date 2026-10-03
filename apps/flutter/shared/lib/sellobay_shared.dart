/// Sellobay mijoz va kuryer ilovalari uchun umumiy kod.
///
/// MUHIM: biznes qoidalari (yetkazish narxi, coin, hudud) bu paketda
/// TAKRORLANMAYDI — ular `GET /api/config` orqali serverdan keladi.
/// Sabab: docs/adr/0009-flutter-mobil-ilovalar.md
library;

export 'src/api/api_client.dart';
export 'src/api/api_exception.dart';
export 'src/api/sellobay_config.dart';
export 'src/auth/token_store.dart';
export 'src/config/app_config.dart';
export 'src/i18n/translations.dart';
