/// O'zbekiston telefon raqami bilan ishlash.
///
/// Bu `packages/utils/src/phone.ts` (`@ecom/utils`) ning AYNAN nusxasi.
/// CLAUDE.md qoidasi: telefon serverga faqat E.164 (`+998XXXXXXXXX`)
/// ko'rinishida yuboriladi. Server ham o'z tomonidan normallashtiradi —
/// bu yerdagisi foydalanuvchi tugmani bosmasdan oldin xatoni ko'rishi uchun.
library;

final RegExp _uzPhone = RegExp(r'^\+998(\d{2})(\d{3})(\d{2})(\d{2})$');
final RegExp _nonDigit = RegExp(r'[^\d]');

/// Kiritmani `+998XXXXXXXXX` ga keltiradi, imkonsiz bo'lsa `null`.
///
/// Uchinchi shart (13 raqam) TS manbasidan aynan ko'chirildi. U amalda
/// `isValidUzPhone` dan o'tmaydi, chunki regex +998 dan keyin roppa-rosa
/// 9 ta raqam talab qiladi. Ataylab "tuzatilmadi": ikki tilda bir xil
/// xulq bo'lishi, mijoz va server bir xil qarorga kelishi muhimroq.
String? normalizeUzPhone(String input) {
  final digits = input.replaceAll(_nonDigit, '');
  if (digits.length == 9) return '+998$digits';
  if (digits.length == 12 && digits.startsWith('998')) return '+$digits';
  if (digits.length == 13 && input.startsWith('+998')) return input;
  return null;
}

bool isValidUzPhone(String input) {
  final normalized = normalizeUzPhone(input);
  return normalized != null && _uzPhone.hasMatch(normalized);
}

/// Ko'rsatish uchun: `+998 90 123 45 67`.
String? formatUzPhone(String input) {
  final normalized = normalizeUzPhone(input);
  if (normalized == null) return null;
  final match = _uzPhone.firstMatch(normalized);
  if (match == null) return null;
  return '+998 ${match[1]} ${match[2]} ${match[3]} ${match[4]}';
}
