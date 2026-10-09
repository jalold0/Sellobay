/// Pul formatlash — `packages/utils/src/money.ts` ning nusxasi.
///
/// `NumberFormat` (intl) ATAYLAB ishlatilmaydi: u platformaning ICU
/// ma'lumotiga tayanadi va Android/iOS/web'da ajratgichni boshqacha
/// qo'yishi mumkin. TS tomoni ham aynan shu sababdan qo'lda formatlaydi
/// ("SSR va brauzer ICU farqlariga moyil bo'lmasin").
library;

import 'package:decimal/decimal.dart';

/// Pul DOIM satr sifatida keladi (`Decimal(14,2)` -> `"150000.00"`).
///
/// `double` ga o'tkazmang: 0.1 + 0.2 muammosi hisob-kitobda chiqadi.
/// Ko'rsatish uchun [formatMoney], hisob uchun [Decimal] ishlating.
Decimal parseMoney(Object? value) {
  if (value == null) return Decimal.zero;
  if (value is num) return Decimal.parse(value.toString());
  return Decimal.tryParse(value.toString()) ?? Decimal.zero;
}

String _group(String digits, String separator) {
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(separator);
    buffer.write(digits[i]);
  }
  return buffer.toString();
}

String _fixed(Decimal amount, int fractionDigits, String groupSeparator,
    [String decimalSeparator = '.']) {
  final abs = amount.abs();
  final text = abs.toStringAsFixed(fractionDigits);
  final parts = text.split('.');
  final grouped = _group(parts[0], groupSeparator);
  final sign = amount < Decimal.zero ? '-' : '';
  if (parts.length > 1 && parts[1].isNotEmpty) {
    return '$sign$grouped$decimalSeparator${parts[1]}';
  }
  return '$sign$grouped';
}

/// `150000` -> `150 000 so'm`.
String formatMoney(Object? amount, {String currency = 'UZS'}) {
  final value = amount is Decimal ? amount : parseMoney(amount);
  switch (currency) {
    case 'UZS':
      return "${_fixed(value, 0, ' ')} so'm";
    case 'USD':
      return '\$${_fixed(value, 2, ',')}';
    case 'EUR':
      return '€${_fixed(value, 2, ',')}';
    default:
      return '${_fixed(value, 2, ',')} $currency';
  }
}

/// `150000` -> `150 000` (valyuta belgisiSIZ).
///
/// NEGA KERAK: ba'zi tarjimalar valyutani O'ZI yozadi — masalan
/// `loyalty.worth` = «≈ {som} so'm». Unga `formatMoney` berilsa
/// «so'm so'm» chiqardi.
String formatAmount(Object? amount) {
  final value = amount is Decimal ? amount : parseMoney(amount);
  return _fixed(value, 0, ' ');
}

/// Chegirma foizi. Eski narx yo'q yoki undan arzon bo'lmasa — 0.
int discountPercent(Decimal price, Decimal? oldPrice) {
  if (oldPrice == null || oldPrice <= price || oldPrice == Decimal.zero) return 0;
  final ratio = (price / oldPrice).toDouble();
  return (100 - ratio * 100).round();
}
