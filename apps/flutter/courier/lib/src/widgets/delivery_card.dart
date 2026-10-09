import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'delivery_status_chip.dart';

/// Ro'yxatdagi bitta topshiriq.
class DeliveryCard extends StatelessWidget {
  const DeliveryCard({
    super.key,
    required this.delivery,
    required this.locale,
    required this.onTap,
    this.onClaim,
  });

  final CourierDelivery delivery;
  final String locale;
  final VoidCallback onTap;

  /// `null` — bu topshiriq allaqachon kuryerniki, "olish" tugmasi yo'q.
  final VoidCallback? onClaim;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          border: Border.all(color: SellobayColors.border),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Qaytarish topshirig'i ro'yxatda DARHOL ajralib
                // tursin: kuryer uni oddiy yetkazish deb o'ylab borsa,
                // mijozdan mahsulot olish o'rniga unga topshirmoqchi
                // bo'lardi.
                if (delivery.isReturn) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: SellobayColors.destructive.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      context.t('courier.returnTask'),
                      style: const TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.3,
                        color: SellobayColors.destructive,
                      ),
                    ),
                  ),
                  const SizedBox(width: 7),
                ],
                Expanded(
                  child: Text(
                    delivery.orderNumber,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: SellobayColors.ink,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                DeliveryStatusChip(
                  status: delivery.status,
                  rawStatus: delivery.rawStatus,
                  claimed: delivery.claimed,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.place_outlined, size: 15, color: SellobayColors.mutedText),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    delivery.destinationAddress,
                    style: const TextStyle(
                      fontSize: 13,
                      height: 1.35,
                      color: SellobayColors.ink,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Text(
                    context.t('tracking.itemCount', params: {'count': delivery.itemCount}),
                    style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
                  ),
                ),
                Flexible(
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerRight,
                    child: Text(
                      formatMoney(delivery.orderTotal),
                      maxLines: 1,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: SellobayColors.ink,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            if (onClaim != null) ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: onClaim,
                  style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(42)),
                  child: Text(context.t('courier.claim')),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
