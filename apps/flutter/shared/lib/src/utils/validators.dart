/// Forma tekshiruvlari — serverdagi zod sxemalarining nusxasi
/// (`apps/web/src/lib/auth/validators.ts`).
///
/// Qaytariladigan qiymat — xato MATNI emas, i18n KALITI. Shunda matn
/// bitta joyda (`packages/i18n`) turadi va uch tilda bir vaqtda o'zgaradi.
library;

final RegExp _hasLetter = RegExp('[A-Za-z]');
final RegExp _hasDigit = RegExp(r'\d');

/// Parol qoidasi: kamida 8 belgi, kamida bitta harf va bitta raqam.
/// Mos bo'lsa `null`.
String? passwordIssueKey(String value) {
  if (value.length < 8) return 'auth.passwordHint';
  if (!_hasLetter.hasMatch(value)) return 'auth.passwordHint';
  if (!_hasDigit.hasMatch(value)) return 'auth.passwordHint';
  return null;
}

/// OTP kodi — roppa-rosa 6 ta raqam (`otpVerifySchema`).
///
/// `auth.codeInvalid` "4–6 raqamli kod" deydi, lekin server 6 tadan
/// boshqasini qabul qilmaydi. Matn emas, server haqiqat manbai.
String? otpCodeIssueKey(String value) =>
    RegExp(r'^\d{6}$').hasMatch(value) ? null : 'auth.codeInvalid';

/// Email — zod `.email()` ga yaqin, lekin undan QAT'IYROQ EMAS:
/// mijoz serverdan ko'ra ko'proq narsani rad etmasligi kerak.
String? emailIssueKey(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty || !trimmed.contains('@')) return 'auth.emailPlaceholder';
  final parts = trimmed.split('@');
  if (parts.length != 2 || parts[0].isEmpty) return 'auth.emailPlaceholder';
  if (!parts[1].contains('.') || parts[1].startsWith('.') || parts[1].endsWith('.')) {
    return 'auth.emailPlaceholder';
  }
  return null;
}
