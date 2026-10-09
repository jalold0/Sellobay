import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'loyalty_screen.dart';
import 'promo_screen.dart';

/// Hamyon: Sello Coins va promokodlar bitta joyda.
///
/// Ilgari profilda ikki alohida havola edi, ikkalasi ham «mening
/// chegirmalarim» haqida. Endi bitta kirish, ikki tab.
class WalletScreen extends StatelessWidget {
  const WalletScreen({super.key, this.initialTab = 0});

  /// 0 — Sello Coins, 1 — promokodlar.
  final int initialTab;

  @override
  Widget build(BuildContext context) => DefaultTabController(
    length: 2,
    initialIndex: initialTab,
    child: Scaffold(
      appBar: AppBar(
        title: Text(context.t('wallet.title')),
        bottom: TabBar(
          tabs: [
            Tab(text: context.t('loyalty.title')),
            Tab(text: context.t('promo.title')),
          ],
        ),
      ),
      body: const TabBarView(
        children: [
          _KeepAlive(child: LoyaltyScreen(embedded: true)),
          _KeepAlive(child: PromoScreen(embedded: true)),
        ],
      ),
    ),
  );
}

/// Tab almashganda ekran qayta yuklanmasin.
class _KeepAlive extends StatefulWidget {
  const _KeepAlive({required this.child});

  final Widget child;

  @override
  State<_KeepAlive> createState() => _KeepAliveState();
}

class _KeepAliveState extends State<_KeepAlive>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return widget.child;
  }
}
