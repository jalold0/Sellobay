import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Buyurtma holati belgisi.
///
/// Matn `packages/i18n` dan (`order.status.*`). Server ilova bilmaydigan
/// yangi holat qo'shsa, XOM qiymat ko'rsatiladi — bo'sh joy yoki
/// "noma'lum" emas: mijoz hech bo'lmasa nimadir ko'rsin va biz bu
/// holatni log'da emas, ekranda sezaylik.
class OrderStatusChip extends StatelessWidget {
  const OrderStatusChip({super.key, required this.status, required this.rawStatus});

  final OrderStatus? status;
  final String rawStatus;

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = _colors(status);
    final label = status == null ? rawStatus : context.t(status!.labelKey);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: const BorderRadius.all(Radius.circular(8)),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: foreground),
      ),
    );
  }

  (Color, Color) _colors(OrderStatus? status) {
    if (status == null) {
      return (SellobayColors.soft, SellobayColors.mutedText);
    }
    if (status.isDelivered) {
      return (SellobayColors.success.withValues(alpha: 0.12), SellobayColors.success);
    }
    if (status.isClosed) {
      return (SellobayColors.destructive.withValues(alpha: 0.10), SellobayColors.destructive);
    }
    return (SellobayColors.primary.withValues(alpha: 0.10), SellobayColors.primary);
  }
}
