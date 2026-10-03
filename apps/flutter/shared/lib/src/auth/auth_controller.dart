import 'package:flutter/foundation.dart';

import '../api/api_exception.dart';
import 'auth_repository.dart';
import 'auth_user.dart';

enum AuthStatus {
  /// Hali hal qilinmadi — saqlovdan o'qilmoqda.
  ///
  /// [signedOut] dan ALOHIDA holat bo'lishi shart: aks holda ilova har
  /// sovuq ishga tushganda bir lahzaga login ekranini ko'rsatib, keyin
  /// uni almashtirardi.
  unknown,
  signedOut,
  signedIn,
}

/// Ilova bo'ylab auth holati.
///
/// Hech qanday holat boshqaruvi paketiga bog'liq emas — oddiy
/// [ChangeNotifier]. Ikkala ilova ham `ListenableBuilder` bilan tinglaydi.
class AuthController extends ChangeNotifier {
  AuthController({required AuthRepository repository, this.requiredRole}) : _repo = repository;

  final AuthRepository _repo;

  /// Shart bo'lgan rol (kuryer ilovasida [UserRoles.courier]).
  ///
  /// Mijoz ilovasida `null` — har qanday foydalanuvchi kira oladi.
  final String? requiredRole;

  AuthStatus _status = AuthStatus.unknown;
  AuthUser? _user;
  String? _roleErrorKey;

  AuthStatus get status => _status;
  AuthUser? get user => _user;
  bool get isSignedIn => _status == AuthStatus.signedIn;

  /// Oxirgi kirish rol talabiga tushmagani sababli rad etilgan bo'lsa —
  /// i18n kaliti. Ekran uni ko'rsatib, keyin [clearRoleError] qiladi.
  String? get roleErrorKey => _roleErrorKey;

  /// Ilova ishga tushganda bir marta.
  ///
  /// Avval KESHDAN tiklaydi (ekran darhol to'ladi, internetsiz ham
  /// sessiya saqlanadi), keyin fonda serverdan tasdiqlaydi.
  Future<void> restore() async {
    if (!await _repo.hasStoredSession()) {
      _set(AuthStatus.signedOut, null);
      return;
    }

    final cached = await _repo.cachedUser();
    if (cached != null && _allowed(cached)) {
      _set(AuthStatus.signedIn, cached);
    }

    await _revalidate(hadCache: cached != null);
  }

  /// Serverdan haqiqiy holatni oladi.
  ///
  /// Tarmoq yo'q bo'lsa keshdagi sessiya SAQLANADI — internet yo'qligi
  /// foydalanuvchini chiqarib yuborish uchun sabab emas. Faqat server
  /// "401" desagina sessiya tugatiladi.
  Future<void> _revalidate({required bool hadCache}) async {
    try {
      final fresh = await _repo.me();
      if (!_allowed(fresh)) {
        await _denyRole();
        return;
      }
      await _repo.cacheUser(fresh);
      _set(AuthStatus.signedIn, fresh);
    } on ApiException catch (e) {
      if (e.isUnauthenticated) {
        await _repo.clearLocal();
        _set(AuthStatus.signedOut, null);
      } else if (!hadCache) {
        // Server xatosi (5xx) va ko'rsatadigan keshimiz yo'q.
        _set(AuthStatus.signedOut, null);
      }
    } on NetworkException {
      if (!hadCache) _set(AuthStatus.signedOut, null);
    }
  }

  Future<void> signInWithPassword({
    required String identifier,
    required String password,
  }) async {
    final session = await _repo.loginWithPassword(identifier: identifier, password: password);
    await _establish(session);
  }

  Future<void> signInWithOtp({
    required String phone,
    required String code,
    String? firstName,
  }) async {
    final session = await _repo.verifyOtp(phone: phone, code: code, firstName: firstName);
    await _establish(session);
  }

  /// Ro'yxatdan o'tish.
  ///
  /// Sotuvchi arizasida sessiya BERILMAYDI (`pendingApproval`) — natija
  /// qaytariladi va ekran shunga qarab xabar ko'rsatadi.
  Future<RegisterOutcome> register({
    String? email,
    String? phone,
    required String password,
    String? firstName,
    String? lastName,
    String locale = 'uz',
    bool asSeller = false,
  }) async {
    final outcome = await _repo.register(
      email: email,
      phone: phone,
      password: password,
      firstName: firstName,
      lastName: lastName,
      locale: locale,
      asSeller: asSeller,
    );
    final session = outcome.session;
    if (session != null) await _establish(session);
    return outcome;
  }

  Future<void> signOut() async {
    await _repo.logout();
    _set(AuthStatus.signedOut, null);
  }

  void clearRoleError() {
    if (_roleErrorKey == null) return;
    _roleErrorKey = null;
    notifyListeners();
  }

  /// Tokenlarni saqlaydi va DARHOL `me()` bilan to'liq userni oladi.
  ///
  /// `login`/`otp/verify`/`register` javoblaridagi user ROLSIZ keladi.
  /// Rolni keyinroq, "kerak bo'lganda" olish mumkin emas edi: kuryer
  /// ilovasi mijozni ichkariga kiritib yuborardi. Shuning uchun kirish
  /// oqimi `me()` bilan tugaydi va u yiqilsa kirish ham yiqiladi.
  Future<void> _establish(AuthSession session) async {
    await _repo.persist(session);
    final AuthUser full;
    try {
      full = await _repo.me();
    } catch (_) {
      // Tokenlar saqlangan, lekin kim ekanini bilmaymiz — yarim holat
      // qoldirmaymiz.
      await _repo.clearLocal();
      _set(AuthStatus.signedOut, null);
      rethrow;
    }

    if (!_allowed(full)) {
      await _denyRole();
      return;
    }

    await _repo.cacheUser(full);
    _roleErrorKey = null;
    _set(AuthStatus.signedIn, full);
  }

  bool _allowed(AuthUser user) => requiredRole == null || user.hasRole(requiredRole!);

  /// Rol mos kelmadi: sessiyani SERVERDA ham bekor qilamiz.
  ///
  /// Faqat mahalliy tozalash yetarli emas — mijoz hisobi bilan kuryer
  /// ilovasiga kirishga urinilganda, bazada 30 kunlik yaroqli refresh
  /// token qolib ketardi.
  Future<void> _denyRole() async {
    await _repo.logout();
    _roleErrorKey = 'courier.roleRequired';
    _set(AuthStatus.signedOut, null);
  }

  void _set(AuthStatus status, AuthUser? user) {
    if (_status == status && identical(_user, user)) return;
    _status = status;
    _user = user;
    notifyListeners();
  }
}
