import 'package:decimal/decimal.dart';

import '../catalog/localized_text.dart';
import '../utils/money.dart';

/// Yetkazish holati — `DeliveryStatus` enum (schema.prisma) bilan bir xil.
enum DeliveryStatus {
  assigned('ASSIGNED'),
  pickedUp('PICKED_UP'),
  inTransit('IN_TRANSIT'),
  arrived('ARRIVED'),
  delivered('DELIVERED'),
  failed('FAILED'),
  returned('RETURNED');

  const DeliveryStatus(this.value);

  final String value;

  /// Holat nomi: `courier.status.ASSIGNED`.
  String get labelKey => 'courier.status.$value';

  /// Shu holatga O'TISH tugmasining matni: `courier.action.PICKED_UP`.
  ///
  /// `ASSIGNED` va `RETURNED` uchun tugma yo'q — ularga kuryer
  /// o'tkazmaydi.
  String get actionKey => 'courier.action.$value';

  bool get isTerminal =>
      this == DeliveryStatus.delivered ||
      this == DeliveryStatus.failed ||
      this == DeliveryStatus.returned;

  static DeliveryStatus? fromValue(String? value) {
    for (final s in DeliveryStatus.values) {
      if (s.value == value) return s;
    }
    return null;
  }
}

/// Yetkazishdagi buyurtma pozitsiyasi.
class DeliveryItem {
  const DeliveryItem({required this.id, required this.name, required this.quantity});

  factory DeliveryItem.fromJson(Map<String, dynamic> json) => DeliveryItem(
        id: json['id'] as String,
        // Buyurtma berilgan paytdagi nom, ko'p tilli.
        name: LocalizedText.fromJson(json['nameSnapshot']),
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      );

  final String id;
  final LocalizedText name;
  final int quantity;
}

/// Kuryerga ko'rinadigan yetkazish (`GET /api/courier/deliveries`).
class CourierDelivery {
  const CourierDelivery({
    required this.id,
    required this.status,
    required this.rawStatus,
    required this.claimed,
    required this.nextStatuses,
    required this.isReturn,
    required this.method,
    required this.pickupAddress,
    required this.destinationAddress,
    required this.latitude,
    required this.longitude,
    required this.pickedUpAt,
    required this.deliveredAt,
    required this.failureReason,
    required this.hasProofPhoto,
    required this.orderNumber,
    required this.orderTotal,
    required this.recipientName,
    required this.recipientPhone,
    required this.itemCount,
    required this.items,
  });

  factory CourierDelivery.fromJson(Map<String, dynamic> json) {
    final order = json['order'] as Map<String, dynamic>? ?? const {};
    return CourierDelivery(
      id: json['id'] as String,
      status: DeliveryStatus.fromValue(json['status'] as String?),
      rawStatus: json['status'] as String? ?? '',
      // Kuryer biriktirilganmi — SERVER aytadi. `ASSIGNED` holati
      // "yetkazishga tayinlandi" degani, "kuryerga biriktirildi" EMAS:
      // egasiz yangi yozuv ham `ASSIGNED` bo'ladi. Holatdan taxmin
      // qilsak, bo'sh topshiriq ustida «Biriktirildi» deb yozilardi.
      claimed: json['claimed'] as bool? ?? false,
      // Mumkin bo'lgan o'tishlarni SERVER aytadi (`courier-server.ts`
      // dagi jadval). Dart'da takrorlasak, ikkisi ajralib ketardi va
      // ilova serverda rad etiladigan tugmani ko'rsatardi.
      nextStatuses: (json['nextStatuses'] as List<dynamic>? ?? const [])
          .cast<String>()
          .map(DeliveryStatus.fromValue)
          .whereType<DeliveryStatus>()
          .toList(),
      // Yo'nalishni SERVER aytadi. Buyurtma holatidan taxmin qilib
      // bo'lmaydi: bitta buyurtmada avval yetkazish, keyin qaytarish
      // bo'lishi mumkin va ikkalasi bir vaqtda mavjud bo'ladi.
      isReturn: json['kind'] == 'RETURN',
      method: json['method'] as String? ?? '',
      pickupAddress: json['pickupAddress'] as String?,
      destinationAddress: json['destinationAddress'] as String? ?? '',
      latitude: (json['destinationLat'] as num?)?.toDouble(),
      longitude: (json['destinationLng'] as num?)?.toDouble(),
      pickedUpAt: DateTime.tryParse(json['pickedUpAt'] as String? ?? ''),
      deliveredAt: DateTime.tryParse(json['deliveredAt'] as String? ?? ''),
      // Server suratning YO'LINI bermaydi, faqat borligini: unda
      // mijozning uyi va eshigi bo'ladi.
      hasProofPhoto: json['hasProofPhoto'] as bool? ?? false,
      failureReason: json['failureReason'] as String?,
      orderNumber: order['number'] as String? ?? '',
      orderTotal: parseMoney(order['grandTotal']),
      recipientName: order['recipientName'] as String?,
      recipientPhone: order['recipientPhone'] as String?,
      itemCount: (order['itemCount'] as num?)?.toInt() ?? 0,
      items: (order['items'] as List<dynamic>? ?? const [])
          .cast<Map<String, dynamic>>()
          .map(DeliveryItem.fromJson)
          .toList(),
    );
  }

