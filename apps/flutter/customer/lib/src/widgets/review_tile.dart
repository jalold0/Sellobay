import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'review_photos.dart';

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
          if (review.images.isNotEmpty) ...[
            const SizedBox(height: 10),
            ReviewPhotoStrip(urls: review.images),
          ],
          if (!isMine) ...[
            const SizedBox(height: 8),
            HelpfulButton(key: ValueKey(review.id), review: review),
          ],
        ],
      ),
    );
  }
}

/// «Foydali» tugmasi. Holat va son SERVERdan (bosilgach javobdan) olinadi.
///
/// O'z sharhida ko'rsatilmaydi (server ham rad etadi). Mehmon bossa — kirish
/// taklifi, ovoz yo'qolmaydi deb aldamaymiz.
class HelpfulButton extends StatefulWidget {
  const HelpfulButton({super.key, required this.review});

  final ProductReview review;

  @override
  State<HelpfulButton> createState() => _HelpfulButtonState();
}

class _HelpfulButtonState extends State<HelpfulButton> {
  late bool _voted = widget.review.votedByMe;
  late int _count = widget.review.helpfulCount;
  bool _busy = false;

  Future<void> _toggle() async {
    if (_busy) return;
    if (AuthScope.read(context).status != AuthStatus.signedIn) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.t('reviews.helpfulLogin'))),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final res = await SellobayRuntimeScope.of(context).reviews.toggleHelpful(widget.review.id);
      if (!mounted) return;
      setState(() {
        _voted = res.helpful;
        _count = res.helpfulCount;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.errorText(e))));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final label = _count > 0
        ? context.t('reviews.helpfulCount', params: {'count': _count})
        : context.t('reviews.helpful');
    return Semantics(
      toggled: _voted,
      child: OutlinedButton.icon(
        onPressed: _busy ? null : _toggle,
        icon: Icon(_voted ? Icons.thumb_up : Icons.thumb_up_outlined, size: 15),
        label: Text(label),
        style: OutlinedButton.styleFrom(
          visualDensity: VisualDensity.compact,
          foregroundColor: _voted ? SellobayColors.primary : SellobayColors.mutedText,
          side: BorderSide(color: _voted ? SellobayColors.primary : SellobayColors.border),
          textStyle: const TextStyle(fontSize: SellobayType.caption, fontWeight: FontWeight.w600),
          padding: const EdgeInsets.symmetric(horizontal: 12),
        ),
      ),
    );
  }
}
