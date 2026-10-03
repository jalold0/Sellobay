import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Katalogdagi mahsulot kartochkasi.
///
/// Kartochkadagi HAR BIR raqam serverdan keladi: narx, chegirma foizi,
/// reyting, zaxira. Auditda aynan shu yerda to'qima sonlar topilgan edi
/// (`stockLeft={3 + (i % 5)}`, qotib yozilgan "−70%"), shuning uchun bu
/// yerda hisoblab chiqariladigan yagona narsa — chegirma foizi, u ham
/// narx va eski narxdan.
class ProductCard extends StatelessWidget {
  const ProductCard({
    super.key,
    required this.product,
    required this.locale,
    required this.baseUrl,
    required this.onTap,
  });

  final ProductSummary product;
  final String locale;
  final String baseUrl;
  final VoidCallback onTap;

  /// Kam qolgan tovar chegarasi — `packages/ui/src/components/product-card.tsx`
  /// dagi qoida bilan bir xil (`stockLeft > 0 && stockLeft <= 5`).
  static const _lowStockThreshold = 5;

  @override
  Widget build(BuildContext context) {
    final discount = product.discountPercentValue;
    final lowStock = product.stock > 0 && product.stock <= _lowStockThreshold;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 1,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ProductThumbnail(
                    url: resolveProductImageUrl(
                      dbUrl: product.rawImageUrl,
                      slug: product.slug,
                      baseUrl: baseUrl,
                    ),
                  ),
                  if (discount > 0)
                    Positioned(
                      left: 8,
                      top: 8,
                      child: _badge('-$discount%', SellobayColors.primary),
                    ),
                  if (!product.inStock)
                    Positioned.fill(
                      child: ColoredBox(
                        color: Colors.white.withValues(alpha: 0.72),
                        child: Center(
                          child: Text(
                            context.t('product.outOfStock'),
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: SellobayColors.ink,
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          if (product.brandName != null)
            Text(
              product.brandName!.toUpperCase(),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.6,
                color: SellobayColors.mutedText,
              ),
            ),
          const SizedBox(height: 2),
          Text(
            product.name.pick(locale),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 13.5,
              height: 1.3,
              fontWeight: FontWeight.w600,
              color: SellobayColors.ink,
            ),
          ),
          const SizedBox(height: 6),
          // Narx HECH QACHON qatorga bo'linmaydi va kesilmaydi: tor
          // kartochkada yoki katta tizim shriftida u ikkinchi qatorga
          // o'tib, kartochka balandligini buzardi. `scaleDown` kerak
          // bo'lsagina kichraytiradi — raqam to'liq o'qiladi.
          _oneLine(
            formatMoney(product.price, currency: product.currency),
            const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: SellobayColors.ink,
            ),
          ),
          if (product.oldPrice != null && discount > 0)
            _oneLine(
              formatMoney(product.oldPrice, currency: product.currency),
              const TextStyle(
                fontSize: 12,
                color: SellobayColors.mutedText,
                decoration: TextDecoration.lineThrough,
              ),
            ),
          const SizedBox(height: 4),
          Row(
            children: [
              if (product.reviewCount > 0) ...[
                const Icon(Icons.star_rounded, size: 14, color: SellobayColors.accent),
                const SizedBox(width: 2),
                Text(
                  product.rating.toStringAsFixed(1),
                  style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                ),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    '(${product.reviewCount})',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11.5, color: SellobayColors.mutedText),
                  ),
                ),
              ],
            ],
          ),
          if (lowStock)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                context.t('product.onlyLeft', params: {'count': product.stock}),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: SellobayColors.primary,
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Bitta qatorga sig'adigan matn (kerak bo'lsa kichraytiriladi).
  static Widget _oneLine(String text, TextStyle style) => FittedBox(
        fit: BoxFit.scaleDown,
        alignment: Alignment.centerLeft,
        child: Text(text, maxLines: 1, softWrap: false, style: style),
      );

  Widget _badge(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
        decoration: BoxDecoration(
          color: color,
          borderRadius: const BorderRadius.all(Radius.circular(7)),
        ),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
      );
}
