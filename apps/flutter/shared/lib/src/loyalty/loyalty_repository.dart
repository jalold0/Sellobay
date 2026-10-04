import '../api/api_client.dart';

/// Sodiqlik dasturi xulosasi (`GET /api/loyalty`).
class LoyaltySummary {
  const LoyaltySummary({
    required this.coins,
    required this.spentSom,
    required this.checkedInToday,
  });

  factory LoyaltySummary.fromJson(Map<String, dynamic> json) => LoyaltySummary(
        coins: (json['coins'] as num?)?.toInt() ?? 0,
        spentSom: (json['spentSom'] as num?)?.toInt() ?? 0,
        checkedInToday: json['checkedInToday'] as bool? ?? false,
      );

  /// Joriy coin balansi.
  final int coins;

  /// Umumiy xarid summasi (daraja hisobida ishlatiladi).
  final int spentSom;

  final bool checkedInToday;
}

/// Sello Coins. AUTH talab qiladi.
class LoyaltyRepository {
  LoyaltyRepository(this._api);

  final ApiClient _api;

  /// Balans checkoutda ko'rsatish uchun olinadi.
  ///
  /// `AuthUser.loyaltyPoints` ham bor, lekin u oxirgi `me()` paytidagi
  /// qiymat: oraliqda buyurtma bergan foydalanuvchida u eskirgan
  /// bo'ladi. Yakuniy chegirmani baribir SERVER hisoblaydi
  /// (`orders-server.ts` balansni tranzaksiya ichida qayta o'qiydi).
  Future<LoyaltySummary> fetchSummary() async {
    final data = await _api.get<Map<String, dynamic>>('/api/loyalty');
    return LoyaltySummary.fromJson(data);
  }
}
