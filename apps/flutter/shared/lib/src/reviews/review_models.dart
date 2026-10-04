/// Mahsulot sharhi (`GET /api/products/{slug}/reviews`).
class ProductReview {
  const ProductReview({
    required this.id,
    required this.rating,
    required this.title,
    required this.body,
    required this.author,
    required this.userId,
    required this.isVerifiedPurchase,
    required this.createdAt,
  });

  factory ProductReview.fromJson(Map<String, dynamic> json) => ProductReview(
        id: json['id'] as String,
        rating: (json['rating'] as num?)?.toInt() ?? 0,
        title: json['title'] as String?,
        body: json['body'] as String?,
        // Server faqat ism va familiyaning bosh harfini beradi.
        author: json['author'] as String? ?? '',
        userId: json['userId'] as String? ?? '',
        isVerifiedPurchase: json['isVerifiedPurchase'] as bool? ?? false,
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
      );

  final String id;
  final int rating;
  final String? title;
  final String? body;

  /// Bo'sh bo'lishi mumkin — mijoz ismini kiritmagan.
  final String author;

  /// Sharh muallifi; o'z sharhini ajratib ko'rsatish uchun.
  final String userId;

  final bool isVerifiedPurchase;
  final DateTime? createdAt;
}

/// Mijoz shu mahsulotga sharh yoza oladimi.
///
/// Qoidani SERVER aytadi (`reviews-server.ts`): xarid yetkazilganmi va
/// avval yozilganmi. Klientda takrorlasak, ikkisi ajralib ketardi va
/// ilova serverda rad etiladigan tugmani ko'rsatardi.
class ReviewEligibility {
  const ReviewEligibility({
    required this.canReview,
    required this.hasPurchased,
    required this.existingReviewId,
  });

  factory ReviewEligibility.fromJson(Map<String, dynamic> json) => ReviewEligibility(
        canReview: json['canReview'] as bool? ?? false,
        hasPurchased: json['hasPurchased'] as bool? ?? false,
        existingReviewId: json['existingReviewId'] as String?,
      );

  final bool canReview;
  final bool hasPurchased;
  final String? existingReviewId;
}

/// Sharhlar sahifasi.
class ReviewPage {
  const ReviewPage({
    required this.items,
    required this.total,
    required this.hasMore,
    required this.eligibility,
  });

  factory ReviewPage.fromJson(Map<String, dynamic> json) => ReviewPage(
        items: (json['items'] as List<dynamic>? ?? const [])
            .cast<Map<String, dynamic>>()
            .map(ProductReview.fromJson)
            .toList(),
        total: (json['total'] as num?)?.toInt() ?? 0,
        hasMore: json['hasMore'] as bool? ?? false,
        // Mehmonda `null` — huquq haqida gap ham bo'lmaydi.
        eligibility: json['eligibility'] == null
            ? null
            : ReviewEligibility.fromJson(json['eligibility'] as Map<String, dynamic>),
      );

  final List<ProductReview> items;
  final int total;
  final bool hasMore;
  final ReviewEligibility? eligibility;
}
