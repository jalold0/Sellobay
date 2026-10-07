import '../api/api_client.dart';

/// Hamyondagi promokod (`GET /api/promo`).
class UserCoupon {
  const UserCoupon({
    required this.id,
    required this.code,
    required this.type,
    required this.value,
    required this.status,
    this.minOrderTotal,
    this.maxDiscount,
    this.endsAt,
    this.redeemedAt,
  });

  factory UserCoupon.fromJson(Map<String, dynamic> json) => UserCoupon(
        id: json['id'] as String? ?? '',
        code: json['code'] as String? ?? '',
        // XOM satrlar: server yangi tur yoki holat qo'shsa, eski ilova
        // yiqilmasin — u shunchaki tarjima topolmay kalitni ko'rsatadi.
        type: json['type'] as String? ?? '',
        value: (json['value'] as num?)?.toDouble() ?? 0,
        status: json['status'] as String? ?? 'ACTIVE',
        minOrderTotal: (json['minOrderTotal'] as num?)?.toDouble(),
        maxDiscount: (json['maxDiscount'] as num?)?.toDouble(),
        endsAt: DateTime.tryParse(json['endsAt'] as String? ?? ''),
        redeemedAt: DateTime.tryParse(json['redeemedAt'] as String? ?? ''),
      );

  final String id;
  final String code;

  /// `PERCENT` / `FIXED` / `FREE_SHIPPING`.
  final String type;

  final double value;

  /// `ACTIVE` / `USED` / `EXPIRED` / `INACTIVE` — SERVER hisoblaydi.
  ///
  /// Klient uni muddat va bayroqlardan o'zi chiqarmaydi: qoida
  /// serverda bitta joyda tursin, aks holda ikkisi vaqt o'tib mos
  /// kelmay qolardi.
  final String status;

  final double? minOrderTotal;
  final double? maxDiscount;
  final DateTime? endsAt;
  final DateTime? redeemedAt;

  bool get isUsable => status == 'ACTIVE';
}

/// Promokod qo'shish natijasi (`POST /api/promo`).
class CouponClaim {
  const CouponClaim({required this.code, required this.alreadyHad});

  factory CouponClaim.fromJson(Map<String, dynamic> json) => CouponClaim(
        code: json['code'] as String? ?? '',
        alreadyHad: json['alreadyHad'] as bool? ?? false,
      );

  final String code;

  /// Allaqachon hamyonda bo'lgan — bu XATO EMAS.
  ///
  /// Server amalni idempotent qilgan: ikki marta qo'shish ikkita
  /// nusxa yaratmaydi. Shuning uchun ilova ham xato ko'rsatmaydi,
  /// faqat boshqacha xabar beradi.
  final bool alreadyHad;
}

/// «Promokodlarim» — hamyon.
///
/// Checkout'dagi `validate` dan BOSHQA narsa: u berilgan kodni shu
/// savat uchun tekshiradi, bu esa foydalanuvchiga biriktirilgan
/// kodlar ro'yxatini beradi.
class PromoRepository {
  PromoRepository(this._api);

  final ApiClient _api;

  Future<List<UserCoupon>> fetchMine() async {
    final data = await _api.get<Map<String, dynamic>>('/api/promo');
    return (data['items'] as List<dynamic>? ?? const [])
        .cast<Map<String, dynamic>>()
        .map(UserCoupon.fromJson)
        .toList();
  }

  /// Kodni hamyonga qo'shadi.
  ///
  /// Kod SERVERDA katta harfga keltiriladi; biz ham shunday
  /// yuboramiz, aks holda jonli javob bilan taqqoslashda chalkashlik
  /// bo'lardi.
  Future<CouponClaim> claim(String code) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/api/promo',
      body: {'code': code.trim().toUpperCase()},
    );
    return CouponClaim.fromJson(data);
  }
}
