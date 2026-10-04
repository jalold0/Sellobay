import 'package:decimal/decimal.dart';

import '../catalog/localized_text.dart';
import '../utils/money.dart';

/// Yetkazib berish usuli — serverdagi `deliveryMethod` enum bilan bir xil.
enum DeliveryMethod {
  homeDelivery('HOME_DELIVERY', 'checkout.shipping.home'),
  express('EXPRESS', 'checkout.shipping.express'),
  pickupPoint('PICKUP_POINT', 'checkout.shipping.pickup');

  const DeliveryMethod(this.value, this.labelKey);

  final String value;
  final String labelKey;

  /// Toshkent shahri bilan cheklanganmi.
  ///
  /// Serverdagi qoida: `HOME_DELIVERY` va `EXPRESS` faqat Toshkent uchun.
  /// Tekshiruvni SERVER bajaradi (koordinata bo'lsa bbox, bo'lmasa matn
  /// bo'yicha) — bu yerda faqat foydalanuvchiga ogohlantirish uchun.
  bool get isTashkentOnly => this != DeliveryMethod.pickupPoint;
}

/// To'lov usuli — serverdagi `paymentProvider` enum bilan bir xil.
///
/// `HUMO` va `UZUM_BANK` yo'q: serverda ular uchun integratsiya
/// yozilmagan (`availableProviders()` ularni qaytarmaydi).
enum PaymentProvider {
  click('CLICK', 'checkout.payment.click'),
  payme('PAYME', 'checkout.payment.payme'),

  /// Qo'lda karta o'tkazmasi — platforma kartasiga pul tashlanadi va
  /// chek yuklanadi, keyin admin tasdiqlaydi.
  ///
  /// Serverda bu AYNAN `UZCARD` deb yuritiladi (`MANUAL_CARD_PROVIDER`):
  /// yangi enum qiymati va migratsiya qilmaslik uchun mavjudi
  /// ishlatilgan.
  uzcard('UZCARD', 'checkout.payment.card'),

  cashOnDelivery('CASH_ON_DELIVERY', 'checkout.payment.cash');

  const PaymentProvider(this.value, this.labelKey);

  final String value;
  final String labelKey;

  /// Tagidagi izoh matni (`checkout.payment.*Sub`).
  String get hintKey => switch (this) {
        PaymentProvider.click => 'checkout.payment.clickSub',
        PaymentProvider.payme => 'checkout.payment.paymeSub',
        PaymentProvider.uzcard => 'checkout.payment.cardSub',
        PaymentProvider.cashOnDelivery => 'checkout.payment.cashSub',
      };

  /// Onlayn — buyurtmadan keyin provayderning to'lov sahifasiga o'tiladi.
  ///
  /// `UZCARD` onlayn EMAS: redirect yo'q, pul qo'lda o'tkaziladi
  /// (`isOnlineProvider` serverda ham shunday).
  bool get isOnline => this == PaymentProvider.click || this == PaymentProvider.payme;

  /// Chek rasmi MAJBURIY — serverda ham (`400 RECEIPT_REQUIRED`).
  bool get requiresReceipt => this == PaymentProvider.uzcard;

  static PaymentProvider? fromValue(String value) {
    for (final p in PaymentProvider.values) {
      if (p.value == value) return p;
    }
    return null;
  }
}

/// Platforma to'lov kartasi (`GET /api/payment-cards`).
///
/// Ro'yxat BO'SH bo'lsa, qo'lda karta to'lovi umuman taklif qilinmaydi:
/// server `MANUAL_PAYMENT_CARDS` sozlanmagan bo'lsa bo'sh qaytaradi va
/// buyurtmani ham rad etadi (`503 MANUAL_CARD_UNAVAILABLE`). Mijozga
/// qayerga pul o'tkazishini aytmay turib usulni ko'rsatish — yolg'on.
class PaymentCard {
  const PaymentCard({required this.number, required this.holder, required this.bank});

  factory PaymentCard.fromJson(Map<String, dynamic> json) => PaymentCard(
        number: json['number'] as String? ?? '',
        holder: json['holder'] as String? ?? '',
        bank: json['bank'] as String?,
      );

  final String number;
  final String holder;
  final String? bank;
}

/// `GET /api/payment-cards` javobi.
class PaymentOptions {
  const PaymentOptions({required this.cards, required this.providers});

  final List<PaymentCard> cards;
  final List<PaymentProvider> providers;

