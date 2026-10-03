import '../api/api_client.dart';
import '../api/api_exception.dart';
import '../utils/uz_phone.dart';
import 'auth_user.dart';

/// Kirish muvaffaqiyatli tugaganda qaytadigan juftlik.
class AuthSession {
  const AuthSession({required this.user, required this.access, required this.refresh});

  /// DIQQAT: bu userda `roles` BO'SH. Rollar faqat `GET /api/auth/me` da bor.
  final AuthUser user;
  final String access;
  final String refresh;
}

/// `POST /api/auth/register` natijasi.
///
/// Ikki xil tugashi mumkin va ular bir-biriga o'xshamaydi:
///   - mijoz    → hisob darhol faol, `session` bor;
///   - sotuvchi → `status: PENDING`, admin tasdiqlagunча SESSIYA YO'Q.
///
/// Server ikkinchi holatda `tokens` ni umuman yubormaydi. Shuning uchun
/// `session` nullable: javobni ko'r-ko'rona o'qiydigan kod shu yerda,
/// kompilyatsiya paytida to'xtaydi.
class RegisterOutcome {
  const RegisterOutcome({required this.user, this.session});

  final AuthUser user;
  final AuthSession? session;

  bool get pendingApproval => session == null;
}

/// `POST /api/auth/otp/send` natijasi.
class OtpChallenge {
  const OtpChallenge({
    required this.phone,
    required this.expiresInSec,
    required this.resendAfterSec,
  });

  /// Normallashtirilgan ko'rinish (`+998901234567`) — tasdiqlashda
  /// AYNAN shu yuborilishi kerak, aks holda server boshqa yozuvni qidiradi.
  final String phone;

  /// Kodning yashash muddati.
  final int expiresInSec;

  /// Keyingi SMS gacha kutish (`OTP_RESEND_COOLDOWN_SEC`).
  ///
  /// Serverdan keladi, klientda YOZILMAGAN: qoidani server qo'llaydi,
  /// shuning uchun raqam ham undan kelishi kerak.
  final int resendAfterSec;
}

/// Auth endpointlari ustidagi yupqa qatlam.
///
/// Faqat HTTP ↔ model o'girish bilan shug'ullanadi; holat saqlamaydi.
/// Holat — [AuthController] da.
class AuthRepository {
  AuthRepository(this._api);

  final ApiClient _api;

