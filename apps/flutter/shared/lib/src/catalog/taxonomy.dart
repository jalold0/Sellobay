import 'localized_text.dart';

/// Kategoriya (`GET /api/categories`).
class CategorySummary {
  const CategorySummary({
    required this.id,
    required this.slug,
    required this.name,
    required this.iconUrl,
    required this.productCount,
  });

  factory CategorySummary.fromJson(Map<String, dynamic> json) => CategorySummary(
        id: json['id'] as String,
        slug: json['slug'] as String,
        name: LocalizedText.fromJson(json['name']),
        iconUrl: json['iconUrl'] as String?,
        // HAQIQIY son. Ilgari web'da "1 280+" kabi to'qima raqamlar
        // yozilgan edi — bazada esa o'nlab mahsulot bor edi.
        productCount: (json['productCount'] as num?)?.toInt() ?? 0,
      );

  final String id;
  final String slug;
  final LocalizedText name;
  final String? iconUrl;
  final int productCount;
}

/// Brend (`GET /api/brands`).
///
/// `name` — ODDIY SATR: `Brand.name` bazada `String`, kategoriyanikidan
/// farqli ravishda ko'p tilli emas.
class BrandSummary {
  const BrandSummary({
    required this.id,
    required this.slug,
    required this.name,
    required this.logoUrl,
  });

  factory BrandSummary.fromJson(Map<String, dynamic> json) => BrandSummary(
        id: json['id'] as String,
        slug: json['slug'] as String,
        name: json['name'] as String? ?? '',
        logoUrl: json['logoUrl'] as String?,
      );

  final String id;
  final String slug;
  final String name;
  final String? logoUrl;
}
