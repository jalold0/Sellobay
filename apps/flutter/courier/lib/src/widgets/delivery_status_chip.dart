import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Yetkazish holati belgisi.
///
/// Server ilova bilmaydigan holat qaytarsa, XOM qiymat ko'rsatiladi —
/// bo'sh joy emas.
class DeliveryStatusChip extends StatelessWidget {
  const DeliveryStatusChip({
    super.key,
    required this.status,
    required this.rawStatus,
    required this.claimed,
  });

  final DeliveryStatus? status;
  final String rawStatus;

  /// Kuryer biriktirilganmi.
  ///
  /// Egasiz topshiriqning holati ham `ASSIGNED` bo'ladi, lekin unga
  /// «Biriktirildi» deb yozib qo'yish mijozni emas, kuryerni
  /// chalg'itadi: u aynan egasiz topshiriqlarni qidirib turadi.
  final bool claimed;

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = _colors(status);
    final label = switch (status) {
      null => rawStatus,
      DeliveryStatus.assigned when !claimed => context.t('courier.unclaimed'),
      final s => context.t(s.labelKey),
    };

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

  (Color, Color) _colors(DeliveryStatus? status) => switch (status) {
        null => (SellobayColors.soft, SellobayColors.mutedText),
        DeliveryStatus.delivered => (
            SellobayColors.success.withValues(alpha: 0.12),
            SellobayColors.success,
          ),
        DeliveryStatus.failed || DeliveryStatus.returned => (
            SellobayColors.destructive.withValues(alpha: 0.10),
            SellobayColors.destructive,
          ),
        _ => (SellobayColors.primary.withValues(alpha: 0.10), SellobayColors.primary),
      };
}
