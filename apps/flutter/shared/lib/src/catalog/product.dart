import 'package:decimal/decimal.dart';

import '../utils/money.dart';
import 'localized_text.dart';

/// Ro'yxatdagi mahsulot (`GET /api/products` dagi bitta element).
class ProductSummary {
  const ProductSummary({
    required this.id,
    required this.slug,
    required this.sku,
    required this.name,
    required this.price,
    required this.oldPrice,
    required this.currency,
    required this.rating,
    required this.reviewCount,
    required this.soldCount,
    required this.isFeatured,
    required this.brandName,
    required this.brandSlug,
    required this.rawImageUrl,
    required this.categoryName,
    required this.categorySlug,
    required this.stock,
    required this.inStock,
  });

  factory ProductSummary.fromJson(Map<String, dynamic> json) {
    final brand = json['brand'] as Map<String, dynamic>?;
    final category = json['category'] as Map<String, dynamic>?;
    return ProductSummary(
      id: json['id'] as String,
      slug: json['slug'] as String,
      sku: json['sku'] as String? ?? '',
      name: LocalizedText.fromJson(json['name']),
      price: parseMoney(json['price']),
      oldPrice: json['oldPrice'] == null ? null : parseMoney(json['oldPrice']),
      currency: json['currency'] as String? ?? 'UZS',
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      reviewCount: (json['reviewCount'] as num?)?.toInt() ?? 0,
      soldCount: (json['soldCount'] as num?)?.toInt() ?? 0,
      isFeatured: json['isFeatured'] as bool? ?? false,
      // Brend nomi — ODDIY SATR (Brand.name `String`), kategoriyaniki esa
      // ko'p tilli (Category.name `Json`). Ikkisini aralashtirmang.
      brandName: brand?['name'] as String?,
      brandSlug: brand?['slug'] as String?,
      rawImageUrl: json['imageUrl'] as String?,
      categoryName: category == null ? null : LocalizedText.fromJson(category['name']),
      categorySlug: category?['slug'] as String?,
      stock: (json['stock'] as num?)?.toInt() ?? 0,
      inStock: json['inStock'] as bool? ?? false,
    );
  }

  final String id;
  final String slug;
  final String sku;
  final LocalizedText name;

  /// Pul — [Decimal]. Serverdan satr bo'lib keladi.
  final Decimal price;
  final Decimal? oldPrice;
  final String currency;

  final double rating;
  final int reviewCount;
  final int soldCount;
  final bool isFeatured;

  final String? brandName;
  final String? brandSlug;

  /// Bazadagi XOM qiymat. Ko'rsatishdan oldin `resolveProductImageUrl()`
  /// dan o'tkazing — u picsum qoldig'i bo'lishi mumkin.
  final String? rawImageUrl;

  final LocalizedText? categoryName;
  final String? categorySlug;

  /// Haqiqiy zaxira (varyantlar inventarining yig'indisi).
  final int stock;
  final bool inStock;

  int get discountPercentValue => discountPercent(price, oldPrice);
  bool get hasDiscount => discountPercentValue > 0;
}

/// Mahsulot varianti (rang/o'lcham).
///
/// Buyurtmada `variantId` SHART — aks holda har doim standart variant
/// kamayadi. Qarang: docs/FLUTTER-MIGRATION.md.
class ProductVariant {
  const ProductVariant({
    required this.id,
    required this.sku,
    required this.price,
    required this.color,
    required this.size,
    required this.stock,
    required this.inStock,
  });

  factory ProductVariant.fromJson(Map<String, dynamic> json) => ProductVariant(
        id: json['id'] as String,
        sku: json['sku'] as String? ?? '',
        price: parseMoney(json['price']),
        color: json['color'] as String?,
        size: json['size'] as String?,
        stock: (json['stock'] as num?)?.toInt() ?? 0,
        inStock: json['inStock'] as bool? ?? false,
      );

  final String id;
  final String sku;
  final Decimal price;
  final String? color;
  final String? size;
  final int stock;
  final bool inStock;
}

class ProductImageRef {
  const ProductImageRef({required this.url, required this.alt, required this.isPrimary});

