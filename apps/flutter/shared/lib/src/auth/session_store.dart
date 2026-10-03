import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'auth_user.dart';

/// Sessiya xotirasi: tokenlar + oxirgi ma'lum foydalanuvchi.
///
/// `SharedPreferences` ATAYLAB ishlatilmaydi: refresh token 30 kun
/// yashaydi va oddiy saqlovdan o'qilsa, qurilma zaxirasidan yoki root
/// qilingan telefondan olinishi mumkin.
///
/// Foydalanuvchi ham SHU YERDA saqlanadi, alohida saqlovda emas. Sabab:
/// [clear] bitta chaqiruvda hammasini o'chirsin. Ikki xil saqlov bo'lsa
/// chiqish yarim bajarilib, tokensiz user qolib ketishi mumkin edi.
class SessionStore {
  SessionStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _accessKey = 'sb_access_token';
  static const _refreshKey = 'sb_refresh_token';
  static const _userKey = 'sb_user';

  Future<String?> readAccess() => _storage.read(key: _accessKey);
  Future<String?> readRefresh() => _storage.read(key: _refreshKey);

  Future<void> save({required String access, required String refresh}) async {
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
  }

  /// Oxirgi ma'lum foydalanuvchi — sovuq ishga tushishda ekran darhol
  /// to'lishi uchun. Internet yo'q bo'lsa ham sessiya ko'rinib turadi.
  Future<AuthUser?> readUser() async {
    final raw = await _storage.read(key: _userKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      return AuthUser.fromJson(json.decode(raw) as Map<String, dynamic>);
    } on FormatException {
      // Eski/buzilgan yozuv — sessiyani buzmaymiz, shunchaki keshsiz qolamiz.
      await _storage.delete(key: _userKey);
      return null;
    }
  }

  Future<void> saveUser(AuthUser user) =>
      _storage.write(key: _userKey, value: json.encode(user.toJson()));

  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _userKey);
  }
}
