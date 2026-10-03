import 'package:flutter/widgets.dart';

import '../api/api_exception.dart';
import 'translations.dart';

/// Tarjimalarni vidjetlar daraxtiga uzatadi.
class TranslationsScope extends InheritedWidget {
  const TranslationsScope({
    super.key,
    required this.translations,
    required super.child,
  });

  final Translations translations;

  static Translations of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<TranslationsScope>();
    assert(scope != null, 'TranslationsScope topilmadi — ilova ildiziga qo`ying.');
    return scope!.translations;
  }

  @override
  bool updateShouldNotify(TranslationsScope oldWidget) =>
      oldWidget.translations.locale != translations.locale;
}

extension TranslationsContext on BuildContext {
  /// `context.t('auth.loginTitle')`.
  String t(String key, {Map<String, Object?>? params}) =>
      TranslationsScope.of(this).t(key, params: params);

  /// Istisnoni foydalanuvchiga ko'rsatiladigan matnga aylantiradi.
  ///
  /// [ApiException.message] — serverdan kelgan TAYYOR o'zbekcha matn,
  /// uni qayta yozmaymiz. Faqat ikki holat boshqacha:
  ///   - tarmoq yo'q → aniq va foydali xabar;
  ///   - mijoz tomonda tekshiruv yiqildi → `message` i18n KALITI bo'ladi
  ///     (`AuthRepository` shunday uloqtiradi), uni tarjima qilamiz.
  String errorText(Object error) {
    if (error is NetworkException) return t('common.networkError');
    if (error is ApiException) {
      final translated = t(error.message);
      return translated == error.message ? error.message : translated;
    }
    return t('common.error');
  }
}
