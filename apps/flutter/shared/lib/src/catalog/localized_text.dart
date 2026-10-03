/// Ko'p tilli matn — bazada `Json` ustun: `{ "uz": ..., "ru": ..., "en": ... }`.
///
/// Serverda faqat `uz` majburiy (sotuvchi paneli `nameRu`/`nameEn` ni
/// ixtiyoriy qiladi), shuning uchun [pick] zaxira zanjiri bilan ishlaydi.
/// Bu zanjir `@ecom/i18n` dagi `pickLocalized()` bilan AYNAN bir xil:
///
///   so'ralgan til -> `uz` -> bor bo'lgan birinchi qiymat -> bo'sh satr
///
/// Indeks bilan o'qimang (`name['uz']`) — til almashganda matn qotib qoladi.
class LocalizedText {
  const LocalizedText(this._values);

  /// Serverdan kelgan qiymat `Map` bo'lishi kutiladi. Ba'zi maydonlar
  /// (`alt`, `description`) `null` bo'lishi mumkin — bo'sh [LocalizedText].
  factory LocalizedText.fromJson(Object? json) {
    if (json is Map) {
      return LocalizedText({
        for (final entry in json.entries)
          if (entry.value is String) '${entry.key}': entry.value as String,
      });
    }
    // Himoya: kutilmaganda oddiy satr kelsa, uni `uz` deb qabul qilamiz.
    if (json is String) return LocalizedText({'uz': json});
    return const LocalizedText({});
  }

  static const _fallbackLocale = 'uz';

  final Map<String, String> _values;

  bool get isEmpty => _values.isEmpty || _values.values.every((v) => v.isEmpty);

  /// DIQQAT: bo'sh satr ham QIYMAT hisoblanadi va qaytariladi.
  ///
  /// TS tomonida `??` ishlatilgan, ya'ni `{ uz: "", ru: "Кроссовки" }`
  /// uchun web bo'sh matn ko'rsatadi. Bu yerda "bo'sh bo'lsa keyingisiga
  /// o't" deb yozsak, bitta mahsulot saytda bo'sh, telefonda to'ldirilgan
  /// bo'lib chiqardi. Ma'lumot nuqsonini yashirmaymiz — u ikkala klientda
  /// bir xil ko'rinsin.
  String pick(String locale) {
    final exact = _values[locale];
    if (exact != null) return exact;
    final fallback = _values[_fallbackLocale];
    if (fallback != null) return fallback;
    if (_values.isNotEmpty) return _values.values.first;
    return '';
  }

  /// Saqlashga tayyor nusxa (savat mahalliy xotirada shu ko'rinishda
  /// yoziladi).
  Map<String, String> toJsonMap() => Map<String, String>.unmodifiable(_values);

  @override
  String toString() => 'LocalizedText($_values)';
}
