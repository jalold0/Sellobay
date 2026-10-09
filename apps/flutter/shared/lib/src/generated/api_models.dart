// GENERATSIYA QILINGAN — QO'LDA TAHRIRLAMANG.
//
// Manba: packages/api-contract (Zod sxemalari -> openapi.json).
// Yangilash: `pnpm api:dart` (repo root'dan).
//
// Maydon qo'shish kerak bo'lsa — `packages/api-contract/src/*.ts` da
// qo'shing: shunda TypeScript tipi ham, bu fayl ham birga yangilanadi.

import 'package:decimal/decimal.dart';

import '../utils/money.dart';

/// `DeliveryKind` — serverdagi qiymatlar.
///
/// Dart `enum` EMAS: server yangi qiymat qo'shsa eski ilova yiqilmasin.
abstract final class DeliveryKindValues {
  static const outbound = 'OUTBOUND';
  static const return_ = 'RETURN';

  static const all = <String>['OUTBOUND', 'RETURN'];
}

/// `DeliveryStatus` — serverdagi qiymatlar.
///
/// Dart `enum` EMAS: server yangi qiymat qo'shsa eski ilova yiqilmasin.
abstract final class DeliveryStatusValues {
  static const assigned = 'ASSIGNED';
  static const pickedUp = 'PICKED_UP';
  static const inTransit = 'IN_TRANSIT';
  static const arrived = 'ARRIVED';
  static const delivered = 'DELIVERED';
  static const failed = 'FAILED';
  static const returned = 'RETURNED';

  static const all = <String>['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'FAILED', 'RETURNED'];
}

class ProductListItem {
  const ProductListItem({
    required this.id,
    required this.slug,
    required this.sku,
    required this.name,
    required this.price,
    this.oldPrice,
    required this.currency,
    required this.rating,
    required this.reviewCount,
    required this.soldCount,
    required this.isFeatured,
    this.brand,
    this.category,
    this.imageUrl,
    required this.stock,
    required this.inStock,
  });

  factory ProductListItem.fromJson(Map<String, dynamic> json) => ProductListItem(
      id: json['id'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      sku: json['sku'] as String? ?? '',
      name: (json['name'] as Map<String, dynamic>?) ?? const {},
      price: parseMoney(json['price']),
      oldPrice: json['oldPrice'] == null ? null : parseMoney(json['oldPrice']),
      currency: json['currency'] as String? ?? '',
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      reviewCount: (json['reviewCount'] as num?)?.toInt() ?? 0,
      soldCount: (json['soldCount'] as num?)?.toInt() ?? 0,
      isFeatured: json['isFeatured'] as bool? ?? false,
      brand: json['brand'] as Map<String, dynamic>?,
      category: json['category'] as Map<String, dynamic>?,
      imageUrl: json['imageUrl'] as String?,
      stock: (json['stock'] as num?)?.toInt() ?? 0,
      inStock: json['inStock'] as bool? ?? false,
      );

  final String id;

  final String slug;

  final String sku;

  final Map<String, dynamic> name;

  /// Decimal(14,2) satr sifatida
  final Decimal price;

  /// Decimal(14,2) satr sifatida
  final Decimal? oldPrice;

  final String currency;

  final double rating;

  final int reviewCount;

  final int soldCount;

  final bool isFeatured;

  final Map<String, dynamic>? brand;

  final Map<String, dynamic>? category;

  final String? imageUrl;

  final int stock;

  final bool inStock;
}

class ProductList {
  const ProductList({
    required this.items,
    required this.total,
    required this.page,
    required this.limit,
    required this.hasMore,
  });

  factory ProductList.fromJson(Map<String, dynamic> json) => ProductList(
      items: (json['items'] as List<dynamic>? ?? const []).map((e) => ProductListItem.fromJson((e as Map<String, dynamic>?) ?? const {})).toList(),
      total: (json['total'] as num?)?.toInt() ?? 0,
      page: (json['page'] as num?)?.toInt() ?? 0,
      limit: (json['limit'] as num?)?.toInt() ?? 0,
      hasMore: json['hasMore'] as bool? ?? false,
      );

  final List<ProductListItem> items;

  final int total;

  final int page;

  final int limit;

  final bool hasMore;
}

class Category {
  const Category({
    required this.id,
    required this.slug,
    required this.name,
    this.productCount,
  });

  factory Category.fromJson(Map<String, dynamic> json) => Category(
      id: json['id'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      name: (json['name'] as Map<String, dynamic>?) ?? const {},
      productCount: (json['productCount'] as num?)?.toInt(),
      );

  final String id;

  final String slug;

  final Map<String, dynamic> name;

  final int? productCount;
}

class Brand {
  const Brand({
    required this.id,
    required this.slug,
    required this.name,
  });

  factory Brand.fromJson(Map<String, dynamic> json) => Brand(
      id: json['id'] as String? ?? '',
      slug: json['slug'] as String? ?? '',
      name: json['name'] as String? ?? '',
      );

  final String id;

  final String slug;

  final String name;
}

class DeliveryItem {
  const DeliveryItem({
    required this.id,
    required this.quantity,
    required this.nameSnapshot,
  });

  factory DeliveryItem.fromJson(Map<String, dynamic> json) => DeliveryItem(
      id: json['id'] as String? ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      nameSnapshot: (json['nameSnapshot'] as Map<String, dynamic>?) ?? const {},
      );

