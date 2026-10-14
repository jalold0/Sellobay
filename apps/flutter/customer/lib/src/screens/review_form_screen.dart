import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../widgets/review_tile.dart';

/// Bitta sharhga eng ko'pi bilan nechta surat (server ham shuni tekshiradi).
const _maxPhotos = 5;

/// Sharh yozish.
///
/// Bu ekranga FAQAT server «mumkin» degan holatda kiriladi
/// (`eligibility.canReview`): qoida — mahsulotni yetkazib olgan va
/// hali sharh yozmagan mijoz — serverda, bu yerda takrorlanmaydi.
class ReviewFormScreen extends StatefulWidget {
  const ReviewFormScreen({super.key, required this.productId, required this.productName});

  final String productId;
  final String productName;

  /// Testda almashtiriladi (galereya qurilmasiz ochilmaydi).
  static ImagePicker picker = ImagePicker();

  @override
  State<ReviewFormScreen> createState() => _ReviewFormScreenState();
}

class _ReviewFormScreenState extends State<ReviewFormScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();

  int _rating = 0;
  bool _busy = false;
  bool _uploading = false;
  String? _error;

  /// Yuklangan suratlar manzili — sharh bilan birga yuboriladi.
  final List<String> _photos = [];

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  /// Surat tanlangan zahoti yuklanadi — yuborishda faqat manzillar ketadi.
  Future<void> _addPhotos() async {
    final room = _maxPhotos - _photos.length;
    if (room <= 0) return;
    final picked = await ReviewFormScreen.picker.pickMultiImage(
      maxWidth: 1600,
      imageQuality: 80,
      limit: room,
    );
    if (picked.isEmpty || !mounted) return;
    final api = SellobayRuntimeScope.of(context).api;
    setState(() {
      _uploading = true;
      _error = null;
    });
    try {
      for (final file in picked.take(room)) {
        final url = await api.uploadReviewImage(
          bytes: await file.readAsBytes(),
          filename: file.name,
        );
        if (!mounted) return;
        setState(() => _photos.add(url));
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = context.t('reviews.photoUploadFailed'));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
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
            images: List.of(_photos),
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
          const SizedBox(height: 6),
          _photosField(context),
          const SizedBox(height: 18),
          FilledButton(
            onPressed: _busy || _uploading ? null : _submit,
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

  Widget _photosField(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final url in _photos)
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(url, width: 72, height: 72, fit: BoxFit.cover),
                    ),
                    Positioned(
                      top: -8,
                      right: -8,
                      child: IconButton.filled(
                        tooltip: context.t('reviews.removePhoto'),
                        onPressed: _busy ? null : () => setState(() => _photos.remove(url)),
                        iconSize: 14,
                        visualDensity: VisualDensity.compact,
                        style: IconButton.styleFrom(backgroundColor: SellobayColors.ink),
                        icon: const Icon(Icons.close),
                      ),
                    ),
                  ],
                ),
              if (_photos.length < _maxPhotos)
                InkWell(
                  onTap: _busy || _uploading ? null : _addPhotos,
                  borderRadius: BorderRadius.circular(10),
                  // Balandlik qat'iy emas: katta tizim shriftida yozuv sig'sin.
                  child: Container(
                    width: 84,
                    constraints: const BoxConstraints(minHeight: 72),
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: SellobayColors.border),
                    ),
                    child: _uploading
                        ? const Center(
                            child: SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: SellobayColors.primary,
                              ),
                            ),
                          )
                        : Column(
                            mainAxisSize: MainAxisSize.min,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.add_a_photo_outlined, size: 20, color: SellobayColors.primary),
                              const SizedBox(height: 4),
                              Text(
                                context.t('reviews.addPhotos'),
                                textAlign: TextAlign.center,
                                style: const TextStyle(fontSize: SellobayType.micro, color: SellobayColors.ink),
                              ),
                            ],
                          ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            context.t('reviews.photosHint'),
            style: const TextStyle(fontSize: SellobayType.caption, color: SellobayColors.mutedText),
          ),
        ],
      );
}

/// Mahsulotning barcha sharhlari: xulosa, filtrlar va sahifalab yuklash.
class ReviewsScreen extends StatefulWidget {
  const ReviewsScreen({super.key, required this.slug, required this.productName});

  final String slug;
  final String productName;

  @override
  State<ReviewsScreen> createState() => _ReviewsScreenState();
}

class _ReviewsScreenState extends State<ReviewsScreen> {
  final List<ProductReview> _items = [];
  ReviewSummary? _summary;
  ReviewFilter _filter = const AllReviews();
  int _page = 1;
  bool _hasMore = false;
  bool _loading = true;
  bool _loadingMore = false;
  Object? _error;

  /// Kech kelgan javob yangi filtr natijasini bosib ketmasin.
  int _requestId = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  ReviewsRepository get _repo => SellobayRuntimeScope.of(context).reviews;

