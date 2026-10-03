import '../api/api_client.dart';
import 'product.dart';
import 'taxonomy.dart';

/// Saralash tartiblari — serverdagi `sort` qiymatlari bilan BIR XIL
/// (`apps/web/src/app/api/products/route.ts`). Noma'lum qiymat berilsa
/// server jimgina `newest` ga qaytadi, shuning uchun ro'yxat yopiq.
enum ProductSort {
  newest('newest', 'catalog.sortBy.newest'),
  popular('popular', 'catalog.sortBy.popularity'),
  priceAsc('price-asc', 'catalog.sortBy.priceAsc'),
  priceDesc('price-desc', 'catalog.sortBy.priceDesc'),
  rating('rating', 'catalog.sortBy.rating');

  const ProductSort(this.value, this.labelKey);

  /// So'rovdagi qiymat.
  final String value;

  /// i18n kaliti — matn `packages/i18n` da.
  final String labelKey;
}

/// Qamrov. Standart — LOKAL.
///
/// Global tovar (Xitoy, 15-17 kun yetkazish) lokal ro'yxatga tasodifan
/// tushib qolmasligi kerak: mijoz "ertaga keladi" deb o'ylab buyurtma
/// bermasin. Shuning uchun uni ALOHIDA so'rash kerak.
enum CatalogScope {
  local('LOCAL'),
  global('GLOBAL'),
  all('ALL');

  const CatalogScope(this.value);

  final String value;
}

/// Katalog so'rovi.
class ProductQuery {
  const ProductQuery({
    this.search,
    this.categorySlug,
    this.brandSlug,
    this.sort = ProductSort.newest,
    this.scope = CatalogScope.local,
    this.featured,
    this.page = 1,
    this.limit = 24,
  });

  final String? search;
  final String? categorySlug;
  final String? brandSlug;
  final ProductSort sort;
  final CatalogScope scope;
  final bool? featured;
  final int page;
  final int limit;

  ProductQuery copyWith({
    Object? search = _unset,
    Object? categorySlug = _unset,
    Object? brandSlug = _unset,
    ProductSort? sort,
    CatalogScope? scope,
    int? page,
    int? limit,
  }) {
    return ProductQuery(
      // `_unset` sentinel: `null` berib maydonni TOZALASH ham kerak
      // (masalan kategoriya filtrini olib tashlash), shuning uchun
      // oddiy `?? this.x` yetarli emas.
      search: identical(search, _unset) ? this.search : search as String?,
      categorySlug: identical(categorySlug, _unset) ? this.categorySlug : categorySlug as String?,
      brandSlug: identical(brandSlug, _unset) ? this.brandSlug : brandSlug as String?,
      sort: sort ?? this.sort,
      scope: scope ?? this.scope,
      featured: featured,
      page: page ?? this.page,
      limit: limit ?? this.limit,
    );
  }

  Map<String, dynamic> toQueryParameters() {
    final trimmed = search?.trim();
    return <String, dynamic>{
      // Server 2 belgidan qisqa qidiruvni e'tiborsiz qoldiradi, shuning
      // uchun bekorga yubormaymiz.
      if (trimmed != null && trimmed.length >= 2) 'q': trimmed,
      if (categorySlug != null) 'category': categorySlug,
      if (brandSlug != null) 'brand': brandSlug,
      if (featured == true) 'featured': 'true',
      'sort': sort.value,
      'scope': scope.value,
      'page': '$page',
      'limit': '$limit',
    };
  }

  static const Object _unset = Object();
}

/// Katalog endpointlari ustidagi yupqa qatlam.
///
/// DIQQAT: bu route'lar `{success,data}` ga O'RALMAGAN — [ApiClient.getRaw]
/// ishlatiladi. Sabab va oqibati `getRaw` izohida.
class CatalogRepository {
  CatalogRepository(this._api);

  final ApiClient _api;

  Future<ProductPage> fetchProducts(ProductQuery query) async {
    final json = await _api.getRaw<Map<String, dynamic>>(
      '/api/products',
      query: query.toQueryParameters(),
    );
    return ProductPage.fromJson(json);
  }

  /// Bitta mahsulot. Topilmasa `ApiException(code: 'NOT_FOUND')`.
  Future<ProductDetail> fetchProduct(String slug) async {
    final json = await _api.getRaw<Map<String, dynamic>>('/api/products/$slug');
    return ProductDetail.fromJson(json);
  }

  /// TO'LIQ ro'yxat — bo'sh kategoriyalar bilan.
  ///
  /// `/api/categories` `fetchTopCategories()` ni qaytaradi: admin bo'sh
  /// kategoriyani ko'rishi kerak. Mijoz ekranida [fetchStorefrontCategories]
  /// ishlating.
  Future<List<CategorySummary>> fetchCategories() async {
    final json = await _api.getRaw<Map<String, dynamic>>('/api/categories');
    return (json['items'] as List<dynamic>? ?? const [])
        .cast<Map<String, dynamic>>()
        .map(CategorySummary.fromJson)
        .toList();
  }

  /// Mijoz ko'radigan kategoriyalar — mahsuloti BORLARI.
  ///
  /// `apps/web/src/lib/catalog.ts` dagi `fetchStorefrontCategories()` bilan
  /// bir xil qoida: bo'sh kategoriyani ko'rsatsak, mijoz uni bosib bo'sh
  /// katalogga tushadi. Web'da bu filtr serverda bajariladi, mobil uchun
  /// esa alohida endpoint yo'q — shuning uchun shu yerda.
  ///
  /// Eslatma: `productCount` kategoriyaga BOG'LANGAN hamma mahsulotni
  /// sanaydi (status va qamrovga qaramay), ro'yxat esa LOKAL va ACTIVE
  /// bilan cheklangan. Ya'ni son ro'yxatdan katta bo'lishi mumkin — bu
  /// farq web'da ham bor.
  Future<List<CategorySummary>> fetchStorefrontCategories() async {
    final all = await fetchCategories();
    return all.where((c) => c.productCount > 0).toList();
  }

  Future<List<BrandSummary>> fetchBrands() async {
    final json = await _api.getRaw<Map<String, dynamic>>('/api/brands');
    return (json['items'] as List<dynamic>? ?? const [])
        .cast<Map<String, dynamic>>()
        .map(BrandSummary.fromJson)
        .toList();
  }
}
