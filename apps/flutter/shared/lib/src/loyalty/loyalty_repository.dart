import '../api/api_client.dart';

/// Coin tarixidagi bitta yozuv.
class LoyaltyEntry {
  const LoyaltyEntry({
    required this.id,
    required this.amount,
    required this.reasonKey,
    required this.daysAgo,
  });

  factory LoyaltyEntry.fromJson(Map<String, dynamic> json) => LoyaltyEntry(
        id: json['id'] as String? ?? '',
        // Manfiy — sarflangan, musbat — yig'ilgan.
        amount: (json['amount'] as num?)?.toInt() ?? 0,
        // Sabab SERVERDA kalitga aylantiriladi (`reasonToKey`), chunki
        // bazadagi qiymat (`ORDER_EARN`) foydalanuvchiga ko'rsatiladigan
        // matn emas. Noma'lum kalit kelsa, tarjima o'rniga kalitning
        // o'zi chiqadi — jim bo'sh satr emas.
        reasonKey: json['reasonKey'] as String? ?? 'orderEarn',
        daysAgo: (json['daysAgo'] as num?)?.toInt() ?? 0,
      );

  final String id;
  final int amount;
  final String reasonKey;
  final int daysAgo;

  bool get isEarn => amount >= 0;
}

/// Kunlik check-in natijasi (`POST /api/loyalty/checkin`).
class CheckinResult {
  const CheckinResult({
    required this.alreadyClaimed,
    required this.awarded,
    required this.balance,
  });

  factory CheckinResult.fromJson(Map<String, dynamic> json) => CheckinResult(
        alreadyClaimed: json['alreadyClaimed'] as bool? ?? false,
        awarded: (json['awarded'] as num?)?.toInt() ?? 0,
        balance: (json['balance'] as num?)?.toInt() ?? 0,
      );

  /// Bugun allaqachon olingan — server ATOMIK tekshiradi, shuning
  /// uchun ikki marta bosilsa ham ikkinchi coin berilmaydi.
  final bool alreadyClaimed;
  final int awarded;
  final int balance;
}

/// Sodiqlik dasturi xulosasi (`GET /api/loyalty`).
class LoyaltySummary {
  const LoyaltySummary({
    required this.coins,
    required this.spentSom,
    required this.checkedInToday,
    this.history = const [],
  });

  factory LoyaltySummary.fromJson(Map<String, dynamic> json) => LoyaltySummary(
        coins: (json['coins'] as num?)?.toInt() ?? 0,
        spentSom: (json['spentSom'] as num?)?.toInt() ?? 0,
        checkedInToday: json['checkedInToday'] as bool? ?? false,
        // Server tarixni boshidan qaytarardi, lekin model uni
        // o'qimasdi — shu sababli ekran qurish ham mumkin emas edi.
        history: (json['history'] as List<dynamic>? ?? const [])
            .cast<Map<String, dynamic>>()
            .map(LoyaltyEntry.fromJson)
            .toList(),
      );

  /// Joriy coin balansi.
  final int coins;

  /// Umumiy xarid summasi (daraja hisobida ishlatiladi).
  final int spentSom;

  final bool checkedInToday;

  /// Oxirgi 20 ta harakat — server shuncha beradi.
  final List<LoyaltyEntry> history;
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

  /// Kunlik check-in — kuniga bir marta +5 coin.
  ///
  /// Takroriy bosishni SERVER to'xtatadi (`alreadyClaimed`): tekshiruv
  /// tranzaksiya ichida, shuning uchun ikkita tez bosish ham ikkita
  /// coin bermaydi. Klient faqat natijani ko'rsatadi.
  Future<CheckinResult> checkIn() async {
    final data = await _api.post<Map<String, dynamic>>('/api/loyalty/checkin');
    return CheckinResult.fromJson(data);
  }
}
