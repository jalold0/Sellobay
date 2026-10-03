import 'package:decimal/decimal.dart';

import '../api/api_client.dart';
import '../utils/money.dart';
import 'cart_line.dart';

/// Serverdagi savat satri.
///
/// E'TIBOR: bunda NOM, BREND va RASM YO'Q — faqat identifikatorlar va
/// son. Ularni ko'rsatish uchun `GET /api/products?ids=...` bilan
/// mahsulotlarni olib kelish kerak.
class ServerCartItem {
  const ServerCartItem({
    required this.productId,
    required this.variantId,
    required this.quantity,
    required this.unitPrice,
  });

  factory ServerCartItem.fromJson(Map<String, dynamic> json) => ServerCartItem(
        productId: json['productId'] as String,
        variantId: json['variantId'] as String?,
        quantity: (json['quantity'] as num).toInt(),
        unitPrice: parseMoney(json['unitPrice']),
      );

  final String productId;
  final String? variantId;
  final int quantity;
  final Decimal unitPrice;

  String get key => '$productId|${variantId ?? ''}';
}

/// Sinxron strategiyasi.
enum CartSyncStrategy {
  /// Mahalliy va serverdagi sonlar QO'SHILADI. Kirishda bir marta.
  merge('merge'),

  /// Server mahalliy nusxaga aylanadi. Keyingi o'zgarishlarda.
  replace('replace');

  const CartSyncStrategy(this.value);

  final String value;
}

/// `/api/cart` ustidagi qatlam.
///
/// Bu endpoint auth TALAB QILADI (`{success,data}` o'ralgan shakl).
/// Tizimga kirmagan foydalanuvchida umuman chaqirilmaydi — savat
/// mahalliy qoladi.
class CartRepository {
  CartRepository(this._api);

  final ApiClient _api;

  Future<List<ServerCartItem>> fetchCart() async {
    final data = await _api.get<Map<String, dynamic>>('/api/cart');
    return _items(data);
  }

  /// Savatni serverga yozadi va serverdagi YAKUNIY ro'yxatni qaytaradi.
  Future<List<ServerCartItem>> sync(
    List<CartLine> lines, {
    required CartSyncStrategy strategy,
  }) async {
    final data = await _api.put<Map<String, dynamic>>(
      '/api/cart',
      body: {
        'items': [
          for (final line in lines)
            {
              'productId': line.productId,
              'variantId': line.variantId,
              'quantity': line.quantity,
            },
        ],
        'strategy': strategy.value,
      },
    );
    return _items(data);
  }

  List<ServerCartItem> _items(Map<String, dynamic> data) =>
      (data['items'] as List<dynamic>? ?? const [])
          .cast<Map<String, dynamic>>()
          .map(ServerCartItem.fromJson)
          .toList();
}