  /// Qo'lda karta to'lovi hozir mumkinmi.
  ///
  /// Qoida WEB bilan bir xil (`payment-section.tsx`): karta ro'yxati
  /// bo'sh bo'lmasa. Server `providers` ichida `UZCARD` ni qaytarmaydi —
  /// u yerda faqat integratsiyali provayderlar bor.
  bool get manualCardAvailable => cards.isNotEmpty;

  /// Ekranda ko'rsatiladigan to'liq ro'yxat.
  List<PaymentProvider> get selectable => [
        ...providers,
        if (manualCardAvailable) PaymentProvider.uzcard,
      ];
}

/// Topshirish punkti (`GET /api/pickup-points`).
///
/// `name` KO'P TILLI (`PickupPoint.name` bazada `Json`), `region`,
/// `city` va `street` esa oddiy satr. Jonli javobda shunday:
/// `{"name": {"uz": "Andijon markaz", "ru": "ПВЗ Андижан"}, "city": "Andijon"}`.
class PickupPoint {
  const PickupPoint({
    required this.id,
    required this.code,
    required this.name,
    required this.region,
    required this.city,
    required this.street,
    required this.phone,
    required this.workingHours,
  });

  factory PickupPoint.fromJson(Map<String, dynamic> json) => PickupPoint(
        id: json['id'] as String,
        code: json['code'] as String? ?? '',
        name: LocalizedText.fromJson(json['name']),
        region: json['region'] as String? ?? '',
        city: json['city'] as String? ?? '',
        street: json['street'] as String? ?? '',
        phone: json['phone'] as String?,
        workingHours: json['workingHours'] as String?,
      );

  final String id;
  final String code;
  final LocalizedText name;
  final String region;
  final String city;
  final String street;
  final String? phone;
  final String? workingHours;

  String get address => [city, street].where((s) => s.isNotEmpty).join(', ');
}

/// Promokod tekshiruvi (`POST /api/promo/validate`).
///
/// Bu FAQAT oldindan ko'rsatish. Yakuniy chegirma buyurtma yaratilganda
/// serverda qayta hisoblanadi — shuning uchun bu yerdagi son bilan
/// yakuniy summa farq qilishi mumkin.
class PromoPreview {
  const PromoPreview({
    required this.valid,
    required this.code,
    required this.discount,
    required this.message,
  });

  factory PromoPreview.fromJson(Map<String, dynamic> json) => PromoPreview(
        valid: json['valid'] as bool? ?? false,
        code: json['code'] as String?,
        discount: json['discount'] == null ? null : parseMoney(json['discount']),
        // Server tayyor o'zbekcha matn beradi — qayta yozmaymiz.
        message: json['message'] as String?,
      );

  final bool valid;
  final String? code;
  final Decimal? discount;
  final String? message;
}

/// Yaratilgan buyurtma (`POST /api/orders`).
class PlacedOrder {
  const PlacedOrder({
    required this.id,
    required this.number,
    required this.status,
    required this.grandTotal,
    required this.coinsEarned,
    required this.coinsRedeemed,
    required this.appliedPromoCode,
    required this.replayed,
  });

  factory PlacedOrder.fromJson(Map<String, dynamic> json) {
    final order = json['order'] as Map<String, dynamic>;
    return PlacedOrder(
      id: order['id'] as String,
      number: order['number'] as String,
      status: order['status'] as String? ?? 'PENDING',
      grandTotal: parseMoney(order['grandTotal']),
      coinsEarned: (order['coinsEarned'] as num?)?.toInt() ?? 0,
      coinsRedeemed: (order['coinsRedeemed'] as num?)?.toInt() ?? 0,
      appliedPromoCode: order['appliedPromoCode'] as String?,
      // `true` — ayni `Idempotency-Key` bilan buyurtma ALLAQACHON
      // yaratilgan edi va server o'shanisini qaytardi. Yangi buyurtma
      // yaratilmagan, ya'ni bu XATO EMAS.
      replayed: json['replayed'] as bool? ?? false,
    );
  }

  final String id;
  final String number;
  final String status;
  final Decimal grandTotal;
  final int coinsEarned;
  final int coinsRedeemed;
  final String? appliedPromoCode;
  final bool replayed;
}

/// To'lovni boshlash natijasi (`POST /api/payments/create`).
class PaymentStart {
  const PaymentStart({required this.online, required this.checkoutUrl});

  factory PaymentStart.fromJson(Map<String, dynamic> json) => PaymentStart(
        online: json['online'] as bool? ?? false,
        checkoutUrl: json['checkoutUrl'] as String?,
      );

  final bool online;

  /// Onlayn to'lov sahifasi. Naqd to'lovda `null`.
  final String? checkoutUrl;
}
