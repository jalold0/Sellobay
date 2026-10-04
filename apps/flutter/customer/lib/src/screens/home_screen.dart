import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../home_tabs.dart';
import '../widgets/product_card.dart';
import 'product_screen.dart';

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

  void _openCatalog({String? categorySlug}) =>
      HomeTabsScope.read(context)?.openCatalog(categorySlug: categorySlug);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.t('common.appName'))),
      body: RefreshIndicator(onRefresh: _load, child: _body(context)),
    );
  }

  Widget _body(BuildContext context) {
    if (_loading) {
      return const Center(
        child: SizedBox(
          width: 26,
          height: 26,
          child: CircularProgressIndicator(strokeWidth: 2.5, color: SellobayColors.primary),
        ),
      );
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
        if (_categories.isNotEmpty) ...[
          _sectionHeader(context, context.t('home.categoriesTitle')),
          _categoryRow(context, locale),
        ],
        if (_featured.isNotEmpty) ...[
          _sectionHeader(context, context.t('featured.title'), onViewAll: _openCatalog),
          _productRow(context, _featured, locale, baseUrl),
        ],
        if (_popular.isNotEmpty) ...[
          _sectionHeader(context, context.t('home.bestSellersTitle'), onViewAll: _openCatalog),
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
          onTap: _openCatalog,
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

  Widget _categoryRow(BuildContext context, String locale) => SizedBox(
        height: 42,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: _categories.length,
          separatorBuilder: (_, _) => const SizedBox(width: 8),
          itemBuilder: (_, i) {
            final category = _categories[i];
            return ActionChip(
              label: Text(category.name.pick(locale)),
              onPressed: () => _openCatalog(categorySlug: category.slug),
            );
          },
        ),
      );

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
