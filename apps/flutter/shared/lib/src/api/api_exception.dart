/// Server qaytargan xato.
///
/// Backend javob shakli hamma joyda bir xil:
///   { "success": false, "error": { "code": "...", "message": "..." } }
///
/// `message` — foydalanuvchiga ko'rsatish uchun tayyor o'zbekcha matn,
/// shuning uchun uni o'zimiz qayta yozmaymiz.
class ApiException implements Exception {
  const ApiException({required this.code, required this.message, this.statusCode});

  final String code;
  final String message;
  final int? statusCode;

  /// Sessiya tugagan — foydalanuvchini login'ga olib chiqish kerak.
  bool get isUnauthenticated => statusCode == 401;

  /// Chastota cheklovi.
  bool get isRateLimited => statusCode == 429;

  @override
  String toString() => 'ApiException($code, $statusCode): $message';
}
