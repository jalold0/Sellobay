import 'package:decimal/decimal.dart';

import '../catalog/localized_text.dart';
import '../utils/money.dart';

/// Buyurtma holati — `OrderStatus` enum (schema.prisma) bilan bir xil.
/// To'lov holati — `PaymentStatus` enum (schema.prisma) bilan bir xil.
enum PaymentStatus {
  pending('PENDING'),
  authorized('AUTHORIZED'),
  paid('PAID'),
  partiallyRefunded('PARTIALLY_REFUNDED'),
  refunded('REFUNDED'),
  failed('FAILED'),
  cancelled('CANCELLED');

  const PaymentStatus(this.value);

  final String value;

  String get labelKey => 'order.paymentStatus.$value';

  /// Pul kelganmi.
  bool get isSettled => this == PaymentStatus.paid || this == PaymentStatus.authorized;

  /// Mijoz yana urinib ko'rishi MUMKINMI.
  ///
  /// `CANCELLED` va qaytarilganlar bundan tashqarida: ularda qayta
  /// to'lash tugmasini ko'rsatsak, server baribir rad etardi.
  bool get isRetriable => this == PaymentStatus.pending || this == PaymentStatus.failed;

  static PaymentStatus? fromValue(String? value) {
    for (final s in PaymentStatus.values) {
      if (s.value == value) return s;
    }
    return null;
  }
}

enum OrderStatus {
  pending('PENDING'),
  confirmed('CONFIRMED'),
  paid('PAID'),
  processing('PROCESSING'),
  packed('PACKED'),
  shipped('SHIPPED'),
  outForDelivery('OUT_FOR_DELIVERY'),
  delivered('DELIVERED'),
  cancelled('CANCELLED'),
  returned('RETURNED'),
  refunded('REFUNDED');

  const OrderStatus(this.value);

  final String value;

  /// Matn `packages/i18n` da (`order.status.*`) — bu yerda yozilmaydi.
  String get labelKey => 'order.status.$value';

  /// Bekor qilish MUMKINMI.
  ///
  /// Server qoidasi: faqat `PENDING` (`/api/orders/[id]/cancel` 409
  /// `NOT_CANCELLABLE` beradi). Tugmani shu bo'yicha ko'rsatamiz —
  /// bosilib, keyin xato chiqishidan ko'ra ko'rinmagani yaxshi.
  bool get isCancellable => this == OrderStatus.pending;

  /// Buyurtma yopilganmi (boshqa o'zgarmaydi).
  bool get isClosed =>
      this == OrderStatus.cancelled ||
      this == OrderStatus.returned ||
      this == OrderStatus.refunded;

  bool get isDelivered => this == OrderStatus.delivered;

  static OrderStatus? fromValue(String? value) {
    for (final s in OrderStatus.values) {
      if (s.value == value) return s;
    }
    return null;
  }
}

/// Buyurtmadagi bitta pozitsiya.
///
/// `nameSnapshot` — buyurtma berilgan PAYTDAGI nom (bazada `Json`,
/// ya'ni ko'p tilli). Mahsulot keyin nomini o'zgartirsa ham chekdagi
/// nom o'zgarmaydi — shuning uchun katalogdagi nom emas, shu olinadi.
class OrderLine {
  const OrderLine({
    required this.id,
    required this.name,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    required this.slug,
    required this.rawImageUrl,
  });

  factory OrderLine.fromJson(Map<String, dynamic> json) => OrderLine(
        id: json['id'] as String,
        name: LocalizedText.fromJson(json['nameSnapshot']),
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
        // Ro'yxat endpointida `unitPrice` YO'Q — faqat detalda bor.
        unitPrice: json['unitPrice'] == null ? null : parseMoney(json['unitPrice']),
        totalPrice: parseMoney(json['totalPrice']),
        slug: json['slug'] as String?,
        rawImageUrl: json['imageUrl'] as String?,
      );

  final String id;
  final LocalizedText name;
  final int quantity;
  final Decimal? unitPrice;
  final Decimal totalPrice;
  final String? slug;
  final String? rawImageUrl;
}

/// Yetkazish manzili.
class OrderAddress {
  const OrderAddress({
    required this.recipientName,
    required this.phone,
    required this.region,
    required this.city,
    required this.street,
    required this.apartment,
  });

