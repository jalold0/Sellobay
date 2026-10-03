/// Server qaytargan xato.
///
/// Backend javob shakli hamma joyda bir xil:
///   { "success": false, "error": { "code": "...", "message": "..." } }
///
/// `message` — foydalanuvchiga ko'rsatish uchun tayyor o'zbekcha matn,
/// shuning uchun uni o'zimiz qayta yozmaymiz.
class ApiException implements Exception {
  const ApiException({
    required this.code,
    required this.message,
    this.statusCode,
    this.retryAfterSec,
  });

  final String code;
  final String message;
  final int? statusCode;

  /// `Retry-After` sarlavhasidan. HAR DOIM kelmaydi: `enforceRateLimit`
  /// uni qo'yadi, lekin OTP route'idagi "60 soniyada bir marta" tekshiruvi
  /// qo'ymaydi. Shuning uchun nullable — chaqiruvchi o'zi standart qiymat
  /// tanlaydi, biz soxta raqam o'ylab topmaymiz.
  final int? retryAfterSec;

  /// Sessiya tugagan — foydalanuvchini login'ga olib chiqish kerak.
  bool get isUnauthenticated => statusCode == 401;

  /// Chastota cheklovi.
  bool get isRateLimited => statusCode == 429;

  @override
  String toString() => 'ApiException($code, $statusCode): $message';
}

/// Tarmoq yetib bormadi (uzilish, timeout, DNS).
///
/// [ApiException] dan ALOHIDA tur: server javob bermagan paytda
/// foydalanuvchini tizimdan chiqarib yuborish yoki "parol noto'g'ri"
/// deyish xato bo'lardi.
class NetworkException implements Exception {
  const NetworkException([this.detail]);

  final String? detail;

  @override
  String toString() => 'NetworkException(${detail ?? "tarmoq yo'q"})';
}
