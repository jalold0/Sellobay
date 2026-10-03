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
  Future<CourierDelivery> updateStatus(
    String deliveryId,
    DeliveryStatus status, {
    String? note,
    double? latitude,
    double? longitude,
  }) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/api/courier/deliveries/$deliveryId/status',
      body: {
        'status': status.value,
        'note': ?note,
        'latitude': ?latitude,
        'longitude': ?longitude,
      },
    );
    return CourierDelivery.fromJson(data['delivery'] as Map<String, dynamic>);
  }
}