  factory OrderAddress.fromJson(Map<String, dynamic> json) => OrderAddress(
        recipientName: json['recipientName'] as String? ?? '',
        phone: json['phone'] as String? ?? '',
        region: json['region'] as String? ?? '',
        city: json['city'] as String? ?? '',
        street: json['street'] as String? ?? '',
        apartment: json['apartment'] as String?,
      );

  final String recipientName;
  final String phone;
  final String region;
  final String city;
  final String street;
  final String? apartment;

  String get oneLine =>
      [region, city, street, apartment].whereType<String>().where((s) => s.isNotEmpty).join(', ');
}

/// Ro'yxatdagi buyurtma (`GET /api/orders`).
class OrderSummary {
  const OrderSummary({
    required this.id,
    required this.number,
    required this.status,
    required this.rawStatus,
    required this.grandTotal,
    required this.placedAt,
    required this.deliveredAt,
    required this.itemCount,
    required this.items,
    required this.paymentReview,
  });

  factory OrderSummary.fromJson(Map<String, dynamic> json) => OrderSummary(
        id: json['id'] as String,
        number: json['number'] as String,
        status: OrderStatus.fromValue(json['status'] as String?),
        // Server yangi holat qo'shsa ham xom qiymat yo'qolmaydi.
        rawStatus: json['status'] as String? ?? '',
        grandTotal: parseMoney(json['grandTotal']),
        placedAt: DateTime.tryParse(json['placedAt'] as String? ?? ''),
        deliveredAt: DateTime.tryParse(json['deliveredAt'] as String? ?? ''),
        itemCount: (json['itemCount'] as num?)?.toInt() ?? 0,
        items: (json['items'] as List<dynamic>? ?? const [])
            .cast<Map<String, dynamic>>()
            .map(OrderLine.fromJson)
            .toList(),
        // Karta orqali to'lov cheki admin tasdiqini kutmoqdami.
        paymentReview: json['paymentReview'] as bool? ?? false,
      );

  final String id;
  final String number;

  /// Ilova biladigan holat. Noma'lum qiymatda `null`.
  final OrderStatus? status;

  /// Serverdan kelgan xom qiymat — `status` null bo'lsa shuni ko'rsating.
  final String rawStatus;

  final Decimal grandTotal;
  final DateTime? placedAt;
  final DateTime? deliveredAt;
  final int itemCount;
  final List<OrderLine> items;
  final bool paymentReview;
}

/// To'liq buyurtma (`GET /api/orders/{id}`).
class OrderDetail {
  const OrderDetail({
    required this.id,
    required this.number,
    required this.status,
    required this.rawStatus,
    required this.subtotal,
    required this.shippingTotal,
    required this.discountTotal,
    required this.grandTotal,
    required this.promoCode,
    required this.notes,
    required this.deliveryMethod,
    required this.paymentProvider,
    required this.paymentStatus,
    required this.payment,
    required this.paymentReview,
    required this.placedAt,
    required this.deliveredAt,
    required this.editable,
    required this.returnable,
    required this.returnWindowDays,
    required this.address,
    required this.pickupPointName,
    required this.items,
  });

