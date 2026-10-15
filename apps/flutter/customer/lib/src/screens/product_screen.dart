import 'dart:async';

import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../home_tabs.dart';
import '../widgets/cart_button.dart';
import '../widgets/product_card.dart';
import '../widgets/review_tile.dart';
import '../widgets/seller_card.dart';
import '../widgets/skeleton.dart';
import '../widgets/wishlist_button.dart';
import 'cart_screen.dart';
import 'review_form_screen.dart';

/// Mahsulot sahifasi.
///
/// Rang va o'lcham ro'yxati BAZADAGI variantlardan quriladi. Expo
/// ilovasida ular kodga yozib qo'yilgan edi — natijada mijoz ekranda
/// bor rangni tanlardi, buyurtma esa har doim standart variantga
/// tushardi va boshqa variantning zaxirasi kamayardi.
class ProductScreen extends StatefulWidget {
  const ProductScreen({super.key, required this.slug});

  final String slug;

  @override
  State<ProductScreen> createState() => _ProductScreenState();
}

class _ProductScreenState extends State<ProductScreen> {
  ProductDetail? _product;
  Object? _error;
  bool _loading = true;

  String? _color;
  String? _size;
  int _imageIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  /// Sharhlar ALOHIDA so'raladi: mahsulot javobida ular yo'q va
  /// sahifa ochilishini kutdirishning hojati ham yo'q.
  ReviewPage? _reviews;

  Future<void> _loadReviews(String slug) async {
    try {
      final page = await SellobayRuntimeScope.of(context).reviews.fetchForProduct(slug, limit: 3);
      if (mounted) setState(() => _reviews = page);
    } catch (_) {
      // Sharhlar kelmasa bo'lim ko'rsatilmaydi — mahsulot sahifasi
      // shundan yiqilmasligi kerak.
    }
  }