  /// Email yoki telefon + parol.
  ///
  /// `identifier` xom holida yuboriladi: server raqamga o'xshasa
  /// `normalizeUzPhone`, aks holda `toLowerCase()` qiladi. Agar biz
  /// bu yerda emailni ham "telefon" deb normallashtirsak, kirish buzilardi.
  Future<AuthSession> loginWithPassword({
    required String identifier,
    required String password,
  }) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/api/auth/login',
      body: {'identifier': identifier.trim(), 'password': password},
    );
    return _sessionFrom(data);
  }

  /// SMS kod so'rash. Telefon E.164 ga keltiriladi (CLAUDE.md qoidasi).
  ///
  /// Server ikki xil 429 beradi: IP bo'yicha (`Retry-After` sarlavhasi
  /// bilan) va telefon bo'yicha "60 soniyada bir marta" (sarlavhasiz).
  /// Ikkalasi ham [ApiException.isRateLimited] bo'lib keladi.
  Future<OtpChallenge> sendOtp(String phoneInput) async {
    final phone = normalizeUzPhone(phoneInput);
    if (phone == null) {
      throw const ApiException(code: 'VALIDATION', message: 'auth.phoneInvalid', statusCode: 400);
    }
    final data = await _api.post<Map<String, dynamic>>(
      '/api/auth/otp/send',
      body: {'phone': phone},
    );
    return OtpChallenge(
      phone: phone,
      expiresInSec: (data['expiresInSec'] as num?)?.toInt() ?? 300,
      resendAfterSec: (data['resendAfterSec'] as num?)?.toInt() ?? 60,
    );
  }

  /// Kodni tasdiqlash.
  ///
  /// Bu endpoint HAM KIRISH, HAM RO'YXATDAN O'TISH: telefon bazada
  /// bo'lmasa, server foydalanuvchini o'zi yaratadi (auto-register).
  /// Shu sababli mijoz ilovasida "telefon bilan ro'yxatdan o'tish"
  /// degan alohida ekran kerak emas.
  Future<AuthSession> verifyOtp({
    required String phone,
    required String code,
    String? firstName,
  }) async {
    final normalized = normalizeUzPhone(phone) ?? phone;
    final data = await _api.post<Map<String, dynamic>>(
      '/api/auth/otp/verify',
      body: _compact({'phone': normalized, 'code': code, 'firstName': firstName}),
    );
    return _sessionFrom(data);
  }

  /// Email/telefon + parol bilan ro'yxatdan o'tish.
  ///
  /// `_compact` MAJBURIY: zod sxemasida maydonlar `.optional()`, ya'ni
  /// ular YO'Q bo'lishi mumkin, lekin `null` BO'LISHI MUMKIN EMAS.
  /// `{"email": null}` yuborilsa server 400 VALIDATION qaytaradi.
  Future<RegisterOutcome> register({
    String? email,
    String? phone,
    required String password,
    String? firstName,
    String? lastName,
    String locale = 'uz',
    bool asSeller = false,
  }) async {
    final normalizedPhone = phone == null || phone.trim().isEmpty ? null : normalizeUzPhone(phone);
    if (phone != null && phone.trim().isNotEmpty && normalizedPhone == null) {
      throw const ApiException(code: 'VALIDATION', message: 'auth.phoneInvalid', statusCode: 400);
    }

    final data = await _api.post<Map<String, dynamic>>(
      '/api/auth/register',
      body: _compact({
        'email': _blankToNull(email),
        'phone': normalizedPhone,
        'password': password,
        'firstName': _blankToNull(firstName),
        'lastName': _blankToNull(lastName),
        'locale': locale,
        'role': asSeller ? 'seller' : 'customer',
      }),
    );

    final user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    final tokens = data['tokens'] as Map<String, dynamic>?;
    if (tokens == null) return RegisterOutcome(user: user);
    return RegisterOutcome(
      user: user,
      session: AuthSession(
        user: user,
        access: tokens['access'] as String,
        refresh: tokens['refresh'] as String,
      ),
    );
  }

  /// Joriy foydalanuvchi — ROLLAR BILAN.
  ///
  /// Access token eskirgan bo'lsa [ApiClient] uni o'zi yangilab, so'rovni
  /// qaytadan yuboradi. Bu yerga 401 yetib kelsa — sessiya haqiqatan tugagan.
  Future<AuthUser> me() async {
    final data = await _api.get<Map<String, dynamic>>('/api/auth/me');
    return AuthUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  /// Serverda bekor qiladi va mahalliy saqlovni tozalaydi.
  Future<void> logout() => _api.logout();

  Future<void> persist(AuthSession session) async {
    await _api.session.save(access: session.access, refresh: session.refresh);
  }

  Future<void> cacheUser(AuthUser user) => _api.session.saveUser(user);

  Future<AuthUser?> cachedUser() => _api.session.readUser();

  Future<bool> hasStoredSession() async {
    final refresh = await _api.session.readRefresh();
    return refresh != null && refresh.isNotEmpty;
  }

  Future<void> clearLocal() => _api.session.clear();

  AuthSession _sessionFrom(Map<String, dynamic> data) {
    final tokens = data['tokens'] as Map<String, dynamic>;
    return AuthSession(
      user: AuthUser.fromJson(data['user'] as Map<String, dynamic>),
      access: tokens['access'] as String,
      refresh: tokens['refresh'] as String,
    );
  }
}

String? _blankToNull(String? value) {
  final trimmed = value?.trim();
  return trimmed == null || trimmed.isEmpty ? null : trimmed;
}

/// `null` qiymatli kalitlarni olib tashlaydi.
Map<String, dynamic> _compact(Map<String, dynamic> input) => <String, dynamic>{
      for (final entry in input.entries)
        if (entry.value != null) entry.key: entry.value,
    };