  final String id;

  final int quantity;

  final Map<String, dynamic> nameSnapshot;
}

class DeliveryOrder {
  const DeliveryOrder({
    required this.id,
    required this.number,
    required this.grandTotal,
    this.placedAt,
    this.notes,
    this.recipientName,
    this.recipientPhone,
    required this.itemCount,
    required this.items,
  });

  factory DeliveryOrder.fromJson(Map<String, dynamic> json) => DeliveryOrder(
      id: json['id'] as String? ?? '',
      number: json['number'] as String? ?? '',
      grandTotal: parseMoney(json['grandTotal']),
      placedAt: DateTime.tryParse(json['placedAt'] as String? ?? ''),
      notes: json['notes'] as String?,
      recipientName: json['recipientName'] as String?,
      recipientPhone: json['recipientPhone'] as String?,
      itemCount: (json['itemCount'] as num?)?.toInt() ?? 0,
      items: (json['items'] as List<dynamic>? ?? const []).map((e) => DeliveryItem.fromJson((e as Map<String, dynamic>?) ?? const {})).toList(),
      );

  final String id;

  final String number;

  /// Decimal(14,2) satr sifatida
  final Decimal grandTotal;

  final DateTime? placedAt;

  final String? notes;

  final String? recipientName;

  final String? recipientPhone;

  final int itemCount;

  final List<DeliveryItem> items;
}

class Delivery {
  const Delivery({
    required this.id,
    required this.kind,
    required this.status,
    required this.method,
    this.pickupAddress,
    required this.destinationAddress,
    this.destinationLat,
    this.destinationLng,
    this.assignedAt,
    this.pickedUpAt,
    this.deliveredAt,
    this.failureReason,
    this.createdAt,
    required this.claimed,
    required this.hasProofPhoto,
    required this.nextStatuses,
    required this.order,
  });

  factory Delivery.fromJson(Map<String, dynamic> json) => Delivery(
      id: json['id'] as String? ?? '',
      kind: json['kind'] as String? ?? '',
      status: json['status'] as String? ?? '',
      method: json['method'] as String? ?? '',
      pickupAddress: json['pickupAddress'] as String?,
      destinationAddress: json['destinationAddress'] as String? ?? '',
      destinationLat: (json['destinationLat'] as num?)?.toDouble(),
      destinationLng: (json['destinationLng'] as num?)?.toDouble(),
      assignedAt: DateTime.tryParse(json['assignedAt'] as String? ?? ''),
      pickedUpAt: DateTime.tryParse(json['pickedUpAt'] as String? ?? ''),
      deliveredAt: DateTime.tryParse(json['deliveredAt'] as String? ?? ''),
      failureReason: json['failureReason'] as String?,
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
      claimed: json['claimed'] as bool? ?? false,
      hasProofPhoto: json['hasProofPhoto'] as bool? ?? false,
      nextStatuses: (json['nextStatuses'] as List<dynamic>? ?? const []).map((e) => e as String? ?? '').toList(),
      order: DeliveryOrder.fromJson((json['order'] as Map<String, dynamic>?) ?? const {}),
      );

  final String id;

  final String kind;

  final String status;

  final String method;

  final String? pickupAddress;

  final String destinationAddress;

  final double? destinationLat;

  final double? destinationLng;

  final DateTime? assignedAt;

  final DateTime? pickedUpAt;

  final DateTime? deliveredAt;

  final String? failureReason;

  final DateTime? createdAt;

  final bool claimed;

  final bool hasProofPhoto;

  final List<String> nextStatuses;

  final DeliveryOrder order;
}

class CourierDeliveries {
  const CourierDeliveries({
    required this.mine,
    required this.available,
  });

  factory CourierDeliveries.fromJson(Map<String, dynamic> json) => CourierDeliveries(
      mine: (json['mine'] as List<dynamic>? ?? const []).map((e) => Delivery.fromJson((e as Map<String, dynamic>?) ?? const {})).toList(),
      available: (json['available'] as List<dynamic>? ?? const []).map((e) => Delivery.fromJson((e as Map<String, dynamic>?) ?? const {})).toList(),
      );

  final List<Delivery> mine;

  final List<Delivery> available;
}

class CourierHistory {
  const CourierHistory({
    required this.items,
    this.nextCursor,
  });

  factory CourierHistory.fromJson(Map<String, dynamic> json) => CourierHistory(
      items: (json['items'] as List<dynamic>? ?? const []).map((e) => Delivery.fromJson((e as Map<String, dynamic>?) ?? const {})).toList(),
      nextCursor: json['nextCursor'] as String?,
      );

  final List<Delivery> items;

  final String? nextCursor;
}

class CourierStats {
  const CourierStats({
    required this.today,
    required this.active,
    required this.allTimeDelivered,
  });

  factory CourierStats.fromJson(Map<String, dynamic> json) => CourierStats(
      today: (json['today'] as Map<String, dynamic>?) ?? const {},
      active: (json['active'] as num?)?.toInt() ?? 0,
      allTimeDelivered: (json['allTimeDelivered'] as num?)?.toInt() ?? 0,
      );

  final Map<String, dynamic> today;

  final int active;

  final int allTimeDelivered;
}
