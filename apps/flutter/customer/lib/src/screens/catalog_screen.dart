import 'dart:async';

import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../widgets/product_card.dart';
import 'product_screen.dart';

/// Katalog — tizimga kirgandan keyingi asosiy ekran.
///
/// Hamma raqam serverdan keladi: topilgan mahsulotlar soni, zaxira,
/// chegirma foizi. Hech qayerda qotib yozilgan ro'yxat yo'q — bo'sh
/// natija bo'lsa, bo'sh deb aytiladi.
class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key});

  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  final _scroll = ScrollController();
  final _searchField = TextEditingController();

  ProductQuery _query = const ProductQuery();
  final List<ProductSummary> _items = [];
  List<CategorySummary> _categories = const [];

  int _total = 0;
  bool _hasMore = false;
  bool _loading = true;
  bool _loadingMore = false;
  Object? _error;

  Timer? _searchDebounce;

  /// Har yangi so'rovga raqam beriladi. Kech kelgan javob yangisini
  /// bosib ketmasligi uchun: foydalanuvchi tez yozganda birinchi
  /// so'rov ikkinchisidan keyin qaytishi mumkin.
  int _requestId = 0;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadCategories();
      _reload();
    });
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _scroll.removeListener(_onScroll);
    _scroll.dispose();
    _searchField.dispose();
    super.dispose();
  }

  CatalogRepository get _repo => SellobayRuntimeScope.of(context).catalog;

  void _onScroll() {
    if (!_hasMore || _loadingMore || _loading) return;
    if (_scroll.position.pixels < _scroll.position.maxScrollExtent - 400) return;
    _loadMore();
  }

  Future<void> _loadCategories() async {
    try {
      // Bo'sh kategoriya ko'rsatilmaydi — bosilsa bo'sh ro'yxatga
      // olib borardi (web'dagi `fetchStorefrontCategories()` qoidasi).
      final categories = await _repo.fetchStorefrontCategories();
      if (!mounted) return;
      setState(() => _categories = categories);
    } catch (_) {
      // Kategoriyalar — yordamchi filtr. Yuklanmasa katalogni
      // bloklamaymiz, shunchaki chiplar ko'rinmaydi.
    }
  }

  Future<void> _reload() async {
    final id = ++_requestId;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = await _repo.fetchProducts(_query.copyWith(page: 1));
      if (!mounted || id != _requestId) return;
      setState(() {
        _items
          ..clear()
          ..addAll(page.items);
        _total = page.total;
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
    final nextPage = _query.page + 1;
    setState(() => _loadingMore = true);
    try {
      final page = await _repo.fetchProducts(_query.copyWith(page: nextPage));
      if (!mounted) return;
      setState(() {
        _query = _query.copyWith(page: nextPage);
        _items.addAll(page.items);
        _hasMore = page.hasMore;
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted) return;
      // Keyingi sahifa kelmadi — bor ro'yxatni YO'QOTMAYMIZ, faqat
      // xabar beramiz va qayta urinish imkonini qoldiramiz.
      setState(() => _loadingMore = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.errorText(e))),
      );
    }
  }

  void _apply(ProductQuery query) {
    setState(() => _query = query.copyWith(page: 1));
    _reload();
  }

  void _onSearchChanged(String value) {
    // Tozalash tugmasi matn bor-yo'qligiga qarab chiqadi.
    setState(() {});
    _searchDebounce?.cancel();
    // Har harfda so'rov yubormaymiz.
    _searchDebounce = Timer(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      _apply(_query.copyWith(search: value));
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // Savat, buyurtmalar va profil endi pastki panelda — AppBar'da
      // takrorlanmaydi.
      appBar: AppBar(title: Text(context.t('common.appName'))),
      body: RefreshIndicator(
        onRefresh: () async {
          await _loadCategories();
          await _reload();
        },
        child: CustomScrollView(
          controller: _scroll,
          // Natija bo'sh bo'lganda ham tortib yangilash ishlashi uchun.
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: _searchBar(context)),
            if (_categories.isNotEmpty) SliverToBoxAdapter(child: _categoryChips(context)),
            SliverToBoxAdapter(child: _resultBar(context)),
            ..._body(context),
            SliverToBoxAdapter(child: _footer(context)),
          ],
        ),
      ),
    );
  }

  Widget _searchBar(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: TextField(
          controller: _searchField,
          onChanged: _onSearchChanged,
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            hintText: context.t('common.search'),
            prefixIcon: const Icon(Icons.search, size: 20),
            suffixIcon: _searchField.text.isEmpty
                ? null
                : IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () {
                      _searchField.clear();
                      _apply(_query.copyWith(search: null));
                    },
                  ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
      );

  Widget _categoryChips(BuildContext context) {
    final locale = SellobayRuntimeScope.of(context).locale.locale;
    return SizedBox(
      height: 44,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          _chip(
            label: context.t('common.all'),
            selected: _query.categorySlug == null,
            onSelected: () => _apply(_query.copyWith(categorySlug: null)),
          ),
          for (final category in _categories)
            _chip(
              // Mahsulot soni HAQIQIY (`productCount`) — ilgari web'da
              // bu yerda "1 280+" kabi to'qima raqamlar turardi.
              label: '${category.name.pick(locale)} · ${category.productCount}',
              selected: _query.categorySlug == category.slug,
              onSelected: () => _apply(_query.copyWith(categorySlug: category.slug)),
            ),
        ],
      ),
    );
  }

  Widget _chip({
    required String label,
    required bool selected,
    required VoidCallback onSelected,
  }) =>
      Padding(
        padding: const EdgeInsets.only(right: 8),
        child: ChoiceChip(
          label: Text(label),
          selected: selected,
          onSelected: (_) => onSelected(),
          labelStyle: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : SellobayColors.ink,
          ),
          selectedColor: SellobayColors.primary,
          backgroundColor: SellobayColors.soft,
          side: const BorderSide(color: SellobayColors.border),
          showCheckmark: false,
        ),
      );

  Widget _resultBar(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 8, 6),
        child: Row(
          children: [
            Expanded(
              child: Text(
                // Soni serverdan — `total`, ro'yxat uzunligidan emas
                // (ro'yxatda hozircha faqat yuklangan sahifalar bor).
                _loading ? context.t('common.loading') : context.t('catalog.results', params: {'count': _total}),
                style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
              ),
            ),
            PopupMenuButton<ProductSort>(
              initialValue: _query.sort,
              tooltip: context.t('catalog.sort'),
              onSelected: (sort) => _apply(_query.copyWith(sort: sort)),
              itemBuilder: (context) => [
                for (final sort in ProductSort.values)
                  PopupMenuItem(value: sort, child: Text(context.t(sort.labelKey))),
              ],
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.swap_vert, size: 18, color: SellobayColors.ink),
                    const SizedBox(width: 4),
                    Text(
                      context.t(_query.sort.labelKey),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );

  List<Widget> _body(BuildContext context) {
    if (_loading) {
      return [
        const SliverFillRemaining(
          hasScrollBody: false,
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

    if (_error != null) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: _message(
            icon: Icons.cloud_off,
            title: context.errorText(_error!),
            action: FilledButton(
              onPressed: _reload,
              child: Text(context.t('common.retry')),
            ),
          ),
        ),
      ];
    }

    if (_items.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: _message(
            icon: Icons.search_off,
            title: context.t('catalog.noResults'),
            subtitle: context.t('catalog.noResultsHint'),
          ),
        ),
      ];
    }

    final locale = SellobayRuntimeScope.of(context).locale.locale;
    final baseUrl = SellobayRuntimeScope.of(context).api.baseUrl;

    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
        sliver: SliverGrid(
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 14,
            crossAxisSpacing: 14,
            // `childAspectRatio` ATAYLAB ishlatilmaydi: u balandlikni
            // kenglikka bog'laydi, kartochkadagi matn balandligi esa
            // kenglikka bog'liq emas. Tor telefonda hujayra qisqarib,
            // matn sig'may qolardi (test buni ushlagan edi).
            mainAxisExtent: _cellHeight(context),
          ),
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final product = _items[index];
              return ProductCard(
                product: product,
                locale: locale,
                baseUrl: baseUrl,
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => ProductScreen(slug: product.slug),
                  ),
                ),
              );
            },
            childCount: _items.length,
          ),
        ),
      ),
    ];
  }

  /// Kartochka balandligi: kvadrat rasm + matn uchun joy.
  ///
  /// Matn tizim shrifti kattalashtirilganda o'sadi, shuning uchun joy
  /// shkalaga qarab ko'payadi. Chegara qo'yilgan — juda katta shkalada
  /// kartochka butun ekranni egallab ketmasin.
  static double _cellHeight(BuildContext context) {
    const horizontalPadding = 16.0 * 2;
    const crossSpacing = 14.0;
    const textBlock = 158.0;

    final width = MediaQuery.sizeOf(context).width;
    final imageSide = (width - horizontalPadding - crossSpacing) / 2;
    final scale = MediaQuery.textScalerOf(context).scale(1).clamp(1.0, 1.8);
    return imageSide + textBlock * scale;
  }

  Widget _footer(BuildContext context) {
    if (_loadingMore) {
      return const Padding(
        padding: EdgeInsets.only(bottom: 28),
        child: Center(
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2.2, color: SellobayColors.primary),
          ),
        ),
      );
    }
    return const SizedBox(height: 16);
  }

  Widget _message({
    required IconData icon,
    required String title,
    String? subtitle,
    Widget? action,
  }) =>
      Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 42, color: SellobayColors.mutedText),
              const SizedBox(height: 14),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 15.5,
                  fontWeight: FontWeight.w600,
                  color: SellobayColors.ink,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 6),
                Text(
                  subtitle,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
                ),
              ],
              if (action != null) ...[const SizedBox(height: 18), action],
            ],
          ),
        ),
      );
}
