import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Yulduzchalar qatori.
class StarRow extends StatelessWidget {
  const StarRow({super.key, required this.rating, this.size = 15});

  final int rating;
  final double size;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 1; i <= 5; i++)
            Icon(
              i <= rating ? Icons.star_rounded : Icons.star_outline_rounded,
              size: size,
              color: i <= rating ? SellobayColors.accent : SellobayColors.border,
            ),
        ],
      );
}

/// Bitta sharh.
class ReviewTile extends StatelessWidget {
  const ReviewTile({super.key, required this.review, this.isMine = false, this.onDelete});

  final ProductReview review;

  /// O'z sharhi — ajratib ko'rsatiladi va o'chirish tugmasi chiqadi.
  final bool isMine;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    // Ism kiritilmagan bo'lishi mumkin (telefon bilan kirgan mijoz).
    final author = review.author.isEmpty ? context.t('profile.userFallback') : review.author;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              StarRow(rating: review.rating),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  isMine ? context.t('reviews.yours') : author,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: isMine ? SellobayColors.primary : SellobayColors.ink,
                  ),
                ),
              ),
              if (review.createdAt != null)
                Text(
                  formatOrderDate(review.createdAt!),
                  style: const TextStyle(fontSize: 11.5, color: SellobayColors.mutedText),
                ),
              if (isMine && onDelete != null)
                IconButton(
                  tooltip: context.t('common.delete'),
                  onPressed: onDelete,
                  visualDensity: VisualDensity.compact,
                  icon: const Icon(Icons.delete_outline, size: 18),
                  color: SellobayColors.destructive,
                ),
            ],
          ),
          if (review.isVerifiedPurchase) ...[
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.verified_outlined, size: 13, color: SellobayColors.success),
                const SizedBox(width: 4),
                Text(
                  context.t('reviews.verified'),
                  style: const TextStyle(fontSize: 11.5, color: SellobayColors.success),
                ),
              ],
            ),
          ],
          if (review.title != null && review.title!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              review.title!,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ],
          if (review.body != null && review.body!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              review.body!,
              style: const TextStyle(fontSize: 13.5, height: 1.5, color: SellobayColors.mutedText),
            ),
          ],
        ],
      ),
    );
  }
}
