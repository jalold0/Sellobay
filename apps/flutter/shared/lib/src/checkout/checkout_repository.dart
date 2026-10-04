import 'package:decimal/decimal.dart';

import '../api/api_client.dart';
import '../addresses/address_repository.dart';
import '../addresses/saved_address.dart';
import '../cart/cart_line.dart';
import 'checkout_models.dart';

/// Buyurtma rasmiylashtirish uchun kerakli chaqiruvlar.
class CheckoutRepository {
  CheckoutRepository(this._api);

  final ApiClient _api;

  /// Manzillar bitta joyda boshqariladi — ikki nusxa bo'lmasin.
  late final _addresses = AddressRepository(_api);

  /// Saqlangan manzillar. AUTH talab qiladi — mehmonda chaqirmang.
  Future<List<SavedAddress>> fetchAddresses() => _addresses.fetchAll();

  Future<List<PickupPoint>> fetchPickupPoints({String? region, String? city}) async {
    final data = await _api.get<Map<String, dynamic>>(
      '/api/pickup-points',
      query: {
        if (region != null && region.isNotEmpty) 'region': region,
        if (city != null && city.isNotEmpty) 'city': city,
      },
    );
    return (data['items'] as List<dynamic>? ?? const [])
        .cast<Map<String, dynamic>>()
        .map(PickupPoint.fromJson)
        .toList();
  }

  /// Hozir ishlaydigan to'lov usullari va platforma kartalari.
  ///
  /// Server sozlanmagan provayderni (env kalitlari yo'q) ro'yxatga
  /// qo'shmaydi. Shu sababli ro'yxatni KLIENTDA yozib qo'ymaymiz: aks
  /// holda mijoz Click'ni tanlab, bo'sh `service_id` bilan qurilgan
  /// buzuq to'lov sahifasiga tushardi.
  ///
  /// Kartalar AYNI javobda keladi — ikkita so'rov qilishning hojati yo'q.
  Future<PaymentOptions> fetchPaymentOptions() async {
    final data = await _api.get<Map<String, dynamic>>('/api/payment-cards');
    return PaymentOptions(
      cards: (data['cards'] as List<dynamic>? ?? const [])
          .cast<Map<String, dynamic>>()
          .map(PaymentCard.fromJson)
          .toList(),
      providers: (data['providers'] as List<dynamic>? ?? const [])
          .cast<String>()
          .map(PaymentProvider.fromValue)
          .whereType<PaymentProvider>()
          .toList(),
    );
  }

  /// Chek rasmini yuklaydi va bazaga yoziladigan yo'lni qaytaradi.
  Future<String> uploadReceipt({required List<int> bytes, required String filename}) =>
      _api.uploadReceipt(bytes: bytes, filename: filename);

  /// Promokodni tekshiradi. Hech narsa saqlanmaydi — faqat ko'rsatish.
  Future<PromoPreview> validatePromo({
    required String code,
    required Decimal subtotal,
    required int shippingFee,
  }) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/api/promo/validate',
      body: {
        'code': code.trim(),
        // Server `z.number()` kutadi — Decimal'ni butun songa keltiramiz.
        'subtotal': subtotal.toBigInt().toInt(),
        'shippingFee': shippingFee,
      },
    );
    return PromoPreview.fromJson(data);
  }

  /// Buyurtma yaratish.
  ///
  /// [idempotencyKey] CHECKOUT BOSHIDA bir marta hosil qilinadi va
  /// qayta urinishlarda O'ZGARMAYDI. Har urinishda yangilansa, uning
  /// ma'nosi yo'qoladi: tarmoq uzilib qayta yuborilganda ikkinchi
  /// buyurtma yaratilardi (zaxira ikki marta kamayardi).
  ///
  /// Server ayni kalitni ikkinchi marta ko'rsa yangi buyurtma
  /// yaratmaydi — birinchisini `replayed: true` bilan qaytaradi.
  Future<PlacedOrder> createOrder({
    required List<CartLine> items,
    required String recipientName,
    required String phone,
    required String region,
    required String city,
    required String street,
    String? apartment,
    required DeliveryMethod deliveryMethod,
    String? pickupPointId,
    required PaymentProvider paymentProvider,
    /// `UZCARD` uchun MAJBURIY — `uploadReceipt` qaytargan yo'l.
    String? paymentReceipt,
    String? paymentNote,
    String? promoCode,
    String? notes,
    required String idempotencyKey,
  }) async {
    final data = await _api.createOrder(
      {
        'items': [
          for (final line in items)
            {
              'productId': line.productId,
              'quantity': line.quantity,
              if (line.variantId != null) 'variantId': line.variantId,
            },
        ],
        'recipientName': recipientName.trim(),
        // Telefonni server o'zi normallashtiradi (`normalizeUzPhone`
        // transformatsiyasi sxemada), lekin biz ham E.164 yuboramiz —
        // CLAUDE.md qoidasi.
        'phone': phone.trim(),
        'region': region.trim(),
        'city': city.trim(),
        'street': street.trim(),
        if (apartment != null && apartment.trim().isNotEmpty) 'apartment': apartment.trim(),
        'deliveryMethod': deliveryMethod.value,
        'pickupPointId': ?pickupPointId,
        'paymentProvider': paymentProvider.value,
        if (paymentReceipt != null && paymentReceipt.isNotEmpty)
          'paymentReceipt': paymentReceipt,
        if (paymentNote != null && paymentNote.trim().isNotEmpty)
          'paymentNote': paymentNote.trim(),
        if (promoCode != null && promoCode.trim().isNotEmpty) 'promoCode': promoCode.trim(),
        if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
      },
      idempotencyKey: idempotencyKey,
    );
    return PlacedOrder.fromJson(data);
  }

  /// Onlayn to'lovni boshlash. AUTH talab qiladi.
  ///
  /// Buyurtma ALLAQACHON yaratilgan bo'ladi (status `PENDING`), shuning
  /// uchun bu qadam yiqilsa ham buyurtma yo'qolmaydi.
  Future<PaymentStart> startPayment({
    required String orderId,
    required PaymentProvider provider,
  }) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/api/payments/create',
      body: {'orderId': orderId, 'provider': provider.value},
    );
    return PaymentStart.fromJson(data);
  }
}
