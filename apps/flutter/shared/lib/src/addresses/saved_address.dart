/// Manzil turi — `AddressType` enum (schema.prisma) bilan bir xil.
enum AddressType {
  home('HOME', 'profile.addressesPage.typeHome'),
  work('WORK', 'profile.addressesPage.typeWork'),
  pickup('PICKUP', 'profile.addressesPage.typePickup'),
  other('OTHER', 'profile.addressesPage.typeOther');

  const AddressType(this.value, this.labelKey);

  final String value;
  final String labelKey;

  static AddressType fromValue(String? value) {
    for (final t in AddressType.values) {
      if (t.value == value) return t;
    }
    return AddressType.home;
  }
}

/// Foydalanuvchining saqlangan yetkazish manzili.
class SavedAddress {
  const SavedAddress({
    required this.id,
    required this.label,
    required this.type,
    required this.recipientName,
    required this.phone,
    required this.region,
    required this.city,
    required this.street,
    required this.apartment,
    this.latitude,
    this.longitude,
    required this.isDefault,
  });

  factory SavedAddress.fromJson(Map<String, dynamic> json) => SavedAddress(
        id: json['id'] as String,
        label: json['label'] as String?,
        type: AddressType.fromValue(json['type'] as String?),
        recipientName: json['recipientName'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        region: json['region'] as String? ?? '',
        city: json['city'] as String? ?? '',
        street: json['street'] as String? ?? '',
        apartment: json['apartment'] as String?,
        // Server `Decimal` ni son sifatida beradi; `num` dan o'tkazamiz
        // — JSON'da u int ham, double ham bo'lishi mumkin.
        latitude: (json['latitude'] as num?)?.toDouble(),
        longitude: (json['longitude'] as num?)?.toDouble(),
        isDefault: json['isDefault'] as bool? ?? false,
      );

  final String id;
  final String? label;
  final AddressType type;
  final String recipientName;
  final String phone;
  final String region;
  final String city;
  final String street;
  final String? apartment;

  /// Xaritadan tanlangan nuqta.
  ///
  /// NEGA MUHIM: koordinatasiz kuryer manzilni matndan o'zi topishi
  /// kerak bo'ladi, yetkazish hududini tekshirish (`tashkentCityBbox`)
  /// esa umuman ishlamaydi. Server bu maydonlarni ancha oldin qabul
  /// qilardi, lekin Dart modeli ularni tashlab yuborardi.
  final double? latitude;
  final double? longitude;
  final bool isDefault;

  String get oneLine => [region, city, street, apartment]
      .whereType<String>()
      .where((s) => s.isNotEmpty)
      .join(', ');
}

/// Manzil yaratish/tahrirlash uchun kiritma.
///
/// Alohida tip: [SavedAddress] da `id` bor, kiritmada esa yo'q, va
/// serverga AYNAN shu maydonlar yuboriladi.
class AddressInput {
  const AddressInput({
    this.label,
    this.type = AddressType.home,
    required this.recipientName,
    required this.phone,
    required this.region,
    required this.city,
    required this.street,
    this.apartment,
    this.latitude,
    this.longitude,
    this.isDefault = false,
  });

  final String? label;
  final AddressType type;
  final String recipientName;
  final String phone;
  final String region;
  final String city;
  final String street;
  final String? apartment;

  /// Xaritadan tanlangan nuqta.
  ///
  /// NEGA MUHIM: koordinatasiz kuryer manzilni matndan o'zi topishi
  /// kerak bo'ladi, yetkazish hududini tekshirish (`tashkentCityBbox`)
  /// esa umuman ishlamaydi. Server bu maydonlarni ancha oldin qabul
  /// qilardi, lekin Dart modeli ularni tashlab yuborardi.
  final double? latitude;
  final double? longitude;
  final bool isDefault;

  /// Bo'sh matn `null` ga aylanadi.
  ///
  /// Sxemada `label` va `apartment` `.nullable()`, lekin `.min()` li
  /// maydonlar emas: bo'sh satr yuborilsa 400 VALIDATION qaytadi.
  Map<String, dynamic> toJson() => <String, dynamic>{
        'label': _orNull(label),
        'type': type.value,
        'recipientName': recipientName.trim(),
        'phone': phone.trim(),
        'region': region.trim(),
        'city': city.trim(),
        'street': street.trim(),
        'apartment': _orNull(apartment),
        // Tanlanmagan bo'lsa yubormaymiz: `null` yuborsak, tahrirlashda
        // mavjud koordinata o'chib ketardi.
        'latitude': ?latitude,
        'longitude': ?longitude,
        'isDefault': isDefault,
      };

  static String? _orNull(String? value) {
    final trimmed = value?.trim();
    return trimmed == null || trimmed.isEmpty ? null : trimmed;
  }
}
