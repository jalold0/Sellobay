import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'orders_screen.dart';

/// Buyurtma qabul qilindi.
///
/// Summa SERVER qaytargan `grandTotal` dan ko'rsatiladi, checkout'dagi
/// taxminiy xulosadan emas: yakuniy hisob serverda qayta bajariladi
/// (chegirma, yetkazish, coin) va ikkisi farq qilishi mumkin.
class OrderSuccessScreen extends StatelessWidget {
  const OrderSuccessScreen({super.key, required this.order});

  final PlacedOrder order;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle, size: 64, color: SellobayColors.success),
              const SizedBox(height: 20),
              Text(
                context.t('orderSuccess.title'),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 21,
                  height: 1.3,
                  fontWeight: FontWeight.w700,
                  color: SellobayColors.ink,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                context.t('orderSuccess.subtitle'),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 13.5,
                  height: 1.5,
                  color: SellobayColors.mutedText,
                ),
              ),
              const SizedBox(height: 26),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: SellobayColors.soft,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Column(
                  children: [
                    Text(
                      context.t('orderSuccess.orderNumber'),
                      style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
                    ),
                    const SizedBox(height: 4),
                    SelectableText(
                      order.number,
                      style: const TextStyle(
                        fontSize: 19,
                        fontWeight: FontWeight.w800,
                        color: SellobayColors.ink,
                      ),
                    ),
                    const Divider(height: 22),
                    Text(
                      formatMoney(order.grandTotal),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: SellobayColors.ink,
                      ),
                    ),
                    if (order.coinsEarned > 0) ...[
                      const SizedBox(height: 8),
                      Text(
                        context.t('checkout.coinsEarn', params: {'coins': order.coinsEarned}),
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 12.5, color: SellobayColors.primary),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () {
                    // Avval ildizga (katalog), keyin buyurtmalar — orqaga
                    // bosilganda checkout'ga qaytib qolmasin.
                    Navigator.of(context).popUntil((route) => route.isFirst);
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(builder: (_) => const OrdersScreen()),
                    );
                  },
                  child: Text(context.t('orderSuccess.goToOrders')),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).popUntil((route) => route.isFirst),
                  child: Text(context.t('cart.continueShopping')),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
