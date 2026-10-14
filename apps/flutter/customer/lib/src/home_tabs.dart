import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Pastki navigatsiyadagi bo'limlar.
enum HomeTab { home, catalog, cart, orders, profile }

/// Qaysi bo'lim ochiqligi.
///
/// `MaterialApp` dan YUQORIDA turadi, shuning uchun uning ustiga surilgan
/// ekranlar ham (mahsulot, checkout, «buyurtma qabul qilindi») bo'limni
/// almashtira oladi. Qobiq ichida saqlasak, surilgan ekran unga
/// yeta olmasdi: u Navigator'ning qo'shnisi, farzandi emas.
class HomeTabsController extends ChangeNotifier {
  HomeTab _tab = HomeTab.home;

  /// Ochilgan bo'limlar.
  ///
  /// `IndexedStack` farzandlarining HAMMASINI darhol quradi. Shunda
  /// ilova ishga tushishi bilan buyurtmalar ro'yxati ham so'ralardi —
  /// foydalanuvchi u bo'limga umuman kirmagan bo'lsa ham.
  final _visited = <HomeTab>{HomeTab.home};

  /// Buyurtmalar bo'limi har ochilganda qaytadan yuklanishi uchun
  /// hisoblagich. Yangi buyurtma bergandan keyin eski ro'yxat turib
  /// qolmasligi kerak.
  int _ordersEpoch = 0;

  /// Katalogga o'tishda qo'llanadigan so'rov (kategoriya, «tanlangan»,
  /// saralash).
  ///
  /// Bosh sahifadagi kategoriya yoki «Barchasini ko'rish» bosilganda
  /// katalog o'sha filtr bilan ochilishi kerak. Katalog ekrani qobiqda
  /// TIRIK qoladi (`IndexedStack`), ya'ni unga parametr uzatib
  /// bo'lmaydi — shuning uchun so'rov shu yerda qoldiriladi, katalog esa
  /// bu controller'ni tinglab, bo'lim ochilganda uni o'zi oladi.
  ProductQuery? _pendingCatalog;

  HomeTab get tab => _tab;
  bool isVisited(HomeTab tab) => _visited.contains(tab);
  int get index => HomeTab.values.indexOf(_tab);
  int get ordersEpoch => _ordersEpoch;

  void go(HomeTab tab) {
    if (tab == HomeTab.orders) _ordersEpoch++;
    final firstVisit = _visited.add(tab);
    if (_tab == tab && !firstVisit && tab != HomeTab.orders) return;
    _tab = tab;
    notifyListeners();
  }

  void goIndex(int index) => go(HomeTab.values[index]);

  /// Katalogni ochadi, xohlasa tayyor filtr bilan.
  ///
  /// [query] berilmasa katalog o'z holatida qoladi (qidiruv, filtr) —
  /// masalan bosh sahifadagi qidiruv qatoridan o'tilganda.
  void openCatalog({ProductQuery? query}) {
    _pendingCatalog = query;
    go(HomeTab.catalog);
  }

  /// Kutayotgan so'rovni OLIB qo'yadi — bir marta qo'llanadi.
  ProductQuery? takePendingCatalog() {
    final query = _pendingCatalog;
    _pendingCatalog = null;
    return query;
  }
}

class HomeTabsScope extends InheritedNotifier<HomeTabsController> {
  const HomeTabsScope({super.key, required HomeTabsController controller, required super.child})
      : super(notifier: controller);

  /// Qobiq ichida bo'lmasa `null` — masalan, savat alohida ekran
  /// sifatida surilgan bo'lsa.
  static HomeTabsController? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<HomeTabsScope>()?.notifier;

  /// Tinglamasdan o'qish — faqat buyruq berish uchun.
  static HomeTabsController? read(BuildContext context) =>
      context.getInheritedWidgetOfExactType<HomeTabsScope>()?.notifier;
}
