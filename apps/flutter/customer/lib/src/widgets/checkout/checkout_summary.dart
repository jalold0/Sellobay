import 'package:decimal/decimal.dart';
import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Checkout xulosasi — mahsulotlar, yetkazish, chegirmalar, jami.
///
/// SOF KO'RINISH: hech narsa hisoblamaydi, barcha qiymatlar tayyor
/// holda beriladi. Shuning uchun uni ekrandan ajratib testlash ham,
/// keyinchalik boshqa joyda ishlatish ham mumkin.
///
/// Ko'rsatilgan summa TAXMINIY — yakuniy hisobni server buyurtma
/// yaratishda qayta qiladi (`orders-server.ts`).
class CheckoutSummary extends StatelessWidget {
  const CheckoutSummary({
    super.key,
    required this.totals,
    this.promoDiscount,
    this.coinDiscount,
  });

  final CartTotals totals;

  /// Promokod chegirmasi — yo'q bo'lsa qator ko'rsatilmaydi.
  final Decimal? promoDiscount;

  /// Sello Coins chegirmasi.
  final Decimal? coinDiscount;

  Decimal get _promo => promoDiscount ?? Decimal.zero;
  Decimal get _coins => coinDiscount ?? Decimal.zero;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: SellobayColors.soft,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          children: [
            CheckoutSummaryRow(
              label: context.t('checkout.summaryItems'),
              value: formatMoney(totals.subtotal),
            ),
            if (totals.shippingFee != null)
              CheckoutSummaryRow(
                label: context.t('checkout.summaryShipping'),
                value: totals.isFreeShipping
                    ? context.t('checkout.shipping.free')
                    : formatMoney(totals.shippingFee),
              ),
            if (_promo > Decimal.zero)
              CheckoutSummaryRow(
                label: context.t('checkout.promoDiscount'),
                value: '−${formatMoney(_promo)}',
              ),
            if (_coins > Decimal.zero)
              CheckoutSummaryRow(
                label: context.t('checkout.coinDiscount'),
                value: '−${formatMoney(_coins)}',
              ),
            const Divider(height: 18),
            CheckoutSummaryRow(
              label: context.t('checkout.summaryTotal'),
              value: formatMoney(totals.total - _promo - _coins),
              bold: true,
            ),
            const SizedBox(height: 6),
            Text(
              context.t('checkout.sslNote'),
              style: const TextStyle(fontSize: 11, color: SellobayColors.mutedText),
            ),
          ],
        ),
      );
}

/// Xulosadagi bitta qator.
class CheckoutSummaryRow extends StatelessWidget {
  const CheckoutSummaryRow({
    super.key,
    required this.label,
    required this.value,
    this.bold = false,
  });

  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          children: [
            // Yorliq ham, qiymat ham SIQILADI: ikkalasi qat'iy bo'lsa,
            // uzunroq matn (masalan «Sello Coins chegirmasi» + yetti
            // xonali summa) qatorni toshirib yuborardi — tor ekranda
            // yoki matn kattalashtirilganda.
            Expanded(
              child: Text(
                label,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: bold ? 15 : 13.5,
                  fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
                  color: bold ? SellobayColors.ink : SellobayColors.mutedText,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Flexible(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerRight,
                child: Text(
                  value,
                  maxLines: 1,
                  style: TextStyle(
                    fontSize: bold ? 17 : 13.5,
                    fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
                    color: SellobayColors.ink,
                  ),
                ),
              ),
            ),
          ],
        ),
      );
}
