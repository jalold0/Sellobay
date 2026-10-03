import 'dart:convert';

import 'package:flutter/foundation.dart' show FlutterError;
import 'package:flutter/services.dart' show rootBundle;

/// Tarjimalar — `packages/i18n/src/locales/*.json` dan AYNAN o'sha holida.
///
/// ARB formatiga o'girilmagan: u ikkinchi manba yaratardi va vaqt o'tib
/// asl JSON bilan uzoqlashardi. Shu sababli kalit next-intl'dagi kabi
/// nuqtali bo'ladi: `t('cart.title')`.
///
/// Fayllar `pnpm flutter:i18n` bilan ko'chiriladi (repo root'dan).
class Translations {
  const Translations(this.locale, this._messages);

  final String locale;
  final Map<String, dynamic> _messages;

  /// Paket assetidan o'qiydi.
  static Future<Translations> load(String locale) async {
    final String raw;
    try {
      raw = await rootBundle.loadString('packages/sellobay_shared/assets/i18n/$locale.json');
    } on FlutterError {
      // Fayllar generatsiya qilinadi va repo'da yo'q. "Unable to load
      // asset" xabari sababni aytmaydi — nima qilish kerakligini aytamiz.
      throw StateError(
        'Tarjima fayli topilmadi: $locale.json. '
        'Ular generatsiya qilinadi — repo ildizidan `pnpm flutter:i18n` ishga tushiring.',
      );
    }
    return Translations(locale, json.decode(raw) as Map<String, dynamic>);
  }

  /// Nuqtali kalit bo'yicha matn: `t('cart.empty.title')`.
  ///
  /// Kalit topilmasa kalitning O'ZI qaytadi — ilova yiqilmaydi, lekin
  /// yetishmayotgan tarjima ekranda darrov ko'rinadi (jim bo'sh satr
  /// qoldirgandan ko'ra shu yaxshi).
  ///
  /// `{name}` ko'rinishidagi o'rin egalari `params` dan to'ldiriladi.
  String t(String key, {Map<String, Object?>? params}) {
    dynamic node = _messages;
    for (final part in key.split('.')) {
      if (node is Map<String, dynamic> && node.containsKey(part)) {
        node = node[part];
      } else {
        return key;
      }
    }
    if (node is! String) return key;

    var out = node;
    if (params != null) {
      params.forEach((name, value) {
        out = out.replaceAll('{$name}', '${value ?? ''}');
      });
    }
    return out;
  }

  /// Kalit mavjudmi — testlar va diagnostika uchun.
  bool has(String key) => t(key) != key;
}
