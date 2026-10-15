import '../catalog/localized_text.dart';

/// Sharh qaysi mahsulotga tegishli (`/api/reviews/mine` javobida).
class ReviewedProduct {
  const ReviewedProduct({required this.slug, required this.name});

  factory ReviewedProduct.fromJson(Map<String, dynamic> json) => ReviewedProduct(
        slug: json['slug'] as String? ?? '',
        name: LocalizedText.fromJson(json['name']),
      );

  final String slug;
  final LocalizedText name;
}

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
    this.images = const [],
    this.helpfulCount = 0,
    this.votedByMe = false,
    this.product,
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
        images: (json['images'] as List<dynamic>? ?? const []).whereType<String>().toList(),
        helpfulCount: (json['helpfulCount'] as num?)?.toInt() ?? 0,
        votedByMe: json['votedByMe'] as bool? ?? false,
        product: json['product'] is Map<String, dynamic>
            ? ReviewedProduct.fromJson(json['product'] as Map<String, dynamic>)
            : null,
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

  /// Mijoz biriktirgan suratlar (ochiq manzillar). Bo'sh bo'lishi mumkin.
  final List<String> images;

  /// «Foydali» deganlar soni.
  final int helpfulCount;

  /// Ko'ruvchi «foydali» bosganmi (mehmonda doim `false`).
  final bool votedByMe;

  /// Faqat «mening sharhlarim» ro'yxatida bor.
  final ReviewedProduct? product;
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
    this.summary,
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
        summary: json['summary'] is Map<String, dynamic>
            ? ReviewSummary.fromJson(json['summary'] as Map<String, dynamic>)
            : null,
      );

  final List<ProductReview> items;
  final int total;
  final bool hasMore;
  final ReviewEligibility? eligibility;

  /// Faqat 1-sahifada keladi; filtrga bog'liq emas.
  final ReviewSummary? summary;
}

/// Sharhlar xulosasi — BUTUN sharhlardan (yuklangan sahifadan emas).
class ReviewSummary {
  const ReviewSummary({
    required this.total,
    required this.average,
    required this.breakdown,
    required this.withPhotos,
  });

  factory ReviewSummary.fromJson(Map<String, dynamic> json) {
    final raw = json['breakdown'] as Map<String, dynamic>? ?? const {};
    return ReviewSummary(
      total: (json['total'] as num?)?.toInt() ?? 0,
      average: (json['average'] as num?)?.toDouble() ?? 0,
      breakdown: {for (var star = 1; star <= 5; star++) star: (raw['$star'] as num?)?.toInt() ?? 0},
      withPhotos: (json['withPhotos'] as num?)?.toInt() ?? 0,
    );
  }

  final int total;
  final double average;

  /// Yulduz (1..5) → sharhlar soni.
  final Map<int, int> breakdown;
  final int withPhotos;
}

/// Sharhlar ro'yxati filtri.
sealed class ReviewFilter {
  const ReviewFilter();
}

class AllReviews extends ReviewFilter {
  const AllReviews();
}

class ReviewsWithPhotos extends ReviewFilter {
  const ReviewsWithPhotos();
}

class ReviewsByStars extends ReviewFilter {
  const ReviewsByStars(this.stars);

  final int stars;
}
