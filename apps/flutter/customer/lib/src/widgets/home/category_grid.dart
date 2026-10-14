import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Bosh sahifadagi kategoriyalar to'ri: 4 ustun, oxirida «Global» va
/// «Barchasi».
///
/// Kategoriya rasmi (`iconUrl`) bo'lsa — o'sha; bo'lmasa slug bo'yicha
/// belgi. Rasmlar admin panelda yuklanadi; belgi faqat zaxira, shuning
/// uchun noma'lum kategoriya ham bo'sh katak bo'lib qolmaydi.
class CategoryGrid extends StatelessWidget {
  const CategoryGrid({
    super.key,
    required this.categories,
    required this.onCategory,
    required this.onGlobal,
    required this.onAll,
    this.maxCategories = 6,
  });

  final List<CategorySummary> categories;
  final ValueChanged<CategorySummary> onCategory;
  final VoidCallback onGlobal;
  final VoidCallback onAll;

  /// Ikki qator to'lishi uchun: 6 kategoriya + Global + Barchasi = 8.
  final int maxCategories;

  @override
  Widget build(BuildContext context) {
    final runtime = SellobayRuntimeScope.of(context);
    final locale = runtime.locale.locale;
    final baseUrl = runtime.api.baseUrl;
    final shown = categories.take(maxCategories).toList();

    final tiles = <Widget>[
      for (var i = 0; i < shown.length; i++)
        _Tile(
          label: shown[i].name.pick(locale),
          tint: _tints[i % _tints.length],
          imageUrl: _categoryImageUrl(shown[i].iconUrl, baseUrl),
          icon: _iconFor(shown[i].slug),
          onTap: () => onCategory(shown[i]),
        ),
      _Tile(
        label: context.t('home.global'),
        tint: const Color(0xFFEAF0F6),
        icon: Icons.public,
        onTap: onGlobal,
      ),
      _Tile(
        label: context.t('common.all'),
        tint: SellobayColors.soft,
        icon: Icons.grid_view_rounded,
        onTap: onAll,
      ),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth / 4;
          return Wrap(
            runSpacing: 14,
            children: [for (final tile in tiles) SizedBox(width: width, child: tile)],
          );
        },
      ),
    );
  }

  /// Iliq, past to'yingan fonlar — har katakni ajratadi, brend bordosi
  /// bilan raqobat qilmaydi.
  static const _tints = [
    Color(0xFFF7ECEE),
    Color(0xFFF6EFE3),
    Color(0xFFF1EDF6),
    Color(0xFFFBEAEA),
    Color(0xFFEAF3EE),
    Color(0xFFF3EEE8),
  ];

  static IconData _iconFor(String slug) => switch (slug) {
        // Bo'limlar (packages/database/prisma/kategoriya-daraxti.ts).
        'ayollar' => Icons.woman,
        'erkaklar' => Icons.man,
        'bolalar' => Icons.child_care_outlined,
        'gozallik-parfyumeriya' => Icons.spa_outlined,
        'maishiy-texnika' => Icons.kitchen_outlined,
        // Eski tekis kategoriyalar.
        'clothing' => Icons.checkroom,
        'shoes' => Icons.ice_skating_outlined,
        'perfume' => Icons.local_florist_outlined,
        'cosmetics' => Icons.brush_outlined,
        'beauty' => Icons.spa_outlined,
        'accessories' => Icons.shopping_bag_outlined,
        'electronics' || 'appliances' => Icons.kitchen_outlined,
        'kids' || 'children' => Icons.child_care_outlined,
        _ => Icons.category_outlined,
      };
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.label,
    required this.tint,
    required this.icon,
    required this.onTap,
    this.imageUrl,
  });

  final String label;
  final Color tint;
  final IconData icon;
  final String? imageUrl;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final fallback = Icon(icon, size: 28, color: SellobayColors.primary);
    final url = imageUrl;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
        child: Column(
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(color: tint, borderRadius: BorderRadius.circular(18)),
              clipBehavior: Clip.antiAlias,
              alignment: Alignment.center,
              child: url == null
                  ? fallback
                  : Image.network(
                      url,
                      width: 60,
                      height: 60,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => fallback,
                    ),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: SellobayType.caption,
                height: 1.2,
                fontWeight: FontWeight.w500,
                color: SellobayColors.ink,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Kategoriya rasmi manzili, yoki ko'rsatib bo'lmasa `null` (belgi chiziladi).
///
/// picsum va SVG qoldiqlari ko'rsatilmaydi — qarang `resolveProductImageUrl`.
String? _categoryImageUrl(String? url, String baseUrl) {
  if (!isRealProductImageUrl(url) || url!.endsWith('.svg')) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  final base = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
  return url.startsWith('/') ? '$base$url' : '$base/$url';
}
