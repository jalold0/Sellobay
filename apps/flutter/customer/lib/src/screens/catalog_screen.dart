import 'dart:async';

import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../home_tabs.dart';
import '../widgets/product_card.dart';
import '../widgets/skeleton.dart';
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

  /// Keyingi sahifa kelmadi. Shu holatda surish yangi so'rov
  /// YUBORMAYDI — ilgari `_hasMore` `true` qolardi va har surishda
  /// so'rov + snackbar takrorlanardi. Ro'yxat oxirida «Qayta urinish».
  Object? _loadMoreError;

  Timer? _searchDebounce;

  /// Har yangi so'rovga raqam beriladi. Kech kelgan javob yangisini
  /// bosib ketmasligi uchun: foydalanuvchi tez yozganda birinchi
  /// so'rov ikkinchisidan keyin qaytishi mumkin. Keyingi sahifa
  /// so'rovi ham shu raqamni oladi — filtr almashgach eski ro'yxatning
  /// 2-sahifasi yangi natijaga qo'shilib ketmasin.
  int _requestId = 0;

  /// Bo'limlar controller'i — katalog bo'limi ochilganda bosh sahifadan
  /// kelgan filtrni qo'llash uchun tinglanadi.
  HomeTabsController? _tabs;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      // Bosh sahifadan filtr bilan kelingan bo'lsa — birinchi so'rov
      // shu filtr bilan ketadi (ikki so'rov emas).
      final pending = _tabs?.takePendingCatalog();
      if (pending != null) _query = pending.copyWith(page: 1);
      _loadCategories();
      _reload();
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // `didChangeDependencies` bo'lim almashganda CHAQIRILMAYDI (ekran
    // `IndexedStack` da tirik turadi) — ilgari katalog bir marta
    // ochilgach, bosh sahifadagi kategoriya bosilishi hech narsa
    // qilmasdi. Shuning uchun controller'ning o'zi tinglanadi.
    final tabs = HomeTabsScope.read(context);
    if (identical(tabs, _tabs)) return;
    _tabs?.removeListener(_onTabsChanged);
    _tabs = tabs?..addListener(_onTabsChanged);
  }

  @override
  void dispose() {
    _tabs?.removeListener(_onTabsChanged);
    _searchDebounce?.cancel();
    _scroll.removeListener(_onScroll);
    _scroll.dispose();
    _searchField.dispose();
    super.dispose();
  }

  CatalogRepository get _repo => SellobayRuntimeScope.of(context).catalog;

  void _onScroll() {
    if (!_hasMore || _loadingMore || _loading || _loadMoreError != null) return;
    if (_scroll.position.pixels < _scroll.position.maxScrollExtent - 400) return;
    _loadMore();
  }

  Future<void> _loadCategories({bool refresh = false}) async {
    try {
      // Bo'sh kategoriya ko'rsatilmaydi — bosilsa bo'sh ro'yxatga
      // olib borardi (web'dagi `fetchStorefrontCategories()` qoidasi).
      // Ro'yxat bosh sahifa bilan bo'lishiladi — qarang repozitoriy.
      final categories = await _repo.fetchStorefrontCategories(refresh: refresh);
      if (!mounted) return;
      setState(() => _categories = categories);
    } catch (_) {
      // Kategoriyalar — yordamchi filtr. Yuklanmasa katalogni
      // bloklamaymiz, shunchaki chiplar ko'rinmaydi.
    }
  }

  /// Birinchi sahifani qayta yuklaydi.
  ///
  /// [quiet] — tortib yangilash: bor ro'yxat skeletga almashmaydi,
  /// yangisi kelguncha ko'rinib turadi (spinnerni `RefreshIndicator`
  /// o'zi ko'rsatadi). Filtr almashganda esa eski natija noto'g'ri —
  /// u holda skelet.
  Future<void> _reload({bool quiet = false}) async {
    final id = ++_requestId;
    setState(() {
      if (!quiet || _items.isEmpty) _loading = true;
      _error = null;
      _loadingMore = false;
      _loadMoreError = null;
    });
    try {
      final page = await _repo.fetchProducts(_query.copyWith(page: 1));
      if (!mounted || id != _requestId) return;
      setState(() {
        _query = _query.copyWith(page: 1);
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
    final id = _requestId;
    final nextPage = _query.page + 1;
    setState(() {
      _loadingMore = true;
      _loadMoreError = null;
    });
    try {
      final page = await _repo.fetchProducts(_query.copyWith(page: nextPage));
      // Shu orada filtr yoki qidiruv o'zgargan — bu sahifa eski
      // so'rovniki, yangi ro'yxatga qo'shilmaydi.
      if (!mounted || id != _requestId) return;
      setState(() {
        _query = _query.copyWith(page: nextPage);
        _items.addAll(page.items);
        _hasMore = page.hasMore;
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted || id != _requestId) return;
      // Keyingi sahifa kelmadi — bor ro'yxatni YO'QOTMAYMIZ. Avtomatik
      // qayta urinish to'xtaydi; ro'yxat oxirida tugma chiqadi.
      setState(() {
        _loadingMore = false;
        _loadMoreError = e;
      });
    }
  }

  /// Bosh sahifadan kelgan filtr (kategoriya, «tanlangan», saralash).
  void _onTabsChanged() {
    final tabs = _tabs;
    if (tabs == null || tabs.tab != HomeTab.catalog) return;
    final pending = tabs.takePendingCatalog();
    if (pending == null) return;
    // Bosh sahifadagi tanlov — yangi ko'rinish: eski qidiruv matni
    // ham olib tashlanadi, aks holda filtr qidiruv bilan kesishardi.
    _searchDebounce?.cancel();
    _searchField.clear();
    _apply(pending);
  }

  void _apply(ProductQuery query) {
    setState(() => _query = query.copyWith(page: 1));
    _reload();
  }

  void _onSearchChanged(String value) {
    // `setState` YO'Q: tozalash tugmasi o'zi kontrollerni tinglaydi.
    // Ilgari har harf butun ekranni (to'rni ham) qayta qurardi.
    _searchDebounce?.cancel();
    // Har harfda so'rov yubormaymiz.
    _searchDebounce = Timer(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      _apply(_query.copyWith(search: value));
    });
  }

  /// Klaviaturadagi «Qidirish» — kutmasdan darhol.
  void _onSearchSubmitted(String value) {
    _searchDebounce?.cancel();
    if ((_query.search ?? '') == value) return;
    _apply(_query.copyWith(search: value));
  }

  /// Tortib yangilash: kategoriyalar va mahsulotlar BIRGA so'raladi,
  /// ro'yxat esa yangisi kelguncha joyida qoladi.
  Future<void> _refresh() => Future.wait([
        _loadCategories(refresh: true),
        _reload(quiet: true),
      ]);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // Sarlavha «Sellobay» EMAS: u endi bosh sahifada. Ikkalasi bir
      // xil bo'lsa, qaysi bo'limda turganini ajratib bo'lmasdi.
      appBar: AppBar(title: Text(context.t('nav.catalog'))),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(
          controller: _scroll,
          // Natija bo'sh bo'lganda ham tortib yangilash ishlashi uchun.
          physics: const AlwaysScrollableScrollPhysics(),
          // Ro'yxatni surish klaviaturani yopadi — qidiruvdan keyin
          // natijani ko'rish uchun alohida «orqaga» shart emas.
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          slivers: [
            SliverToBoxAdapter(child: _searchBar(context)),
            if (_categories.isNotEmpty || _query.featured == true || _query.scope == CatalogScope.global)
              SliverToBoxAdapter(child: _categoryChips(context)),
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
        // Faqat qidiruv qatori matnni tinglaydi (tozalash tugmasi uchun) —
        // har harfda butun ekran, ya'ni to'r ham, qayta qurilmaydi.
        child: ValueListenableBuilder<TextEditingValue>(
          valueListenable: _searchField,
          builder: (context, value, _) => TextField(
            controller: _searchField,
            onChanged: _onSearchChanged,
            onSubmitted: _onSearchSubmitted,
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: context.t('common.search'),
              prefixIcon: const Icon(Icons.search, size: 20),
              suffixIcon: value.text.isEmpty
                  ? null
                  : IconButton(
                      tooltip: context.t('common.clear'),
                      icon: const Icon(Icons.close, size: 18),
                      onPressed: () {
                        _searchDebounce?.cancel();
                        _searchField.clear();
                        _apply(_query.copyWith(search: null));
                      },
                    ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
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
          // Bosh sahifadagi «Tanlangan kolleksiya» dan kelingan filtr.
          // Kategoriyalar orasida tanlab bo'lmaydi, shuning uchun alohida
          // chip: ko'rinib turadi va bitta bosishda olib tashlanadi —
          // aks holda ro'yxat nega qisqa ekani tushunarsiz qolardi.
          if (_query.featured == true)
            _removableChip(
              context,
              label: context.t('featured.title'),
              onRemove: () => _apply(_query.copyWith(featured: null)),
            ),
          // Bosh sahifadagi «Global» — Xitoydan keladigan tovarlar.
          if (_query.scope == CatalogScope.global)
            _removableChip(
              context,
              label: context.t('home.global'),
              onRemove: () => _apply(_query.copyWith(scope: CatalogScope.local)),
            ),
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

  /// Tashqaridan kelgan filtr: ko'rinib turadi va bitta bosishda olinadi.
  Widget _removableChip(
    BuildContext context, {
    required String label,
    required VoidCallback onRemove,
  }) =>
      Padding(
        padding: const EdgeInsets.only(right: 8),
        child: InputChip(
          label: Text(label),
          selected: true,
          showCheckmark: false,
          onPressed: onRemove,
          onDeleted: onRemove,
          deleteIcon: const Icon(Icons.close, size: 16, color: Colors.white),
          deleteButtonTooltipMessage: context.t('common.clear'),
          labelStyle: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
          selectedColor: SellobayColors.primary,
          side: const BorderSide(color: SellobayColors.primary),
        ),
      );

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
        const SliverToBoxAdapter(child: ProductGridSkeleton()),
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
    final loadMoreError = _loadMoreError;
    if (loadMoreError != null) {
      // Bor ro'yxat joyida qoladi — faqat davomi kelmadi. Avtomatik
      // qayta urinish yo'q (har surishda so'rov ketardi), shuning uchun
      // sabab va tugma shu yerda.
      return Padding(
        padding: const EdgeInsets.fromLTRB(32, 4, 32, 28),
        child: Column(
          children: [
            Text(
              context.errorText(loadMoreError),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: _loadMore,
              child: Text(context.t('common.retry')),
            ),
          ],
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
