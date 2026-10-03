import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Tokenlar xavfsiz saqlovda.
///
/// `SharedPreferences` ATAYLAB ishlatilmaydi: refresh token 30 kun yashaydi
/// va u oddiy saqlovdan o'qilsa, qurilma zaxirasidan yoki root qilingan
/// telefondan olinishi mumkin.
class TokenStore {
  TokenStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _accessKey = 'sb_access_token';
  static const _refreshKey = 'sb_refresh_token';

  Future<String?> readAccess() => _storage.read(key: _accessKey);
  Future<String?> readRefresh() => _storage.read(key: _refreshKey);

  Future<void> save({required String access, required String refresh}) async {
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
  }

  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}
