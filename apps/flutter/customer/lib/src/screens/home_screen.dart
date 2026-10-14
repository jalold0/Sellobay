import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../home_tabs.dart';
import '../widgets/home/category_grid.dart';
import '../widgets/home/notification_bell.dart';
import '../widgets/home/promo_carousel.dart';
import '../widgets/home/trust_strip.dart';
import '../widgets/product_card.dart';
import '../widgets/skeleton.dart';
import 'product_screen.dart';
import 'wishlist_screen.dart';

/// Bosh sahifa.
///
/// Bo'limlar SERVERDAN kelgan narsaga qarab chiziladi: bo'sh bo'lsa
/// umuman ko'rsatilmaydi. Web'dagi bosh sahifa «Chegirma» bo'limini
/// chegirmasi yo'q mahsulotlar bilan to'ldiradi (`fetchHomeProducts`
/// da `sale.length >= 4 ? sale : items.slice(0, 8)`) — bu yerda
/// shunday qilinmaydi.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<CategorySummary> _categories = const [];
  List<ProductSummary> _featured = const [];
  List<ProductSummary> _popular = const [];

  bool _loading = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  CatalogRepository get _repo => SellobayRuntimeScope.of(context).catalog;

  /// Tortib yangilashda qo'ng'iroqdagi son ham qayta so'raladi.
  int _refreshToken = 0;

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      // Uchala so'rov birga ketadi — ketma-ket qilsak sahifa uch
      // barobar sekin ochilardi.
      final results = await Future.wait([
        _repo.fetchStorefrontCategories(),
        _repo.fetchProducts(const ProductQuery(featured: true, limit: 8)),
        _repo.fetchProducts(const ProductQuery(sort: ProductSort.popular, limit: 8)),
      ]);
      if (!mounted) return;
      setState(() {
        _categories = results[0] as List<CategorySummary>;
        _featured = (results[1] as ProductPage).items;
        _popular = (results[2] as ProductPage).items;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e;
      });
    }
  }

  /// Katalogga o'tadi. [query] berilsa katalog shu filtr bilan ochiladi:
  /// «Barchasini ko'rish» o'sha bo'limning o'zini ko'rsatadi, butun
  /// katalogni emas.
  void _openCatalog([ProductQuery? query]) =>
      HomeTabsScope.read(context)?.openCatalog(query: query);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: _brand(context),
        actions: [
          NotificationBell(refreshToken: _refreshToken),
          // Sevimlilar ilgari faqat profil ichida edi: eng ko'p ishlatiladigan
          // ro'yxat uchun ikki bosish ortiqcha.
          IconButton(
            tooltip: context.t('wishlist.title'),
            icon: const Icon(Icons.favorite_border),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const WishlistScreen()),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () {
          setState(() => _refreshToken++);
          return _load();
        },
        child: _body(context),
      ),
    );
  }

  Widget _body(BuildContext context) {
    if (_loading) {
      return const HomeSkeleton();
    }

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

    final locale = SellobayRuntimeScope.of(context).locale.locale;
    final baseUrl = SellobayRuntimeScope.of(context).api.baseUrl;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 28),
      children: [
        _searchBar(context),
        const SizedBox(height: 8),
        PromoCarousel(slides: _slides(context)),
        const SizedBox(height: 16),
        const TrustStrip(),
        const SizedBox(height: 18),
        // Kategoriyalar bo'sh bo'lsa ham «Global» va «Barchasi» qoladi —
        // ikkalasi ham ishlaydigan yo'l.
        CategoryGrid(
          categories: _categories,
          onCategory: (c) => _openCatalog(ProductQuery(categorySlug: c.slug)),
          onGlobal: () => _openCatalog(const ProductQuery(scope: CatalogScope.global)),
          onAll: () => _openCatalog(const ProductQuery()),
        ),
        if (_featured.isNotEmpty) ...[
          _sectionHeader(
            context,
            context.t('featured.title'),
            onViewAll: () => _openCatalog(const ProductQuery(featured: true)),
          ),
          _productRow(context, _featured, locale, baseUrl),
        ],
        if (_popular.isNotEmpty) ...[
          _sectionHeader(
            context,
            context.t('home.bestSellersTitle'),
            onViewAll: () => _openCatalog(const ProductQuery(sort: ProductSort.popular)),
          ),
          _productRow(context, _popular, locale, baseUrl),
        ],
        // Hamma bo'lim bo'sh — katalog ham bo'sh degani.
        if (_categories.isEmpty && _featured.isEmpty && _popular.isEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(32, 80, 32, 0),
            child: Text(
              context.t('catalog.noResults'),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 15, color: SellobayColors.mutedText),
            ),
          ),
      ],
    );
  }

  /// Qidiruv katalog bo'limida — bu yerda faqat o'tish.
  Widget _searchBar(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
        child: InkWell(
          onTap: () => _openCatalog(),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: SellobayColors.soft,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                const Icon(Icons.search, size: 20, color: SellobayColors.mutedText),
                const SizedBox(width: 10),
                Text(
                  context.t('common.search'),
                  style: const TextStyle(fontSize: 15, color: SellobayColors.mutedText),
                ),
              ],
            ),
          ),
        ),
      );

  Widget _sectionHeader(BuildContext context, String title, {VoidCallback? onViewAll}) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 18, 8, 10),
        child: Row(
          children: [
            Expanded(
              child: Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: SellobayColors.ink,
                ),
              ),
            ),
            if (onViewAll != null)
              TextButton(
                onPressed: onViewAll,
                child: Text(context.t('home.viewAllLong')),
              ),
          ],
        ),
      );

  /// Logotip: ilova belgisi + serif nom (web sarlavhasidagi kabi).
  Widget _brand(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.asset('assets/brand/icon.png', width: 36, height: 36),
          ),
          const SizedBox(width: 10),
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.t('common.appName'),
                style: SellobayType.heading(SellobayType.cardTitle, color: SellobayColors.ink),
              ),
              Text(
                context.t('common.marketplace'),
                style: const TextStyle(fontSize: SellobayType.micro, color: SellobayColors.mutedText),
              ),
            ],
          ),
        ],
      );

  /// Bannerlar. Matn i18n'dan — web bosh sahifasidagi bilan bir xil kalitlar.
  List<PromoSlide> _slides(BuildContext context) => [
        PromoSlide(
          eyebrow: context.t('hero.eyebrow'),
          title: context.t('home.banner.brandsTitle'),
          text: context.t('hero.subheadline'),
          cta: context.t('hero.ctaShop'),
          style: PromoSlideStyle.crimson,
          onTap: () => _openCatalog(const ProductQuery()),
        ),
        PromoSlide(
          eyebrow: context.t('featured.title'),
          title: context.t('home.promo.title'),
          text: context.t('home.promo.subtitleNoSale'),
          cta: context.t('home.viewAllLong'),
          style: PromoSlideStyle.ink,
          onTap: () => _openCatalog(const ProductQuery(featured: true)),
        ),
        PromoSlide(
          eyebrow: context.t('home.promo.globalEyebrow'),
          title: context.t('home.promo.globalTitle'),
          text: context.t('home.promo.globalText'),
          cta: context.t('home.banner.globalCta'),
          style: PromoSlideStyle.soft,
          onTap: () => _openCatalog(const ProductQuery(scope: CatalogScope.global)),
        ),
      ];

  Widget _productRow(
    BuildContext context,
    List<ProductSummary> products,
    String locale,
    String baseUrl,
  ) =>
      SizedBox(
        // Kartochka balandligi katalogdagi bilan bir xil hisob.
        height: 300,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: products.length,
          separatorBuilder: (_, _) => const SizedBox(width: 12),
          itemBuilder: (_, i) {
            final product = products[i];
            return SizedBox(
              width: 168,
              child: ProductCard(
                product: product,
                locale: locale,
                baseUrl: baseUrl,
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => ProductScreen(slug: product.slug)),
                ),
              ),
            );
          },
        ),
      );
}
