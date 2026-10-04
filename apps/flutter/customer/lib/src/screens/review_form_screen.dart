import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../widgets/review_tile.dart';

/// Sharh yozish.
///
/// Bu ekranga FAQAT server «mumkin» degan holatda kiriladi
/// (`eligibility.canReview`): qoida — mahsulotni yetkazib olgan va
/// hali sharh yozmagan mijoz — serverda, bu yerda takrorlanmaydi.
class ReviewFormScreen extends StatefulWidget {
  const ReviewFormScreen({super.key, required this.productId, required this.productName});

  final String productId;
  final String productName;

  @override
  State<ReviewFormScreen> createState() => _ReviewFormScreenState();
}

class _ReviewFormScreenState extends State<ReviewFormScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();

  int _rating = 0;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating < 1) {
      setState(() => _error = context.t('reviews.ratingRequired'));
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final review = await SellobayRuntimeScope.of(context).reviews.create(
            productId: widget.productId,
            rating: _rating,
            title: _title.text,
            body: _body.text,
          );
      if (!mounted) return;
      Navigator.of(context).pop(review);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        // Server «sotib olmagansiz» yoki «allaqachon yozgansiz»
        // deyishi mumkin — uning matnini ko'rsatamiz.
        _error = context.errorText(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.t('reviews.formTitle'))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        children: [
          Text(
            widget.productName,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: SellobayColors.ink,
            ),
          ),
          const SizedBox(height: 18),
          FormErrorBanner(_error),
          Text(
            context.t('reviews.ratingLabel'),
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              for (var i = 1; i <= 5; i++)
                IconButton(
                  onPressed: _busy ? null : () => setState(() => _rating = i),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
                  icon: Icon(
                    i <= _rating ? Icons.star_rounded : Icons.star_outline_rounded,
                    size: 34,
                    color: i <= _rating ? SellobayColors.accent : SellobayColors.border,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _title,
            maxLength: 120,
            decoration: InputDecoration(
              labelText: context.t('reviews.titleLabel'),
              counterText: '',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _body,
            maxLines: 5,
            maxLength: 2000,
            decoration: InputDecoration(labelText: context.t('reviews.bodyLabel')),
          ),
          const SizedBox(height: 10),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                  )
                : Text(context.t('reviews.submit')),
          ),
        ],
      ),
    );
  }
}

/// Mahsulotning barcha sharhlari.
class ReviewsScreen extends StatefulWidget {
  const ReviewsScreen({super.key, required this.slug, required this.productName});

  final String slug;
  final String productName;

  @override
  State<ReviewsScreen> createState() => _ReviewsScreenState();
}

class _ReviewsScreenState extends State<ReviewsScreen> {
  ReviewPage? _page;
  Object? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      // Bitta sahifa — hozircha 50 tagacha. Cheksiz varaqlash
      // kerak bo'lsa server `page` ni qo'llab-quvvatlaydi.
      final page =
          await SellobayRuntimeScope.of(context).reviews.fetchForProduct(widget.slug, limit: 50);
      if (!mounted) return;
      setState(() => _page = page);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final page = _page;
    final myId = AuthScope.of(context).user?.id;

    return Scaffold(
      appBar: AppBar(title: Text(context.t('product.reviews'))),
      body: RefreshIndicator(
        onRefresh: _load,
        child: switch ((_error, page)) {
          (final Object error, _) => ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(32),
              children: [
                SizedBox(height: MediaQuery.sizeOf(context).height * 0.18),
                Text(
                  context.errorText(error),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 18),
                Center(
                  child: FilledButton(onPressed: _load, child: Text(context.t('common.retry'))),
                ),
              ],
            ),
          (_, null) => const Center(
              child: SizedBox(
                width: 26,
                height: 26,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: SellobayColors.primary),
              ),
            ),
          (_, final ReviewPage p) when p.items.isEmpty => ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(32),
              children: [
                SizedBox(height: MediaQuery.sizeOf(context).height * 0.16),
                Text(
                  context.t('product.noReviews'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: SellobayColors.mutedText,
                  ),
                ),
              ],
            ),
          (_, final ReviewPage p) => ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              itemCount: p.items.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (_, i) => ReviewTile(
                review: p.items[i],
                isMine: p.items[i].userId == myId,
              ),
            ),
        },
      ),
    );
  }
}
