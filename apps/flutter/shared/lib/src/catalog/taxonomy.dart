import 'localized_text.dart';

/// Kategoriya (`GET /api/categories`).
class CategorySummary {
  const CategorySummary({
    required this.id,
    required this.slug,
    required this.name,
    required this.iconUrl,
    required this.productCount,
    this.children = const [],
  });

  factory CategorySummary.fromJson(Map<String, dynamic> json) => CategorySummary(
        id: json['id'] as String,
        slug: json['slug'] as String,
        name: LocalizedText.fromJson(json['name']),
        iconUrl: json['iconUrl'] as String?,
        // HAQIQIY son. Ilgari web'da "1 280+" kabi to'qima raqamlar
        // yozilgan edi — bazada esa o'nlab mahsulot bor edi. Bo'limda —
        // ichki turlardagi takrorlanmagan mahsulotlar soni.
        productCount: (json['productCount'] as num?)?.toInt() ?? 0,
        // Eski server `children` yubormaydi — u holda bo'sh ro'yxat.
        children: (json['children'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(CategorySummary.fromJson)
            .toList(),
      );

  final String id;
  final String slug;
  final LocalizedText name;
  final String? iconUrl;
  final int productCount;

  /// Ichki turlar (Ayollar › Kiyim, Poyabzal...). Bo'sh bo'lishi mumkin.
  final List<CategorySummary> children;

  /// Mahsuloti bor ichki turlar — mijozga faqat shular ko'rsatiladi.
  CategorySummary withoutEmpty() => CategorySummary(
        id: id,
        slug: slug,
        name: name,
        iconUrl: iconUrl,
        productCount: productCount,
        children: [
          for (final c in children)
            if (c.productCount > 0) c.withoutEmpty(),
        ],
      );
}

/// [slug] ga mos tugun va uning bo'limi (ildizi). Topilmasa `null`.
({CategorySummary node, CategorySummary department})? findCategory(
  List<CategorySummary> roots,
  String slug,
) {
  for (final root in roots) {
    if (root.slug == slug) return (node: root, department: root);
    final stack = [...root.children];
    while (stack.isNotEmpty) {
      final c = stack.removeLast();
      if (c.slug == slug) return (node: c, department: root);
      stack.addAll(c.children);
    }
  }
  return null;
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
