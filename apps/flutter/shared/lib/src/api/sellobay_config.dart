/// `GET /api/config` javobi — biznes qoidalarining YAGONA manbasi.
///
/// Bu qiymatlarni Dart konstantasiga KO'CHIRMANG. Qoida `@ecom/core-domain`
/// paketida yashaydi; bu yerda faqat uning NUSXASI, ilova ishga tushganda
/// olinadi. Sabab: docs/adr/0009-flutter-mobil-ilovalar.md
///
/// Eslatma: bu qiymatlar faqat KO'RSATISH uchun. Yakuniy pul hisobi
/// serverda, buyurtma yaratishda qayta hisoblanadi — ya'ni bu nusxa
/// eskirsa ham noto'g'ri summa bilan buyurtma o'tib ketmaydi.
library;

class ShippingConfig {
  const ShippingConfig({
    required this.currency,
    required this.standardFee,
    required this.expressFee,
    required this.freeThreshold,
  });

  final String currency;
  final int standardFee;
  final int expressFee;

  /// Shu summadan yuqori buyurtmada yetkazish bepul.
  final int freeThreshold;

  factory ShippingConfig.fromJson(Map<String, dynamic> json) => ShippingConfig(
        currency: json['currency'] as String,
        standardFee: (json['standardFee'] as num).toInt(),
        expressFee: (json['expressFee'] as num).toInt(),
        freeThreshold: (json['freeThreshold'] as num).toInt(),
      );
}

class LoyaltyTier {
  const LoyaltyTier({
    required this.key,
    required this.min,
    required this.cashbackPct,
    required this.icon,
  });

  final String key;
  final int min;
  final num cashbackPct;
  final String icon;

  factory LoyaltyTier.fromJson(Map<String, dynamic> json) => LoyaltyTier(
        key: json['key'] as String,
        min: (json['min'] as num).toInt(),
        cashbackPct: json['cashbackPct'] as num,
        icon: json['icon'] as String,
      );
}

class LoyaltyConfig {
  const LoyaltyConfig({
    required this.coinPerSom,
    required this.coinValueSom,
    required this.tiers,
  });

  /// 1 so'mga nechta coin (1 coin / 1000 so'm).
  final double coinPerSom;

  /// 1 coin necha so'mga teng (yechishda).
  final int coinValueSom;
  final List<LoyaltyTier> tiers;

  factory LoyaltyConfig.fromJson(Map<String, dynamic> json) => LoyaltyConfig(
        coinPerSom: (json['coinPerSom'] as num).toDouble(),
        coinValueSom: (json['coinValueSom'] as num).toInt(),
        tiers: (json['tiers'] as List<dynamic>)
            .map((e) => LoyaltyTier.fromJson(e as Map<String, dynamic>))
            .toList(growable: false),
      );
}

class GeoBbox {
  const GeoBbox({
    required this.latMin,
    required this.latMax,
    required this.lngMin,
    required this.lngMax,
  });

  final double latMin;
  final double latMax;
  final double lngMin;
  final double lngMax;

  factory GeoBbox.fromJson(Map<String, dynamic> json) => GeoBbox(
        latMin: (json['latMin'] as num).toDouble(),
        latMax: (json['latMax'] as num).toDouble(),
        lngMin: (json['lngMin'] as num).toDouble(),
        lngMax: (json['lngMax'] as num).toDouble(),
      );

  bool contains(double lat, double lng) =>
      lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax;
}

class SellobayConfig {
  const SellobayConfig({
    required this.shipping,
    required this.loyalty,
    required this.returnWindowDays,
    required this.tashkentCityBbox,
    required this.locales,
  });

  final ShippingConfig shipping;
  final LoyaltyConfig loyalty;

  /// Yetkazilgandan keyin necha kun ichida qaytarish mumkin.
  final int returnWindowDays;
  final GeoBbox tashkentCityBbox;
  final List<String> locales;

  factory SellobayConfig.fromJson(Map<String, dynamic> json) => SellobayConfig(
        shipping: ShippingConfig.fromJson(json['shipping'] as Map<String, dynamic>),
        loyalty: LoyaltyConfig.fromJson(json['loyalty'] as Map<String, dynamic>),
        returnWindowDays:
            ((json['returns'] as Map<String, dynamic>)['windowDays'] as num).toInt(),
        tashkentCityBbox: GeoBbox.fromJson(
            (json['geo'] as Map<String, dynamic>)['tashkentCityBbox'] as Map<String, dynamic>),
        locales: (json['locales'] as List<dynamic>).cast<String>(),
      );

  /// Yetkazish narxi — serverdagi qoida bo'yicha.
  int shippingFeeFor(int subtotalSom, {bool express = false}) {
    if (express) return shipping.expressFee;
    return subtotalSom >= shipping.freeThreshold ? 0 : shipping.standardFee;
  }
}
