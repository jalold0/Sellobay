import '../api/api_client.dart';
import 'delivery_models.dart';

/// `/api/courier/deliveries` ustidagi qatlam.
///
/// Hammasi auth VA `COURIER` rolini talab qiladi — rolsiz foydalanuvchi
/// `403 NOT_A_COURIER` oladi. Kuryer ilovasi kirishda rolni allaqachon
/// tekshiradi (`AuthController.requiredRole`), shuning uchun bu yerga
/// faqat haqiqiy kuryer yetib keladi.
class CourierRepository {
  CourierRepository(this._api);

  final ApiClient _api;

  Future<CourierDeliveries> fetchDeliveries() async {
    final data = await _api.get<Map<String, dynamic>>('/api/courier/deliveries');
    return CourierDeliveries.fromJson(data);
  }

  /// Bo'sh yetkazishni o'ziga olish.
  ///
  /// Ikki kuryer bir vaqtda bossa, ikkinchisi `409 ALREADY_CLAIMED`
  /// oladi — server shart bilan yangilaydi.
  Future<CourierDelivery> claim(String deliveryId) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/api/courier/deliveries/$deliveryId/claim',
    );
    return CourierDelivery.fromJson(data['delivery'] as Map<String, dynamic>);
  }

  /// Holatni oldinga surish.
  ///
  /// [status] `CourierDelivery.nextStatuses` dan olinadi — ro'yxatni
  /// server beradi. `FAILED` uchun [note] MAJBURIY (server
  /// `400 REASON_REQUIRED` qaytaradi).
  /// [proofPhotoUrl] — `uploadProofPhoto` qaytargan yo'l. Server uni
  /// FAQAT `DELIVERED` va `FAILED` ga biriktiradi; oraliq holatga
  /// yuborilsa `400 PROOF_NOT_ALLOWED` qaytadi.
  Future<CourierDelivery> updateStatus(
    String deliveryId,
    DeliveryStatus status, {
    String? note,
    double? latitude,
    double? longitude,
    String? proofPhotoUrl,
  }) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/api/courier/deliveries/$deliveryId/status',
      body: {
        'status': status.value,
        'note': ?note,
        'latitude': ?latitude,
        'longitude': ?longitude,
        'proofPhotoUrl': ?proofPhotoUrl,
      },
    );
    return CourierDelivery.fromJson(data['delivery'] as Map<String, dynamic>);
  }

  /// Isbot suratini yuklaydi va ichki yo'lini qaytaradi.
  ///
  /// Holat o'zgartirishdan ALOHIDA yuboriladi: surat bir necha megabayt
  /// bo'lishi mumkin va tarmoq uzilsa, butun holat so'rovini qayta
  /// yuborish kerak bo'lardi.
  Future<String> uploadProofPhoto({
    required List<int> bytes,
    required String filename,
  }) =>
      _api.uploadDeliveryProof(bytes: bytes, filename: filename);

  /// Tugagan topshiriqlar, sahifalab.
  ///
  /// [cursor] — oldingi sahifaning `nextCursor` i. Birinchi sahifa
  /// uchun `null`.
  Future<CourierHistoryPage> fetchHistory({String? cursor, int? limit}) async {
    final data = await _api.get<Map<String, dynamic>>(
      '/api/courier/history',
      query: {'cursor': ?cursor, 'limit': ?limit},
    );
    return CourierHistoryPage.fromJson(data);
  }

  Future<CourierStats> fetchStats() async {
    final data = await _api.get<Map<String, dynamic>>('/api/courier/stats');
    return CourierStats.fromJson(data['stats'] as Map<String, dynamic>);
  }
}
