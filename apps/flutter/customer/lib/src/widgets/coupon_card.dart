import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Ro'yxatdagi bitta promokod.
///
/// Alohida fayl: kartochka ko'rinishi ekrandan mustaqil va keyin
/// checkout'da ham ishlatilishi mumkin.
class CouponCard extends StatelessWidget {
  const CouponCard({super.key, required this.coupon});

  final UserCoupon coupon;

  /// Holat rangi. Faol — yashil, qolgani kulrang.
  ///
  /// «Muddati tugagan» ni qizil qilmaymiz: bu xato emas, oddiy
  /// holat va qizil rang mijozni behuda tashvishga solardi.
  Color _statusColor() => coupon.isUsable ? SellobayColors.success : SellobayColors.mutedText;

  /// Chegirma tavsifi — TUR bo'yicha.
  String _description(BuildContext context) => switch (coupon.type) {
        'PERCENT' => context.t('promo.descPercent', params: {'value': _trim(coupon.value)}),
        'FIXED' => context.t('promo.descFixed', params: {'value': formatAmount(coupon.value)}),
        'FREE_SHIPPING' => context.t('promo.descFreeShip'),
        // Noma'lum tur — xom ko'rsatiladi, jim bo'sh satr emas.
        _ => coupon.type,
      };

  /// `10.0` -> `10`, `12.5` -> `12.5`.
  static String _trim(double v) =>
      v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toString();

  @override
  Widget build(BuildContext context) {
    final color = _statusColor();

    return Container(
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
              Expanded(
                child: Text(
                  coupon.code,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.3,
                    color: coupon.isUsable ? SellobayColors.ink : SellobayColors.mutedText,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  // Holatni SERVER hisoblaydi — klient muddat va
                  // bayroqlardan o'zi chiqarmaydi.
                  context.t('promo.status.${coupon.status}'),
                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: color),
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          Text(
            [
              _description(context),
              if (coupon.minOrderTotal != null)
                context.t('promo.minOrder', params: {
                  'amount': formatAmount(coupon.minOrderTotal),
                }),
            ].join(' · '),
            style: const TextStyle(fontSize: 13, height: 1.4, color: SellobayColors.ink),
          ),
          const SizedBox(height: 7),
          Row(
            children: [
              const Icon(Icons.schedule, size: 13, color: SellobayColors.mutedText),
              const SizedBox(width: 5),
              // `Expanded` SHART: «01 yan, 2027 gacha amal qiladi»
              // tor ekranda qatorga sig'may, toshib ketardi.
              Expanded(
                child: Text(
                  coupon.endsAt == null
                      ? context.t('promo.noExpiry')
                      : context.t('promo.validUntil', params: {
                          'date': formatOrderDate(coupon.endsAt!),
                        }),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: SellobayColors.mutedText),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
