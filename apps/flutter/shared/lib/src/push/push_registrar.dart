import 'dart:async';

import '../auth/auth_controller.dart';
import 'push_repository.dart';

/// Push tokenining manbai (ilovada `firebase_messaging` ustida).
///
/// `shared` Firebase'ga bog'lanmaydi: ikkala ilova uni o'zi beradi, mantiq
/// esa bu yerda va Firebase'siz sinaladi.
abstract class PushTokenSource {
  /// `android` | `ios`.
  String get platform;

  /// Ruxsat berildimi. Rad etilsa ilova ishlayveradi, faqat push kelmaydi.
  Future<bool> requestPermission();

  Future<String?> getToken();

  Stream<String> get onTokenRefresh;
}

/// Kirgan foydalanuvchining qurilma tokenini serverda yangilab turadi.
///
/// - kirganda ruxsat so'raydi va tokenni yuboradi;
/// - FCM tokenni almashtirsa qayta yuboradi;
/// - chiqishdan OLDIN tokenni o'chiradi (chiqqach so'rov 401 oladi), aks
///   holda chiqib ketgan odamning bildirishnomasi shu qurilmaga kelaverardi.
///
/// Hech qachon xato tashlamaydi: push yo'qligi sabab kirish yoki chiqish
/// buzilmasligi kerak.
class PushRegistrar {
  PushRegistrar({
    required this._auth,
    required PushRepository repository,
    required this._source,
    required this.appName,
  }) : _repo = repository;

  final AuthController _auth;
  final PushRepository _repo;
  final PushTokenSource _source;

  /// `customer` | `courier`.
  final String appName;

  StreamSubscription<String>? _refreshSub;
  String? _registeredToken;
  bool _busy = false;

  void start() {
    _auth.addListener(_onAuthChanged);
    _auth.beforeSignOut = unregister;
    _refreshSub = _source.onTokenRefresh.listen(_register);
    _onAuthChanged();
  }

  void dispose() {
    _auth.removeListener(_onAuthChanged);
    if (_auth.beforeSignOut == unregister) _auth.beforeSignOut = null;
    _refreshSub?.cancel();
  }

  void _onAuthChanged() {
    if (_auth.status == AuthStatus.signedIn) {
      unawaited(_registerCurrent());
    } else {
      _registeredToken = null;
    }
  }

  Future<void> _registerCurrent() async {
    if (_busy || _registeredToken != null) return;
    _busy = true;
    try {
      if (!await _source.requestPermission()) return;
      final token = await _source.getToken();
      if (token != null) await _register(token);
    } catch (_) {
      // Push ixtiyoriy.
    } finally {
      _busy = false;
    }
  }

  Future<void> _register(String token) async {
    if (_auth.status != AuthStatus.signedIn) return;
    // Yuborishdan OLDIN eslab qolinadi: so'rov tugamasdan chiqish
    // boshlansa, [unregister] shu tokenni o'chira olishi kerak.
    _registeredToken = token;
    try {
      await _repo.register(token: token, platform: _source.platform, appName: appName);
    } catch (_) {
      // Keyingi kirishda yoki token yangilanganda qayta uriniladi.
      if (_registeredToken == token) _registeredToken = null;
    }
  }

  /// Chiqishdan oldin chaqiriladi.
  Future<void> unregister() async {
    final token = _registeredToken;
    if (token == null) return;
    _registeredToken = null;
    try {
      await _repo.unregister(token);
    } catch (_) {
      // Server tokenni keyingi kirishda (upsert) baribir to'g'rilaydi.
    }
  }
}
