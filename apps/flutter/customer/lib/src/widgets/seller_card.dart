import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Tovar sahifasidagi do'kon bloki: kim sotyapti, bahosi, tovarlar soni.
/// Bosilsa — do'konning boshqa tovarlari (katalog do'kon filtri bilan).
class SellerCard extends StatelessWidget {
  const SellerCard({super.key, required this.seller, required this.onOpen});

  final SellerRef seller;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final initial = seller.name.trim().isEmpty ? '?' : seller.name.trim()[0].toUpperCase();
    final logo = seller.logoUrl;

    return Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: SellobayColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onOpen,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: SizedBox(
                  width: 44,
                  height: 44,
                  child: logo == null
                      ? _initial(initial)
                      : Image.network(logo, fit: BoxFit.cover, errorBuilder: (_, _, _) => _initial(initial)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      seller.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: SellobayType.rowTitle,
                        fontWeight: FontWeight.w700,
                        color: SellobayColors.ink,
                      ),
                    ),
                    const SizedBox(height: 3),
                    // Wrap: tor ekran va katta shriftda qatorga sig'masa pastga tushadi.
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        if (seller.rating > 0) ...[
                          const Icon(Icons.star_rounded, size: 15, color: SellobayColors.accent),
                          const SizedBox(width: 2),
                          Text(
                            seller.rating.toStringAsFixed(1),
                            style: const TextStyle(fontSize: SellobayType.caption, fontWeight: FontWeight.w700),
                          ),
                        ] else
                          Text(
                            context.t('product.storeNoRating'),
                            style: const TextStyle(fontSize: SellobayType.caption, color: SellobayColors.mutedText),
                          ),
                        if (seller.productCount != null) ...[
                          const Text('  ·  ', style: TextStyle(color: SellobayColors.mutedText)),
                          Text(
                            context.t('product.storeProducts', params: {'count': seller.productCount!}),
                            style: const TextStyle(fontSize: SellobayType.caption, color: SellobayColors.mutedText),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              // Matn emas, belgi: tor ekranda do'kon nomiga joy qolsin. Ekran
              // o'quvchi uchun amal nomi aytiladi.
              Semantics(
                label: context.t('product.visitStore'),
                child: const Icon(Icons.chevron_right, size: 22, color: SellobayColors.primary),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _initial(String letter) => ColoredBox(
        color: SellobayColors.primary.withValues(alpha: 0.08),
        child: Center(
          child: Text(
            letter,
            style: const TextStyle(
              fontSize: SellobayType.cardTitle,
              fontWeight: FontWeight.w800,
              color: SellobayColors.primary,
            ),
          ),
        ),
      );
}
