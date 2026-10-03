import 'dart:async';
import 'dart:convert';

import 'package:decimal/decimal.dart';
import 'package:flutter/foundation.dart';

import 'cart_line.dart';
import 'cart_storage.dart';

/// Mahalliy savat.
///
/// Savat tizimga KIRMASDAN ham ishlaydi — mehmon xaridi qo'llab-quvvatlanadi
/// (qarang docs/FLUTTER-MIGRATION.md). Server bilan sinxron alohida
/// qatlamda ([CartSync]): bu sinf tarmoqni umuman bilmaydi.
class CartStore extends ChangeNotifier {
  CartStore({CartStorage? storage}) : _storage = storage ?? PrefsCartStorage();

  final CartStorage _storage;

  List<CartLine> _lines = const [];

  List<CartLine> get lines => List.unmodifiable(_lines);

  bool get isEmpty => _lines.isEmpty;

  /// Satrlar soni (turli mahsulotlar).
  int get lineCount => _lines.length;

  /// Donalar soni — savat belgisidagi raqam.
  int get unitCount => _lines.fold(0, (sum, line) => sum + line.quantity);

  Decimal get subtotal => _lines.fold(Decimal.zero, (sum, line) => sum + line.lineTotal);

  Future<void> load() async {
    final raw = await _storage.read();
    if (raw == null || raw.isEmpty) return;
    try {
      final decoded = json.decode(raw) as List<dynamic>;
      _lines = decoded.cast<Map<String, dynamic>>().map(CartLine.fromJson).toList();
      notifyListeners();
    } on FormatException {
      // Buzilgan yozuv savatni ishdan chiqarmasin — tashlab yuboramiz.
      await _storage.clear();
    }
  }

  /// Qo'shish. Shunday satr allaqachon bo'lsa, soni ORTADI.
  void add(CartLine line) {
    final index = _lines.indexWhere((l) => l.key == line.key);
    if (index == -1) {
      _commit([..._lines, line]);
      return;
    }
    final existing = _lines[index];
    final next = [..._lines];
    next[index] = existing.copyWith(quantity: existing.quantity + line.quantity);
    _commit(next);
  }

  /// Sonni belgilash. `0` yoki undan kichik bo'lsa satr o'chiriladi.
  void setQuantity(String key, int quantity) {
    if (quantity <= 0) {
      remove(key);
      return;
    }
    final index = _lines.indexWhere((l) => l.key == key);
    if (index == -1) return;
    final next = [..._lines];
    // Server bitta satrda ko'pi bilan 999 ta qabul qiladi
    // (`z.number().int().positive().max(999)`).
    next[index] = _lines[index].copyWith(quantity: quantity.clamp(1, 999));
    _commit(next);
  }

  void remove(String key) => _commit(_lines.where((l) => l.key != key).toList());

  void clear() => _commit(const []);

  /// Sinxrondan kelgan ro'yxatni to'liq o'rnatadi.
  ///
  /// [CartSync] ishlatadi; ekranlar emas.
  void replaceAll(List<CartLine> lines) => _commit(lines);

  void _commit(List<CartLine> next) {
    _lines = next;
    unawaited(_persist());
    notifyListeners();
  }

  Future<void> _persist() =>
      _storage.write(json.encode(_lines.map((l) => l.toJson()).toList()));
}
