import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Xizmat va'dalari: tez yetkazish, tekshirib olish, asl tovar, coin.
///
/// Matnlar web bosh sahifasidagi bilan bir xil kalitlardan — ikki
/// joyda ikki xil va'da berilmasin.
class TrustStrip extends StatelessWidget {
  const TrustStrip({super.key});

  @override
  Widget build(BuildContext context) {
    final items = [
      (Icons.local_shipping_outlined, context.t('hero.trustFast')),
      (Icons.fact_check_outlined, context.t('hero.trustReturn')),
      (Icons.verified_outlined, context.t('hero.trustAuthentic')),
      (Icons.toll_outlined, context.t('loyalty.coin')),
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
        decoration: BoxDecoration(
          border: Border.all(color: SellobayColors.border),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final (icon, label) in items)
              Expanded(
                child: Column(
                  children: [
                    Icon(icon, size: 22, color: SellobayColors.primary),
                    const SizedBox(height: 6),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Text(
                        label,
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: SellobayType.caption,
                          height: 1.25,
                          fontWeight: FontWeight.w600,
                          color: SellobayColors.ink,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