  factory ProductImageRef.fromJson(Map<String, dynamic> json) => ProductImageRef(
        url: json['url'] as String? ?? '',
        alt: LocalizedText.fromJson(json['alt']),
        isPrimary: json['isPrimary'] as bool? ?? false,
      );

  final String url;
  final LocalizedText alt;
  final bool isPrimary;
}

/// To'liq mahsulot (`GET /api/products/{slug}`).
class ProductDetail {
  const ProductDetail({
    required this.id,
    required this.slug,
    required this.sku,
    required this.name,
    required this.description,
    required this.shortDescription,
    required this.price,
    required this.oldPrice,
    required this.currency,
    required this.rating,
    required this.reviewCount,
    required this.soldCount,
    required this.brandName,
    required this.brandSlug,
    required this.sellerName,
    required this.images,
    required this.stock,
    required this.inStock,
    required this.variants,
  });

  factory ProductDetail.fromJson(Map<String, dynamic> json) {
    final brand = json['brand'] as Map<String, dynamic>?;
    final seller = json['seller'] as Map<String, dynamic>?;
    return ProductDetail(
      id: json['id'] as String,
      slug: json['slug'] as String,
      sku: json['sku'] as String? ?? '',
      name: LocalizedText.fromJson(json['name']),
      description: LocalizedText.fromJson(json['description']),
      shortDescription: LocalizedText.fromJson(json['shortDescription']),
      price: parseMoney(json['price']),
      oldPrice: json['oldPrice'] == null ? null : parseMoney(json['oldPrice']),
      currency: json['currency'] as String? ?? 'UZS',
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      reviewCount: (json['reviewCount'] as num?)?.toInt() ?? 0,
      soldCount: (json['soldCount'] as num?)?.toInt() ?? 0,
      brandName: brand?['name'] as String?,
      brandSlug: brand?['slug'] as String?,
      sellerName: seller?['brandName'] as String?,
      images: (json['images'] as List<dynamic>? ?? const [])
          .cast<Map<String, dynamic>>()
          .map(ProductImageRef.fromJson)
          .toList(),
      stock: (json['stock'] as num?)?.toInt() ?? 0,
      inStock: json['inStock'] as bool? ?? false,
      variants: (json['variants'] as List<dynamic>? ?? const [])
          .cast<Map<String, dynamic>>()
          .map(ProductVariant.fromJson)
          .toList(),
    );
  }

  final String id;
  final String slug;
  final String sku;
  final LocalizedText name;
  final LocalizedText description;
  final LocalizedText shortDescription;
  final Decimal price;
  final Decimal? oldPrice;
  final String currency;
  final double rating;
  final int reviewCount;
  final int soldCount;
  final String? brandName;
  final String? brandSlug;
  final String? sellerName;
  final List<ProductImageRef> images;
  final int stock;
  final bool inStock;
  final List<ProductVariant> variants;

  int get discountPercentValue => discountPercent(price, oldPrice);
  bool get hasDiscount => discountPercentValue > 0;

  /// Takrorlanmagan ranglar — variant tanlash uchun.
  List<String> get colors => _distinct(variants.map((v) => v.color));

  /// Takrorlanmagan o'lchamlar.
  List<String> get sizes => _distinct(variants.map((v) => v.size));

  static List<String> _distinct(Iterable<String?> values) {
    final seen = <String>[];
    for (final value in values) {
      if (value == null || value.isEmpty) continue;
      if (!seen.contains(value)) seen.add(value);
    }
    return seen;
  }
}

/// Bir sahifa natija.
class ProductPage {
  const ProductPage({
    required this.items,
    required this.total,
    required this.page,
    required this.limit,
    required this.hasMore,
  });

  factory ProductPage.fromJson(Map<String, dynamic> json) => ProductPage(
        items: (json['items'] as List<dynamic>? ?? const [])
            .cast<Map<String, dynamic>>()
            .map(ProductSummary.fromJson)
            .toList(),
        total: (json['total'] as num?)?.toInt() ?? 0,
        page: (json['page'] as num?)?.toInt() ?? 1,
        limit: (json['limit'] as num?)?.toInt() ?? 0,
        hasMore: json['hasMore'] as bool? ?? false,
      );

  final List<ProductSummary> items;
  final int total;
  final int page;
  final int limit;
  final bool hasMore;
}
