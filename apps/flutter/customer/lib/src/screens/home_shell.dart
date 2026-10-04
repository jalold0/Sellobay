import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../home_tabs.dart';
import 'cart_screen.dart';
import 'catalog_screen.dart';
import 'home_screen.dart';
import 'orders_screen.dart';
import 'profile_screen.dart';

/// Ilovaning ildiz qobig'i — pastki navigatsiya.
///
/// Ilgari hamma yo'l katalog AppBar'idagi belgilardan o'tardi: savat,
/// buyurtmalar va chiqish o'sha yerda edi, profil esa umuman yo'q edi.
/// Mahsulot sahifasiga kirib ketgan foydalanuvchi ularning birortasiga
/// ortga qaytmasdan yeta olmasdi.
class HomeShell extends StatelessWidget {
  const HomeShell({super.key});

  /// Ochilmagan bo'lim qurilmaydi — qarang `HomeTabsController._visited`.
  static Widget _page(HomeTabsController tabs, HomeTab tab, Widget Function() build) =>
      tabs.isVisited(tab) ? build() : const SizedBox.shrink();

  @override
  Widget build(BuildContext context) {
    final cartCount = CartScope.of(context).unitCount;
    final tabs = HomeTabsScope.maybeOf(context)!;

    return Scaffold(
      // `IndexedStack` — bo'lim almashganda katalog qayta yuklanmasin
      // va qidiruv/filtr holati saqlanib qolsin.
      body: IndexedStack(
        index: tabs.index,
        children: [
          const HomeScreen(),
          _page(tabs, HomeTab.catalog, () => const CatalogScreen()),
          _page(tabs, HomeTab.cart, () => const CartScreen()),
          // Kalit har safar o'zgaradi: buyurtma bergandan keyin eski
          // ro'yxat turib qolmasligi uchun ekran qaytadan quriladi.
          _page(tabs, HomeTab.orders, () => OrdersScreen(key: ValueKey(tabs.ordersEpoch))),
          _page(tabs, HomeTab.profile, () => const ProfileScreen()),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tabs.index,
        onDestinationSelected: tabs.goIndex,
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.home_outlined),
            selectedIcon: const Icon(Icons.home),
            label: context.t('nav.home'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.grid_view_outlined),
            selectedIcon: const Icon(Icons.grid_view),
            label: context.t('nav.catalog'),
          ),
          NavigationDestination(
            icon: Badge(
              // Mehmon savati ham mahalliy saqlanadi, shuning uchun son
              // tizimga kirmasdan ham to'g'ri.
              isLabelVisible: cartCount > 0,
              label: Text(cartCount > 99 ? '99+' : '$cartCount'),
              child: const Icon(Icons.shopping_bag_outlined),
            ),
            selectedIcon: Badge(
              isLabelVisible: cartCount > 0,
              label: Text(cartCount > 99 ? '99+' : '$cartCount'),
              child: const Icon(Icons.shopping_bag),
            ),
            label: context.t('nav.cart'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.receipt_long_outlined),
            selectedIcon: const Icon(Icons.receipt_long),
            label: context.t('nav.orders'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.person_outline),
            selectedIcon: const Icon(Icons.person),
            label: context.t('nav.profile'),
          ),
        ],
      ),
    );
  }
}
