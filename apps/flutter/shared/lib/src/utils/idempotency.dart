import 'dart:math';

/// Tasodifiy UUID v4.
///
/// `Idempotency-Key` uchun. Alohida paket qo'shilmadi: bu yagona ehtiyoj
/// va u 20 qatorga sig'adi.
///
/// [Random.secure] ishlatiladi — oddiy `Random()` bir xil urug'dan
/// boshlangan ikki ilovada bir xil ketma-ketlik beradi va kalitlar
/// to'qnashishi mumkin.
String generateUuidV4([Random? random]) {
  final rnd = random ?? Random.secure();
  final bytes = List<int>.generate(16, (_) => rnd.nextInt(256));

  // Versiya (4) va variant (RFC 4122) bitlari.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  String hex(int start, int end) =>
      bytes.sublist(start, end).map((b) => b.toRadixString(16).padLeft(2, '0')).join();

  return '${hex(0, 4)}-${hex(4, 6)}-${hex(6, 8)}-${hex(8, 10)}-${hex(10, 16)}';
}
