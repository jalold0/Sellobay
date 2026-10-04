import '../api/api_client.dart';

/// Sevimlilar — `/api/wishlist`.
///
/// Server FAQAT `productId` ro'yxatini qaytaradi, mahsulotlarning
/// o'zini emas. To'liq ma'lumot `CatalogRepository.fetchProductsByIds`
/// orqali olinadi — savat sinxronidagi kabi.
class WishlistRepository {
  WishlistRepository(this._api);

  final ApiClient _api;

  Future<List<String>> fetchIds() async {
    final data = await _api.get<Map<String, dynamic>>('/api/wishlist');
    return (data['productIds'] as List<dynamic>? ?? const []).cast<String>();
  }

  Future<void> add(String productId) =>
      _api.post<Map<String, dynamic>>('/api/wishlist', body: {'productId': productId});

  /// `productId` SO'ROV PARAMETRIDA ketadi — route uni `searchParams`
  /// dan o'qiydi, body'dan emas.
  ///
  /// Yo'lga qo'lda yopishtirilmaydi: `?` bilan birga yozilgan manzil
  /// `queryParameters` dan o'tmaydi va qiymat kodlanmay qolardi.
  Future<void> remove(String productId) => _api.delete<Map<String, dynamic>>(
        '/api/wishlist',
        query: {'productId': productId},
      );
}
