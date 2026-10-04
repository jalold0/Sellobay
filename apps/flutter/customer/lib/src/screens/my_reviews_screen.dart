import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../widgets/review_tile.dart';
import 'product_screen.dart';

/// «Mening sharhlarim».
///
/// Ro'yxatni server beradi (`/api/reviews/mine`), har sharh bilan
/// mahsulot nomi va slug'i keladi — bosilsa mahsulotga o'tiladi.
class MyReviewsScreen extends StatefulWidget {
  const MyReviewsScreen({super.key});

  @override
  State<MyReviewsScreen> createState() => _MyReviewsScreenState();
}

class _MyReviewsScreenState extends State<MyReviewsScreen> {
  List<ProductReview>? _reviews;
  Object? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() => _error = null);
    final reviews = SellobayRuntimeScope.of(context).reviews;
    try {
      final items = await reviews.fetchMine();
      if (!mounted) return;
      setState(() => _reviews = items);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  Future<void> _delete(ProductReview review) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        content: Text(dialogContext.t('reviews.deleteConfirm')),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(dialogContext.t('common.cancel')),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: SellobayColors.destructive),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(dialogContext.t('common.delete')),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    final runtime = SellobayRuntimeScope.of(context);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await runtime.reviews.delete(review.id);
      if (!mounted) return;
      setState(() => _reviews = _reviews?.where((r) => r.id != review.id).toList());
      messenger.showSnackBar(SnackBar(content: Text(context.t('reviews.deleted'))));
    } catch (e) {
      if (!mounted) return;
      messenger.showSnackBar(SnackBar(content: Text(context.errorText(e))));
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(context.t('profile.nav.reviews'))),
        body: RefreshIndicator(onRefresh: _load, child: _body(context)),
      );

  Widget _body(BuildContext context) {
    if (_error != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(32),
        children: [
          SizedBox(height: MediaQuery.sizeOf(context).height * 0.18),
          const Icon(Icons.cloud_off, size: 42, color: SellobayColors.mutedText),
          const SizedBox(height: 14),
          Text(
            context.errorText(_error!),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 18),
          Center(child: FilledButton(onPressed: _load, child: Text(context.t('common.retry')))),
        ],
      );
    }

    final reviews = _reviews;
    if (reviews == null) {
      return const Center(
        child: SizedBox(
          width: 26,
          height: 26,
          child: CircularProgressIndicator(strokeWidth: 2.5, color: SellobayColors.primary),
        ),
      );
    }

    if (reviews.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(32),
        children: [
          SizedBox(height: MediaQuery.sizeOf(context).height * 0.16),
          const Icon(Icons.rate_review_outlined, size: 42, color: SellobayColors.border),
          const SizedBox(height: 14),
          Text(
            context.t('reviews.emptyTitle'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            context.t('reviews.emptyDesc'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13.5, height: 1.4, color: SellobayColors.mutedText),
          ),
        ],
      );
    }

    final locale = SellobayRuntimeScope.of(context).locale.locale;

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      itemCount: reviews.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (_, i) {
        final review = reviews[i];
        final product = review.product;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (product != null)
              InkWell(
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => ProductScreen(slug: product.slug)),
                ),
                child: Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    product.name.pick(locale),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: SellobayColors.primary,
                    ),
                  ),
                ),
              ),
            ReviewTile(review: review, isMine: true, onDelete: () => _delete(review)),
          ],
        );
      },
    );
  }
}
