import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../screens/cart_screen.dart';

/// Savat belgisi — ustida DONALAR soni.
///
/// Son mahalliy savatdan o'qiladi, ya'ni tizimga kirmasdan ham to'g'ri
/// ko'rinadi (mehmon xaridi).
class CartButton extends StatelessWidget {
  const CartButton({super.key});

  @override
  Widget build(BuildContext context) {
    final count = CartScope.of(context).unitCount;

    return IconButton(
      tooltip: context.t('cart.title'),
      onPressed: () => Navigator.of(context).push(
        MaterialPageRoute<void>(builder: (_) => const CartScreen()),
      ),
      icon: Stack(
        clipBehavior: Clip.none,
        children: [
          const Icon(Icons.shopping_bag_outlined),
          if (count > 0)
            Positioned(
              right: -6,
              top: -4,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                constraints: const BoxConstraints(minWidth: 17),
                decoration: const BoxDecoration(
                  color: SellobayColors.primary,
                  borderRadius: BorderRadius.all(Radius.circular(9)),
                ),
                child: Text(
                  // 99 dan oshsa belgi kengayib ketmasin.
                  count > 99 ? '99+' : '$count',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 10.5,
                    height: 1.3,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