  final String id;
  final DeliveryStatus? status;
  final String rawStatus;

  /// Kuryer o'ziga olganmi.
  final bool claimed;

  /// Shu yetkazish uchun ruxsat etilgan keyingi holatlar.
  final List<DeliveryStatus> nextStatuses;

  /// Qaytarish topshirig'imi: mahsulot mijozdan OLINIB, omborga
  /// topshiriladi. Oddiy yetkazishning teskarisi.
  final bool isReturn;

  final String method;

  /// Qaytarishda — mijozning manzili (shu yerdan olinadi).
  /// Oddiy yetkazishda `null`.
  final String? pickupAddress;

  final String destinationAddress;
  final double? latitude;
  final double? longitude;
  final DateTime? pickedUpAt;
  final DateTime? deliveredAt;
  final String? failureReason;

  /// Yetkazish isboti surati biriktirilganmi.
  final bool hasProofPhoto;

  final String orderNumber;
  final Decimal orderTotal;
  final String? recipientName;
  final String? recipientPhone;
  final int itemCount;
  final List<DeliveryItem> items;
}

/// Ro'yxat javobi: o'ziniki va bo'shlari.
class CourierDeliveries {
  const CourierDeliveries({required this.mine, required this.available});

  factory CourierDeliveries.fromJson(Map<String, dynamic> json) => CourierDeliveries(
        mine: _list(json['mine']),
        available: _list(json['available']),
      );

  static List<CourierDelivery> _list(Object? value) =>
      (value as List<dynamic>? ?? const [])
          .cast<Map<String, dynamic>>()
          .map(CourierDelivery.fromJson)
          .toList();

  /// Kuryerga biriktirilgan, hali tugamaganlari.
  final List<CourierDelivery> mine;

  /// Egasi yo'q yetkazishlar — istalgan kuryer olishi mumkin.
  final List<CourierDelivery> available;

  bool get isEmpty => mine.isEmpty && available.isEmpty;
}

/// Kuryerning ko'rsatkichlari (`GET /api/courier/stats`).
///
/// «Bugun» SERVERDA, Toshkent vaqtida hisoblanadi. Ilovada hisoblash
/// noto'g'ri bo'lardi: qurilma zonasi boshqa bo'lsa (yoki foydalanuvchi
/// uni qo'lda o'zgartirsa) kun chegarasi siljib ketardi.
///
/// Daromad YO'Q — sxemada kuryer to'lovi modeli yo'q, har qanday summa
/// to'qima bo'lardi.
class CourierStats {
  const CourierStats({
    required this.deliveredToday,
    required this.failedToday,
    required this.active,
    required this.allTimeDelivered,
  });

  factory CourierStats.fromJson(Map<String, dynamic> json) {
    final today = json['today'] as Map<String, dynamic>? ?? const {};
    return CourierStats(
      deliveredToday: (today['delivered'] as num?)?.toInt() ?? 0,
      failedToday: (today['failed'] as num?)?.toInt() ?? 0,
      active: (json['active'] as num?)?.toInt() ?? 0,
      allTimeDelivered: (json['allTimeDelivered'] as num?)?.toInt() ?? 0,
    );
  }

  final int deliveredToday;
  final int failedToday;

  /// Hozir qo'lda turgan, tugamagan topshiriqlar.
  final int active;
  final int allTimeDelivered;
}

/// Tarix sahifasi (`GET /api/courier/history`).
class CourierHistoryPage {
  const CourierHistoryPage({required this.items, required this.nextCursor});

  factory CourierHistoryPage.fromJson(Map<String, dynamic> json) => CourierHistoryPage(
        items: (json['items'] as List<dynamic>? ?? const [])
            .cast<Map<String, dynamic>>()
            .map(CourierDelivery.fromJson)
            .toList(),
        // `null` — oxiri. Serverdan keladi, ilova o'zi hisoblamaydi:
        // «yana bormi» ni bilish uchun unga butun jadval kerak bo'lardi.
        nextCursor: json['nextCursor'] as String?,
      );

  final List<CourierDelivery> items;
  final String? nextCursor;

  bool get hasMore => nextCursor != null;
}
