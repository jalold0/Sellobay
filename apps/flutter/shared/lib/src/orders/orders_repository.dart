import '../api/api_client.dart';
import 'order_models.dart';

/// `/api/orders` ustidagi qatlam. Hammasi AUTH talab qiladi.
class OrdersRepository {
  OrdersRepository(this._api);

  final ApiClient _api;

  /// Oxirgi 50 ta buyurtma (server shuncha bilan cheklaydi), yangisidan
  /// eskisiga.
  Future<List<OrderSummary>> fetchOrders() async {
    final data = await _api.get<Map<String, dynamic>>('/api/orders');
    return (data['items'] as List<dynamic>? ?? const [])
        .cast<Map<String, dynamic>>()
        .map(OrderSummary.fromJson)
        .toList();
  }

  /// Bitta buyurtma — summa taqsimoti, to'lov holati va qaytarish
  /// imkoniyati bilan. Ro'yxat javobida bular YO'Q.
  ///
  /// Boshqa odamning buyurtmasi so'ralsa server `403 FORBIDDEN` beradi.
  /// Raqam + telefon bo'yicha kuzatish. AUTH TALAB QILMAYDI.
  ///
  /// Telefon SHART: buyurtma raqami ketma-ket
  /// (`ORD-2026-00001234`), faqat raqam bo'yicha qidirish begona
  /// odamga birma-bir sanab chiqish imkonini berardi.
  ///
  /// Server topilmadi va telefon mos emas holatlariga BIR XIL javob
  /// qaytaradi (404) — farq «bu raqam mavjud» degan ma'lumotni
  /// oshkor qilardi.
  Future<TrackedOrder> track({required String number, required String phone}) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/api/orders/track',
      body: {'number': number.trim().toUpperCase(), 'phone': phone.trim()},
    );
    return TrackedOrder.fromJson(data);
  }

  Future<OrderDetail> fetchOrder(String id) async {
    final data = await _api.get<Map<String, dynamic>>('/api/orders/$id');
    return OrderDetail.fromJson(data);
  }

  /// Buyurtmani bekor qilish. FAQAT `PENDING` holatida ishlaydi —
  /// aks holda server `409 NOT_CANCELLABLE` qaytaradi.
  ///
  /// Server yon ta'sirlarni ham qaytaradi: zaxira tiklanadi, Sello Coins
  /// va promokod hisobi orqaga olinadi.
  Future<void> cancelOrder(String id, {String? reason}) async {
    await _api.post<Map<String, dynamic>>(
      '/api/orders/$id/cancel',
      body: {'reason': ?reason},
    );
  }

  /// Qaytarishni so'rash. Oynani server tekshiradi (`returnable`).
  Future<void> requestReturn(String id, {String? reason}) async {
    await _api.post<Map<String, dynamic>>(
      '/api/orders/$id/return',
      body: {'reason': ?reason},
    );
  }
}
