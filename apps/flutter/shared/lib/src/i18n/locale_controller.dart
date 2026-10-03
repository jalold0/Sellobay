import 'package:flutter/foundation.dart';

import 'translations.dart';

/// Tanlangan til va yuklangan tarjimalar.
///
/// Boshlang'ich til — QURILMANIKI. Ilova ichida "til tanlash" ekrani yo'q:
/// foydalanuvchi tizimga kirgach uning serverdagi `locale` maydoni
/// qo'llaniladi (`AuthUser.locale`). Shunday qilib web va mobil bir xil
/// tilda gaplashadi va tanlov BITTA joyda — profilda — saqlanadi.
class LocaleController extends ChangeNotifier {
  LocaleController({String? initialLocale})
      : _locale = resolve(initialLocale ?? PlatformDispatcher.instance.locale.languageCode);

  /// `packages/i18n/src/locales/` dagi fayllar bilan bir xil ro'yxat.
  static const supported = <String>['uz', 'ru', 'en'];

  static String resolve(String? code) => supported.contains(code) ? code! : 'uz';

  String _locale;
  Translations? _translations;

  String get locale => _locale;

  /// Yuklangunga qadar `null` — ilova shu paytda splash ko'rsatadi.
  Translations? get translations => _translations;

  Future<void> load() async {
    _translations = await Translations.load(_locale);
    notifyListeners();
  }

  Future<void> setLocale(String? code) async {
    final next = resolve(code);
    if (next == _locale && _translations != null) return;
    _locale = next;
    _translations = await Translations.load(next);
    notifyListeners();
  }
}