  Future<void> _load() async {
    final id = ++_requestId;
    setState(() {
      _loading = _items.isEmpty;
      _error = null;
    });
    try {
      final page = await _repo.fetchForProduct(widget.slug, filter: _filter);
      if (!mounted || id != _requestId) return;
      setState(() {
        _items
          ..clear()
          ..addAll(page.items);
        _summary = page.summary ?? _summary;
        _page = 1;
        _hasMore = page.hasMore;
        _loading = false;
      });
    } catch (e) {
      if (!mounted || id != _requestId) return;
      setState(() {
        _loading = false;
        _error = e;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || !_hasMore) return;
    final id = _requestId;
    setState(() => _loadingMore = true);
    try {
      final page = await _repo.fetchForProduct(widget.slug, page: _page + 1, filter: _filter);
      if (!mounted || id != _requestId) return;
      setState(() {
        _items.addAll(page.items);
        _page += 1;
        _hasMore = page.hasMore;
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted || id != _requestId) return;
      setState(() => _loadingMore = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.errorText(e))));
    }
  }

  void _choose(ReviewFilter filter) {
    if (_sameFilter(filter, _filter)) return;
    setState(() {
      _filter = filter;
      _items.clear();
    });
    _load();
  }

  static bool _sameFilter(ReviewFilter a, ReviewFilter b) => switch ((a, b)) {
        (AllReviews(), AllReviews()) => true,
        (ReviewsWithPhotos(), ReviewsWithPhotos()) => true,
        (ReviewsByStars(stars: final x), ReviewsByStars(stars: final y)) => x == y,
        _ => false,
      };

  @override
  Widget build(BuildContext context) {
    final myId = AuthScope.of(context).user?.id;

    return Scaffold(
      appBar: AppBar(title: Text(context.t('product.reviews'))),
      body: RefreshIndicator(
        onRefresh: _load,
        child: NotificationListener<ScrollNotification>(
          onNotification: (n) {
            if (n.metrics.extentAfter < 400) _loadMore();
            return false;
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
            children: [
              if (_summary case final summary? when summary.total > 0) ...[
                _SummaryCard(summary: summary),
                const SizedBox(height: 14),
                _filters(context, summary),
                const SizedBox(height: 6),
              ],
              ..._list(context, myId),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _list(BuildContext context, String? myId) {
    if (_loading) {
      return const [
        Padding(
          padding: EdgeInsets.all(40),
          child: Center(
            child: SizedBox(
              width: 26,
              height: 26,
              child: CircularProgressIndicator(strokeWidth: 2.5, color: SellobayColors.primary),
            ),
          ),
        ),
      ];
    }
    final error = _error;
    if (error != null) {
      return [
        SizedBox(height: MediaQuery.sizeOf(context).height * 0.12),
        Text(
          context.errorText(error),
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 18),
        Center(child: FilledButton(onPressed: _load, child: Text(context.t('common.retry')))),
      ];
    }
    if (_items.isEmpty) {
      final noReviewsAtAll = (_summary?.total ?? 0) == 0;
      return [
        const SizedBox(height: 40),
        Text(
          noReviewsAtAll ? context.t('product.noReviews') : context.t('reviews.noMatch'),
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 14, height: 1.5, color: SellobayColors.mutedText),
        ),
      ];
    }
    return [
      for (var i = 0; i < _items.length; i++) ...[
        if (i > 0) const Divider(height: 1),
        ReviewTile(review: _items[i], isMine: _items[i].userId == myId),
      ],
      if (_loadingMore)
        const Padding(
          padding: EdgeInsets.all(18),
          child: Center(
            child: SizedBox(
              width: 22,
              height: 22,
              child: CircularProgressIndicator(strokeWidth: 2.2, color: SellobayColors.primary),
            ),
          ),
        ),
    ];
  }

  Widget _filters(BuildContext context, ReviewSummary summary) {
    final chips = <(ReviewFilter, String, bool)>[
      (const AllReviews(), '${context.t('reviews.filterAll')} · ${summary.total}', true),
      (
        const ReviewsWithPhotos(),
        context.t('reviews.filterPhotos', params: {'count': summary.withPhotos}),
        summary.withPhotos > 0,
      ),
      for (final star in const [5, 4, 3, 2, 1])
        (
          ReviewsByStars(star),
          '${context.t('reviews.filterStars', params: {'star': star})} · ${summary.breakdown[star] ?? 0}',
          (summary.breakdown[star] ?? 0) > 0,
        ),
    ];
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          for (final (filter, label, enabled) in chips)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(label),
                selected: _sameFilter(filter, _filter),
                onSelected: enabled ? (_) => _choose(filter) : null,
                showCheckmark: false,
                labelStyle: TextStyle(
                  fontSize: SellobayType.caption,
                  fontWeight: FontWeight.w600,
                  color: _sameFilter(filter, _filter) ? Colors.white : SellobayColors.ink,
                ),
                selectedColor: SellobayColors.primary,
                backgroundColor: SellobayColors.soft,
                side: const BorderSide(color: SellobayColors.border),
              ),
            ),
        ],
      ),
    );
  }
}

/// O'rtacha baho va yulduzlar taqsimoti — BUTUN sharhlardan.
class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.summary});

  final ReviewSummary summary;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Column(
          children: [
            Text(
              summary.average.toStringAsFixed(1),
              style: const TextStyle(fontSize: SellobayType.display, fontWeight: FontWeight.w800),
            ),
            StarRow(rating: summary.average.round()),
            const SizedBox(height: 4),
            Text(
              context.t('product.reviewsCountLong', params: {'count': summary.total}),
              style: const TextStyle(fontSize: SellobayType.caption, color: SellobayColors.mutedText),
            ),
          ],
        ),
        const SizedBox(width: 20),
        Expanded(
          child: Column(
            children: [
              for (final star in const [5, 4, 3, 2, 1])
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 14,
                        child: Text('$star', style: const TextStyle(fontSize: SellobayType.caption)),
                      ),
                      const Icon(Icons.star_rounded, size: 12, color: SellobayColors.accent),
                      const SizedBox(width: 6),
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: summary.total == 0 ? 0 : (summary.breakdown[star] ?? 0) / summary.total,
                            minHeight: 6,
                            backgroundColor: SellobayColors.soft,
                            color: SellobayColors.accent,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        width: 24,
                        child: Text(
                          '${summary.breakdown[star] ?? 0}',
                          textAlign: TextAlign.right,
                          style: const TextStyle(fontSize: SellobayType.caption, color: SellobayColors.mutedText),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