  factory OrderDetail.fromJson(Map<String, dynamic> json) {
    final order = json['order'] as Map<String, dynamic>? ?? json;
    final pickup = order['pickupPoint'] as Map<String, dynamic>?;
    return OrderDetail(
      id: order['id'] as String,
      number: order['number'] as String,
      status: OrderStatus.fromValue(order['status'] as String?),
      rawStatus: order['status'] as String? ?? '',
      subtotal: parseMoney(order['subtotal']),
      shippingTotal: parseMoney(order['shippingTotal']),
      discountTotal: parseMoney(order['discountTotal']),
      grandTotal: parseMoney(order['grandTotal']),
      promoCode: order['promoCode'] as String?,
      notes: order['notes'] as String?,
      deliveryMethod: order['deliveryMethod'] as String? ?? '',
      paymentProvider: order['paymentProvider'] as String?,
      paymentStatus: order['paymentStatus'] as String?,
      payment: PaymentStatus.fromValue(order['paymentStatus'] as String?),
      paymentReview: order['paymentReview'] as bool? ?? false,
      placedAt: DateTime.tryParse(order['placedAt'] as String? ?? ''),
      deliveredAt: DateTime.tryParse(order['deliveredAt'] as String? ?? ''),
      editable: order['editable'] as bool? ?? false,
      // Qaytarish oynasini SERVER hisoblaydi (yetkazilgan sana +
      // `RETURN_WINDOW_DAYS`). Buni Dart'da takrorlamaymiz.
      returnable: order['returnable'] as bool? ?? false,
      returnWindowDays: (order['returnWindowDays'] as num?)?.toInt() ?? 0,
      address: order['shippingAddress'] == null
          ? null
          : OrderAddress.fromJson(order['shippingAddress'] as Map<String, dynamic>),
      // Punkt nomi ham ko'p tilli (`/api/pickup-points` kabi).
      pickupPointName: pickup == null ? null : LocalizedText.fromJson(pickup['name']),
      items: (order['items'] as List<dynamic>? ?? const [])
          .cast<Map<String, dynamic>>()
          .map(OrderLine.fromJson)
          .toList(),
    );
  }

  final String id;
  final String number;
  final OrderStatus? status;
  final String rawStatus;
  final Decimal subtotal;
  final Decimal shippingTotal;
  final Decimal discountTotal;
  final Decimal grandTotal;
  final String? promoCode;
  final String? notes;
  final String deliveryMethod;
  final String? paymentProvider;

  /// Serverdagi XOM qiymat — ilova bilmaydigan holat ham ko'rsatiladi.
  final String? paymentStatus;

  /// Tanilgan holat; `null` bo'lsa [paymentStatus] xom holida chiqadi.
  final PaymentStatus? payment;
  final bool paymentReview;
  final DateTime? placedAt;
  final DateTime? deliveredAt;
  final bool editable;
  final bool returnable;
  final int returnWindowDays;
  final OrderAddress? address;
  final LocalizedText? pickupPointName;
  final List<OrderLine> items;

  bool get hasDiscount => discountTotal > Decimal.zero;
}

/// Raqam + telefon bo'yicha kuzatilgan buyurtma (`POST /api/orders/track`).
///
/// Javobda ATAYLAB kam ma'lumot: manzil, ism va to'lov tafsilotlari
/// berilmaydi — ular faqat kabinetda, to'liq autentifikatsiyadan
/// keyin ko'rinadi.
class TrackedOrder {
  const TrackedOrder({
    required this.number,
    required this.status,
    required this.rawStatus,
    required this.placedAt,
    required this.total,
    required this.deliveryMethod,
    required this.itemCount,
    required this.timeline,
  });

  factory TrackedOrder.fromJson(Map<String, dynamic> json) {
    final order = json['order'] as Map<String, dynamic>? ?? const {};
    return TrackedOrder(
      number: order['number'] as String? ?? '',
      status: OrderStatus.fromValue(order['status'] as String?),
      rawStatus: order['status'] as String? ?? '',
      placedAt: DateTime.tryParse(order['placedAt'] as String? ?? ''),
      total: parseMoney(order['total']),
      deliveryMethod: order['deliveryMethod'] as String?,
      itemCount: (order['itemCount'] as num?)?.toInt() ?? 0,
      timeline: (order['timeline'] as List<dynamic>? ?? const [])
          .cast<Map<String, dynamic>>()
          .map(TrackedStep.fromJson)
          .toList(),
    );
  }

  final String number;
  final OrderStatus? status;
  final String rawStatus;
  final DateTime? placedAt;
  final Decimal total;
  final String? deliveryMethod;
  final int itemCount;

  /// Holat tarixi — eng eskisidan boshlab.
  final List<TrackedStep> timeline;
}

/// Kuzatuvdagi bitta qadam.
class TrackedStep {
  const TrackedStep({required this.status, required this.rawStatus, required this.at});

  factory TrackedStep.fromJson(Map<String, dynamic> json) => TrackedStep(
        status: OrderStatus.fromValue(json['status'] as String?),
        rawStatus: json['status'] as String? ?? '',
        at: DateTime.tryParse(json['at'] as String? ?? ''),
      );

  final OrderStatus? status;
  final String rawStatus;
  final DateTime? at;
}
