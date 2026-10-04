import '../api/api_client.dart';
import 'saved_address.dart';

/// Saqlangan manzillar — `/api/addresses`.
///
/// AUTH talab qiladi; mehmon rejimida chaqirmang.
class AddressRepository {
  AddressRepository(this._api);

  final ApiClient _api;

  Future<List<SavedAddress>> fetchAll() async {
    final data = await _api.get<Map<String, dynamic>>('/api/addresses');
    return (data['items'] as List<dynamic>? ?? const [])
        .cast<Map<String, dynamic>>()
        .map(SavedAddress.fromJson)
        .toList();
  }

  Future<SavedAddress> create(AddressInput input) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/api/addresses',
      body: input.toJson(),
    );
    return SavedAddress.fromJson(data['address'] as Map<String, dynamic>);
  }

  Future<SavedAddress> update(String id, AddressInput input) async {
    final data = await _api.patch<Map<String, dynamic>>(
      '/api/addresses/$id',
      body: input.toJson(),
    );
    return SavedAddress.fromJson(data['address'] as Map<String, dynamic>);
  }

  Future<void> delete(String id) => _api.delete<Map<String, dynamic>>('/api/addresses/$id');

  /// Asosiy manzilni belgilaydi.
  ///
  /// Boshqalaridan belgini SERVER olib tashlaydi (bitta tranzaksiyada).
  /// Klientda aylanib chiqsak, yarim bajarilgan holat qolishi mumkin
  /// edi: ikkita asosiy manzil yoki bittasi ham yo'q.
  Future<SavedAddress> setDefault(String id) async {
    final data = await _api.patch<Map<String, dynamic>>(
      '/api/addresses/$id',
      body: <String, dynamic>{'isDefault': true},
    );
    return SavedAddress.fromJson(data['address'] as Map<String, dynamic>);
  }
}
