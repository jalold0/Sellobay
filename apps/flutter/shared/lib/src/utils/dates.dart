/// Sana formatlash — `apps/web/src/lib/format.ts` dagi `formatDate` nusxasi.
///
/// `intl` paketi ATAYLAB ishlatilmaydi: u platformaning ICU ma'lumotiga
/// tayanadi va Android/iOS/web'da boshqacha chiqishi mumkin. TS tomoni
/// ham aynan shu sababdan oy nomlarini qo'lda yozgan.
///
/// DIQQAT: oy nomlari FAQAT o'zbekcha — web ham shunday qiladi. Ya'ni
/// ruscha interfeysda ham "03 okt, 2026" ko'rinadi. Bu nuqson, lekin
/// ikkala klientda BIR XIL: tuzatiladigan bo'lsa, oy nomlari
/// `packages/i18n` ga ko'chirilib, ikkala tomon birga o'zgartiriladi.
library;

const _monthsShort = [
  'yan',
  'fev',
  'mar',
  'apr',
  'may',
  'iyn',
  'iyl',
  'avg',
  'sen',
  'okt',
  'noy',
  'dek',
];

String _pad2(int n) => n.toString().padLeft(2, '0');

/// `03 okt, 2026`.
///
/// Vaqt QURILMA mintaqasida ko'rsatiladi (bazada UTC). O'zbekistonda
/// bu Asia/Tashkent bo'ladi — web ham xuddi shunday ishlaydi.
String formatOrderDate(DateTime value) {
  final d = value.toLocal();
  return '${_pad2(d.day)} ${_monthsShort[d.month - 1]}, ${d.year}';
}

/// `03 okt, 2026 14:05`.
String formatOrderDateTime(DateTime value) {
  final d = value.toLocal();
  return '${formatOrderDate(value)} ${_pad2(d.hour)}:${_pad2(d.minute)}';
}
