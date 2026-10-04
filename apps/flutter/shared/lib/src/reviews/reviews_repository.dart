import '../api/api_client.dart';
import 'review_models.dart';

/// Mahsulot sharhlari.
///
/// Ro'yxat OCHIQ (mehmon ham ko'radi), yozish esa auth talab qiladi
/// va faqat mahsulotni yetkazib olgan mijozga ruxsat beriladi —
/// qoida serverda (`reviews-server.ts`).
class ReviewsRepository {
  ReviewsRepository(this._api);

  final ApiClient _api;

  Future<ReviewPage> fetchForProduct(String slug, {int page = 1, int limit = 10}) async {
    final data = await _api.get<Map<String, dynamic>>(
      '/api/products/$slug/reviews',
      query: {'page': '$page', 'limit': '$limit'},
    );
    return ReviewPage.fromJson(data);
  }

  Future<ProductReview> create({
    required String productId,
    required int rating,
    String? title,
    String? body,
  }) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/api/reviews',
      body: <String, dynamic>{
        'productId': productId,
        'rating': rating,
        // Bo'sh matn `null` bo'lib ketadi: sxemada maydonlar
        // `.nullable()`, lekin bo'sh satr saqlanib qolsa sharhda
        // bo'sh sarlavha turardi.
        'title': _orNull(title),
        'body': _orNull(body),
      },
    );
    return ProductReview.fromJson(data['review'] as Map<String, dynamic>);
  }

  Future<void> delete(String reviewId) =>
      _api.delete<Map<String, dynamic>>('/api/reviews/$reviewId');

  /// Foydalanuvchining o'z sharhlari.
  Future<List<ProductReview>> fetchMine() async {
    final data = await _api.get<Map<String, dynamic>>('/api/reviews/mine');
    return (data['items'] as List<dynamic>? ?? const [])
        .cast<Map<String, dynamic>>()
        .map(ProductReview.fromJson)
        .toList();
  }

  static String? _orNull(String? value) {
    final trimmed = value?.trim();
    return trimmed == null || trimmed.isEmpty ? null : trimmed;
  }
}
