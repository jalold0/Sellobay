import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../auth_flow.dart';
import '../home_tabs.dart';
import 'cart_screen.dart';
import 'catalog_screen.dart';
import 'home_screen.dart';
import 'orders_screen.dart';
import 'profile_screen.dart';
import 'track_order_screen.dart';

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
    // Mehmon: buyurtmalar va profil hisobga bog'liq — ular o'rnida
    // kirish taklifi turadi. Katalog va savat hisobsiz ishlaydi.
    final guest = isGuest(AuthScope.of(context));

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
          _page(
            tabs,
            HomeTab.orders,
            () => guest
                ? const _GuestTab(tab: HomeTab.orders)
                : OrdersScreen(key: ValueKey(tabs.ordersEpoch)),
          ),
          _page(
            tabs,
            HomeTab.profile,
            () => guest ? const _GuestTab(tab: HomeTab.profile) : const ProfileScreen(),
          ),
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

/// Hisob talab qiladigan bo'limning mehmon ko'rinishi.
///
/// Sarlavha bo'lim nomi bilan qoladi — pastki paneldagi tanlov va
/// ekran bir-biriga mos kelsin.
class _GuestTab extends StatelessWidget {
  const _GuestTab({required this.tab});

  final HomeTab tab;

  @override
  Widget build(BuildContext context) {
    final orders = tab == HomeTab.orders;
    return Scaffold(
      appBar: AppBar(title: Text(context.t(orders ? 'nav.orders' : 'nav.profile'))),
      body: GuestPrompt(
        icon: orders ? Icons.receipt_long_outlined : Icons.person_outline,
        title: context.t(orders ? 'auth.guest.ordersTitle' : 'auth.guest.profileTitle'),
        message: context.t(orders ? 'auth.guest.ordersHint' : 'auth.guest.profileHint'),
        // Mehmon buyurtmasini raqam va telefon bilan kuzatsa bo'ladi —
        // hisobsiz checkout qilgan odam uchun yagona yo'l.
        secondary: orders
            ? TextButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => const TrackOrderScreen()),
                ),
                child: Text(context.t('nav.trackOrder')),
              )
            : null,
      ),
    );
  }
}