  Future<void> _openReviewForm(ProductDetail product) async {
    final created = await Navigator.of(context).push<ProductReview>(
      MaterialPageRoute(
        builder: (_) => ReviewFormScreen(
          productId: product.id,
          productName: product.name.pick(SellobayRuntimeScope.of(context).locale.locale),
        ),
      ),
    );
    if (created == null || !mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(context.t('reviews.sent'))),
    );
    // Baho ham o'zgardi (server qayta hisoblaydi) — mahsulotni ham
    // qaytadan o'qiymiz.
    await _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final product = await SellobayRuntimeScope.of(context).catalog.fetchProduct(widget.slug);
      if (!mounted) return;
      unawaited(_loadReviews(product.slug));
      unawaited(_loadOthers(product));
      setState(() {
        _product = product;
        _loading = false;
        // Birinchi MAVJUD variantni tanlaymiz — tugagan variantni
        // oldindan tanlab qo'yish mijozni chalg'itadi.
        final first = product.variants.where((v) => v.inStock).firstOrNull ??
            product.variants.firstOrNull;
        _color = first?.color;
        _size = first?.size;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e;
      });
    }
  }

  /// Tanlangan rang va o'lchamga mos variant. Topilmasa `null` —
  /// bunda "Savatga" tugmasi ishlamaydi, chunki `variantId` shart.
  ProductVariant? get _selectedVariant {
    final product = _product;
    if (product == null) return null;
    if (product.variants.isEmpty) return null;
    for (final variant in product.variants) {
      final colorOk = _color == null || variant.color == _color;
      final sizeOk = _size == null || variant.size == _size;
      if (colorOk && sizeOk) return variant;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final product = _product;

    return Scaffold(
      appBar: AppBar(
        title: Text(product?.brandName ?? ''),
        actions: [
          if (product != null) WishlistButton(productId: product.id),
          const CartButton(),
        ],
      ),
      body: switch ((_loading, _error, product)) {
        (true, _, _) => const ProductDetailSkeleton(),
        (_, final Object error, _) => _errorView(context, error),
        (_, _, final ProductDetail p) => _detail(context, p),
        _ => const SizedBox.shrink(),
      },
      bottomNavigationBar: product == null ? null : _bottomBar(context, product),
    );
  }

  Widget _errorView(BuildContext context, Object error) {
    final notFound = error is ApiException && error.code == 'NOT_FOUND';
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              notFound ? Icons.search_off : Icons.cloud_off,
              size: 42,
              color: SellobayColors.mutedText,
            ),
            const SizedBox(height: 14),
            Text(
              notFound ? context.t('product.notFound') : context.errorText(error),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w600),
            ),
            if (!notFound) ...[
              const SizedBox(height: 18),
              FilledButton(onPressed: _load, child: Text(context.t('common.retry'))),
            ],
          ],
        ),
      ),
    );
  }

  Widget _detail(BuildContext context, ProductDetail product) {
    final locale = SellobayRuntimeScope.of(context).locale.locale;
    final baseUrl = SellobayRuntimeScope.of(context).api.baseUrl;
    final variant = _selectedVariant;
    // Variant o'z narxiga ega bo'lishi mumkin — tanlanganini ko'rsatamiz.
    final price = variant?.price ?? product.price;
    final discount = product.discountPercentValue;

    final images = product.images.isEmpty
        ? <String?>[resolveProductImageUrl(dbUrl: null, slug: product.slug, baseUrl: baseUrl)]
        : product.images
            .map((i) => resolveProductImageUrl(
                  dbUrl: i.url,
                  slug: product.slug,
                  baseUrl: baseUrl,
                ))
            .toList();

    return ListView(
      padding: EdgeInsets.zero,
      children: [
        AspectRatio(
          aspectRatio: 1,
          child: PageView.builder(
            itemCount: images.length,
            onPageChanged: (i) => setState(() => _imageIndex = i),
            itemBuilder: (context, i) => ProductThumbnail(url: images[i]),
          ),
        ),
        if (images.length > 1)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (var i = 0; i < images.length; i++)
                  Container(
                    width: 6,
                    height: 6,
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: i == _imageIndex ? SellobayColors.primary : SellobayColors.border,
                    ),
                  ),
              ],
            ),
          ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (product.brandName != null)
                Text(
                  product.brandName!.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                    color: SellobayColors.mutedText,
                  ),
                ),
              const SizedBox(height: 6),
              Text(
                product.name.pick(locale),
                style: const TextStyle(
                  fontSize: 21,
                  height: 1.3,
                  fontWeight: FontWeight.w700,
                  color: SellobayColors.ink,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    formatMoney(price, currency: product.currency),
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: SellobayColors.ink,
                    ),
                  ),
                  if (product.oldPrice != null && discount > 0) ...[
                    const SizedBox(width: 10),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 3),
                      child: Text(
                        formatMoney(product.oldPrice, currency: product.currency),
                        style: const TextStyle(
                          fontSize: 14,
                          color: SellobayColors.mutedText,
                          decoration: TextDecoration.lineThrough,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(
                        '-$discount%',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: SellobayColors.primary,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 14),
              _statsRow(context, product),
              if (product.colors.isNotEmpty) ...[
                const SizedBox(height: 22),
                _optionGroup(
                  title: context.t('product.color'),
                  options: product.colors,
                  selected: _color,
                  onSelected: (value) => setState(() => _color = value),
                ),
              ],
              if (product.sizes.isNotEmpty) ...[
                const SizedBox(height: 18),
                _optionGroup(
                  title: context.t('product.size'),
                  options: product.sizes,
                  selected: _size,
                  onSelected: (value) => setState(() => _size = value),
                ),
              ],
              if (!product.shortDescription.isEmpty) ...[
                const SizedBox(height: 22),
                Text(
                  product.shortDescription.pick(locale),
                  style: const TextStyle(fontSize: 14, height: 1.55, color: SellobayColors.ink),
                ),
              ],
              if (!product.description.isEmpty) ...[
                const SizedBox(height: 20),
                Text(
                  context.t('product.description'),
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Text(
                  product.description.pick(locale),
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.6,
                    color: SellobayColors.mutedText,
                  ),
                ),
              ],
              if (product.specs.isNotEmpty) ..._specsSection(context, product.specs),
              if (product.seller case final seller?) ...[
                const SizedBox(height: 22),
                SellerCard(seller: seller, onOpen: () => _openStore(seller)),
              ],
              ..._reviewsSection(context, product),
            ],
          ),
        ),
        ..._otherSellersSection(context),
      ],
    );
  }

  /// Xususiyatlar jadvali: material, tarkib, mamlakat... Ma'lum turlar
  /// nomi tarjimadan, boshqasi — sotuvchi yozgan nom.
  List<Widget> _specsSection(BuildContext context, List<ProductSpec> specs) => [
        const SizedBox(height: 22),
        Text(
          context.t('product.specsTitle'),
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(color: SellobayColors.border),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              for (var i = 0; i < specs.length; i++)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                  decoration: BoxDecoration(
                    border: i == 0
                        ? null
                        : const Border(top: BorderSide(color: SellobayColors.border)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          specs[i].key != null
                              ? context.t('product.spec.${specs[i].key}')
                              : specs[i].label ?? '',
                          style: const TextStyle(
                            fontSize: SellobayType.bodySm,
                            color: SellobayColors.mutedText,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          specs[i].value,
                          textAlign: TextAlign.right,
                          style: const TextStyle(
                            fontSize: SellobayType.bodySm,
                            fontWeight: FontWeight.w600,
                            color: SellobayColors.ink,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ];

  /// Do'konning boshqa tovarlari: katalog bo'limiga do'kon filtri bilan.
  void _openStore(SellerRef seller) {
    HomeTabsScope.read(context)?.openCatalog(
      query: ProductQuery(sellerId: seller.id, sellerName: seller.name),
    );
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  /// Boshqa do'konlardagi o'xshash tovarlar — ishonchli do'kon birinchi.
  List<ProductSummary> _others = const [];

  Future<void> _loadOthers(ProductDetail product) async {
    final seller = product.seller;
    final category = product.categorySlug;
    if (seller == null || category == null) return;
    try {
      final page = await SellobayRuntimeScope.of(context).catalog.fetchProducts(
            ProductQuery(
              categorySlug: category,
              excludeSellerId: seller.id,
              excludeId: product.id,
              rankBySeller: true,
              limit: 8,
            ),
          );
      if (mounted) setState(() => _others = page.items);
    } catch (_) {
      // Qo'shimcha bo'lim — kelmasa sahifa baribir to'liq.
    }
  }

  List<Widget> _otherSellersSection(BuildContext context) {
    if (_others.isEmpty) return const [];
    final locale = SellobayRuntimeScope.of(context).locale.locale;
    final baseUrl = SellobayRuntimeScope.of(context).api.baseUrl;
    return [
      Container(height: 8, color: SellobayColors.soft),
      Padding(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 4),
        child: Text(
          context.t('product.otherSellers'),
          style: const TextStyle(fontSize: SellobayType.cardTitle, fontWeight: FontWeight.w700),
        ),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
        child: Text(
          context.t('product.otherSellersHint'),
          style: const TextStyle(fontSize: SellobayType.caption, color: SellobayColors.mutedText),
        ),
      ),
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        child: GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _others.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 14,
            crossAxisSpacing: 12,
            // Katalogdagi kartochka hisobi + do'kon qatori uchun joy.
            mainAxisExtent: _otherCellHeight(context),
          ),
          itemBuilder: (context, i) {
            final p = _others[i];
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: ProductCard(
                    product: p,
                    locale: locale,
                    baseUrl: baseUrl,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(builder: (_) => ProductScreen(slug: p.slug)),
                    ),
                  ),
                ),
                if (p.seller case final s?)
                  Padding(
                    padding: const EdgeInsets.only(top: 4, left: 2),
                    child: Row(
                      children: [
                        const Icon(Icons.storefront_outlined, size: 13, color: SellobayColors.mutedText),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            s.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: SellobayType.caption, color: SellobayColors.mutedText),
                          ),
                        ),
                        if (s.rating > 0) ...[
                          const SizedBox(width: 4),
                          const Icon(Icons.star_rounded, size: 13, color: SellobayColors.accent),
                          Text(
                            s.rating.toStringAsFixed(1),
                            style: const TextStyle(fontSize: SellobayType.caption, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ],
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    ];
  }

  static double _otherCellHeight(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final imageSide = (width - 32 - 12) / 2;
    final scale = MediaQuery.textScalerOf(context).scale(1).clamp(1.0, 1.8);
    return imageSide + 158 * scale + 22 * scale;
  }

  /// Sharhlar bo'limi.
  ///
  /// Server yulduzchani sharhlardan hisoblaydi — bu yerda faqat
  /// ko'rsatiladi.
  List<Widget> _reviewsSection(BuildContext context, ProductDetail product) {
    final page = _reviews;
    if (page == null) return const [];

    final eligibility = page.eligibility;
    final myId = AuthScope.of(context).user?.id;

    return [
      const SizedBox(height: 24),
      Row(
        children: [
          Expanded(
            child: Text(
              page.total > 0
                  ? context.t('product.reviewsCountLong', params: {'count': page.total})
                  : context.t('product.reviews'),
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
            ),
          ),
          if (page.total > page.items.length)
            TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => ReviewsScreen(
                    slug: product.slug,
                    productName: product.name.pick(
                      SellobayRuntimeScope.of(context).locale.locale,
                    ),
                  ),
                ),
              ),
              child: Text(context.t('reviews.viewAll')),
            ),
        ],
      ),
      if (page.items.isEmpty)
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            context.t('product.noReviews'),
            style: const TextStyle(fontSize: 13, height: 1.5, color: SellobayColors.mutedText),
          ),
        )
      else
        for (final review in page.items)
          ReviewTile(review: review, isMine: review.userId == myId),
      // Tugma FAQAT server ruxsat bergan holatda. Qoidani (xarid
      // yetkazilganmi, avval yozilganmi) klient hisoblamaydi.
      if (eligibility?.canReview ?? false) ...[
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: () => _openReviewForm(product),
          icon: const Icon(Icons.rate_review_outlined, size: 18),
          label: Text(context.t('product.writeReview')),
        ),
      ] else if (eligibility != null && eligibility.existingReviewId != null) ...[
        const SizedBox(height: 8),
        Text(
          context.t('reviews.alreadyWrote'),
          style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
        ),
      ],
    ];
  }

  Widget _statsRow(BuildContext context, ProductDetail product) {
    final chips = <Widget>[
      if (product.reviewCount > 0)
        _stat(
          Icons.star_rounded,
          '${product.rating.toStringAsFixed(1)} · '
              '${context.t('product.reviewsCount', params: {'count': product.reviewCount})}',
          SellobayColors.accent,
        ),
      if (product.soldCount > 0)
        _stat(
          Icons.local_fire_department_outlined,
          context.t('product.soldSuffix', params: {'count': product.soldCount}),
          SellobayColors.mutedText,
        ),
      _stat(
        product.inStock ? Icons.check_circle_outline : Icons.remove_circle_outline,
        product.inStock ? context.t('product.inStock') : context.t('product.outOfStock'),
        product.inStock ? SellobayColors.success : SellobayColors.destructive,
      ),
    ];
    return Wrap(spacing: 16, runSpacing: 8, children: chips);
  }

  Widget _stat(IconData icon, String text, Color color) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: color),
          const SizedBox(width: 5),
          Text(text, style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText)),
        ],
      );

  Widget _optionGroup({
    required String title,
    required List<String> options,
    required String? selected,
    required ValueChanged<String> onSelected,
  }) =>
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final option in options)
                ChoiceChip(
                  label: Text(option),
                  selected: selected == option,
                  onSelected: (_) => onSelected(option),
                  labelStyle: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: selected == option ? Colors.white : SellobayColors.ink,
                  ),
                  selectedColor: SellobayColors.primary,
                  backgroundColor: Colors.white,
                  side: const BorderSide(color: SellobayColors.border),
                  showCheckmark: false,
                ),
            ],
          ),
        ],
      );

  Widget _bottomBar(BuildContext context, ProductDetail product) {
    final variant = _selectedVariant;
    // Variantli mahsulotda `variantId` SHART. Mos variant tanlanmagan
    // bo'lsa tugma o'chiq turadi — "qo'shildi" deb aldab, keyin
    // serverda yiqilgandan ko'ra shunisi rost.
    final canOrder = product.inStock && (product.variants.isEmpty || variant?.inStock == true);

    // Panel va kontent orasida chegara: ro'yxat panel ostidan
    // o'tayotganini ko'rsatadi.
    return DecoratedBox(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: SellobayColors.border)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: FilledButton(
            onPressed: canOrder
                ? () => _addToCart(context, product, variant)
                : null,
            child: Text(
              canOrder
                  ? context.t('product.addToCart')
                  : variant == null && product.variants.isNotEmpty
                  ? context.t('product.selectSize')
                  : context.t('product.outOfStock'),
            ),
          ),
        ),
      ),
    );
  }

  /// Savatga qo'shish.
  ///
  /// `variantId` SHU YERDA biriktiriladi: buyurtma aynan tanlangan
  /// variantga tushishi kerak. Expo ilovasida variant ro'yxati kodga
  /// yozib qo'yilgan edi va buyurtma har doim standart variantga
  /// tushardi — boshqa variantning zaxirasi kamayardi.
  void _addToCart(BuildContext context, ProductDetail product, ProductVariant? variant) {
    CartScope.read(context).add(
      CartLine.fromDetail(
        product,
        variantId: variant?.id,
        // Variant o'z narxiga ega bo'lishi mumkin.
        unitPrice: variant?.price,
        color: _color,
        size: _size,
      ),
    );
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(context.t('product.addedToCart')),
        action: SnackBarAction(
          label: context.t('cart.title'),
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => const CartScreen()),
          ),
        ),
      ),
    );
  }
}
