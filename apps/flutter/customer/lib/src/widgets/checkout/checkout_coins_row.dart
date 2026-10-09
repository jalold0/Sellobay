import 'package:decimal/decimal.dart';
import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Sello Coins bilan to'lash kaliti.
///
/// BITTA kalit, web'dagi kabi (`checkout-flow.tsx`): mumkin bo'lgan
/// hammasi ishlatiladi. Qisman yechish serverda ham, web'da ham yo'q
/// — ilovada qo'shsak, uchinchi xil xulq paydo bo'lardi.
///
/// Nechta coin ishlatish mumkinligini CHAQIRUVCHI hisoblaydi: unda
/// savat jami va serverdan kelgan kurs bor.
class CheckoutCoinsRow extends StatelessWidget {
  const CheckoutCoinsRow({
    super.key,
    required this.redeemable,
    required this.valueSom,
    required this.enabled,
    required this.onChanged,
  });

  /// Ishlatish mumkin bo'lgan coin.
  final int redeemable;

  /// Shuncha coin necha so'mga teng.
  final Decimal valueSom;

  final bool enabled;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    // Ishlatadigan coin yo'q bo'lsa bo'lim UMUMAN ko'rsatilmaydi:
    // nolga teng kalitni bosib ko'rgan mijoz nima bo'lmaganini
    // tushunmasdi.
    if (redeemable <= 0) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: SwitchListTile(
        value: enabled,
        onChanged: onChanged,
        contentPadding: EdgeInsets.zero,
        title: Text(
          context.t('checkout.useCoinsTitle'),
          style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          context.t(
            'checkout.useCoinsAvail',
            params: {'coins': redeemable, 'som': formatMoney(valueSom)},
          ),
          style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
        ),
      ),
    );
  }
}
