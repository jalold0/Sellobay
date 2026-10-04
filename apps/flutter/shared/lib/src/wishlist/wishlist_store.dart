import 'package:flutter/foundation.dart';

import '../auth/auth_controller.dart';
import 'wishlist_repository.dart';

/// Sevimlilar ro'yxati — faqat ID'lar.
///
/// Mahalliy saqlov YO'Q, savatdan farqli. Sabab: sevimlilar serverda
/// turadi va ilova baribir tizimga kirishni talab qiladi
/// (`AuthGate`). Mehmon uchun ikkinchi, sinxronlanadigan nusxa
/// yaratish — hozircha hech kim ishlatmaydigan murakkablik.
class WishlistStore extends ChangeNotifier {
  /// Maydonlar ochiq — `CartSync` dagi kabi: ularni testda tekshirish
  /// va ilova ichida qayta ishlatish mumkin.
  WishlistStore({required this.repository, required this.auth}) {
    auth.addListener(_onAuthChanged);
    if (auth.isSignedIn) unawaitedLoad();
  }

  final WishlistRepository repository;
  final AuthController auth;

  final _ids = <String>{};

  /// Hali bir marta ham yuklanmagan bo'lsa `false` — ekran bo'sh
  /// holatni ko'rsatishdan oldin shuni tekshiradi.
  bool _loaded = false;

  /// Uchayotgan yuklash.
  ///
  /// Kirish hodisasi ham, ekran ham bir vaqtda `load()` chaqirishi
  /// mumkin. Ilgari ikkinchisi JIM qaytib ketardi va chaqiruvchi
  /// yuklash tugadi deb o'ylardi — `ApiClient._refreshOnce` dagi kabi
  /// bitta future qaytaramiz.
  Future<void>? _inFlight;

  Set<String> get ids => Set.unmodifiable(_ids);
  bool get isLoaded => _loaded;
  bool get isLoading => _inFlight != null;
  int get count => _ids.length;

  bool contains(String productId) => _ids.contains(productId);

  @override
  void dispose() {
    auth.removeListener(_onAuthChanged);
    super.dispose();
  }

  void _onAuthChanged() {
    if (auth.isSignedIn) {
      unawaitedLoad();
    } else {
      // Chiqilganda ro'yxat qoldirilmaydi: keyingi foydalanuvchi
      // birovning sevimlilarini ko'rib qolardi.
      _ids.clear();
      _loaded = false;
      notifyListeners();
    }
  }

  /// Xatoni yutadi — belgilar shunchaki bo'sh ko'rinadi.
  void unawaitedLoad() {
    load().catchError((Object _) {});
  }

  Future<void> load() => _inFlight ??= _load().whenComplete(() {
        _inFlight = null;
        notifyListeners();
      });

  Future<void> _load() async {
    notifyListeners();
    final ids = await repository.fetchIds();
    _ids
      ..clear()
      ..addAll(ids);
    _loaded = true;
  }

  /// Qo'shadi yoki olib tashlaydi.
  ///
  /// Belgi DARHOL o'zgaradi, so'rov esa keyin ketadi. Xato bo'lsa
  /// holat ORQAGA qaytariladi va xato yuqoriga uzatiladi: aks holda
  /// foydalanuvchi saqlanmagan narsani saqlangan deb o'ylardi.
  Future<void> toggle(String productId) async {
    final wasInList = _ids.contains(productId);
    if (wasInList) {
      _ids.remove(productId);
    } else {
      _ids.add(productId);
    }
    notifyListeners();

    try {
      if (wasInList) {
        await repository.remove(productId);
      } else {
        await repository.add(productId);
      }
    } catch (_) {
      if (wasInList) {
        _ids.add(productId);
      } else {
        _ids.remove(productId);
      }
      notifyListeners();
      rethrow;
    }
  }
}
