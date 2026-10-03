import 'package:shared_preferences/shared_preferences.dart';

/// Savatni saqlash uchun eng kichik shartnoma.
///
/// `SharedPreferences` ning O'ZIGA bog'lanmaymiz: uni testda soxtalash
/// uchun o'nlab metodni qoplash kerak bo'lardi (va platforma kanali
/// baribir kerak bo'lardi). Ikki metodli interfeys bilan test
/// `InMemoryCartStorage` ni beradi, xolos.
abstract interface class CartStorage {
  Future<String?> read();
  Future<void> write(String value);
  Future<void> clear();
}

/// Odatiy saqlov — qurilma xotirasi.
///
/// `flutter_secure_storage` ATAYLAB ishlatilmaydi: savat maxfiy
/// ma'lumot emas, iOS keychain esa ilova o'chirilganda ham saqlanib
/// qoladi — qayta o'rnatilgan ilovada eski savat tirilib chiqardi.
class PrefsCartStorage implements CartStorage {
  static const _key = 'sb_cart_v1';

  SharedPreferences? _prefs;

  Future<SharedPreferences> get _instance async =>
      _prefs ??= await SharedPreferences.getInstance();

  @override
  Future<String?> read() async => (await _instance).getString(_key);

  @override
  Future<void> write(String value) async => (await _instance).setString(_key, value);

  @override
  Future<void> clear() async => (await _instance).remove(_key);
}
