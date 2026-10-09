import '../api/api_client.dart';

/// Qurilma push tokeni — `/api/push/token`.
///
/// Token QURILMAGA tegishli: server uni `token` bo'yicha upsert qiladi,
/// shuning uchun boshqa hisobga kirilsa token yangi egasiga o'tadi.
class PushRepository {
  PushRepository(this._api);

  final ApiClient _api;

  Future<void> register({
    required String token,
    required String platform,
    required String appName,
  }) =>
      _api.post<Map<String, dynamic>>(
        '/api/push/token',
        body: {'token': token, 'platform': platform, 'appName': appName},
      );

  Future<void> unregister(String token) =>
      _api.delete<Map<String, dynamic>>('/api/push/token', body: {'token': token});
}
