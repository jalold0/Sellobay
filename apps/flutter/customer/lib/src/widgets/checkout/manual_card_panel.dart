import 'package:decimal/decimal.dart';
import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'payment_card_row.dart';

/// Qo'lda karta to'lovi: summa, kartalar, chek va izoh.
///
/// Ko'rinishi WEB bilan bir xil (`payment-section.tsx`) — mijoz ikki
/// joyda bir xil jarayonni ko'rishi kerak.
///
/// Chek YUKLASH o'zi bu yerda emas: u tarmoq ishi va ekranda qoladi.
/// Vidjet faqat holatni ko'rsatadi va tugma bosilganini xabar qiladi.
class ManualCardPanel extends StatelessWidget {
  const ManualCardPanel({
    super.key,
    required this.cards,
    required this.amount,
    required this.noteController,
    required this.receiptUploaded,
    required this.receiptBusy,
    required this.onPickReceipt,
  });

  /// Platforma kartalari — `/api/payment-cards` dan.
  final List<PaymentCard> cards;

  /// Mijoz o'tkazishi kerak bo'lgan summa.
  ///
  /// TAXMINIY: yakuniy hisobni server buyurtma yaratishda qiladi.
  final Decimal amount;

  final TextEditingController noteController;

  final bool receiptUploaded;
  final bool receiptBusy;
  final VoidCallback onPickReceipt;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(top: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: SellobayColors.primary.withValues(alpha: 0.03),
          border: Border.all(color: SellobayColors.primary.withValues(alpha: 0.30)),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.t('checkout.payment.cardTransferTitle'),
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: SellobayColors.ink,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              context.t('checkout.payment.cardTransferHint'),
              style: const TextStyle(fontSize: 12, height: 1.45, color: SellobayColors.mutedText),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(11),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      context.t('checkout.payment.amountToTransfer'),
                      style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
                    ),
                  ),
                  Text(
                    formatMoney(amount),
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: SellobayColors.ink,
                    ),
                  ),
                ],
              ),
            ),
            for (final card in cards) ...[
              const SizedBox(height: 8),
              PaymentCardRow(card: card),
            ],
            const SizedBox(height: 12),
            _receiptButton(context),
            const SizedBox(height: 10),
            TextField(
              controller: noteController,
              maxLength: 200,
              decoration: InputDecoration(
                labelText: context.t('checkout.payment.receiptNoteLabel'),
                hintText: context.t('checkout.payment.receiptNotePlaceholder'),
                counterText: '',
                fillColor: Colors.white,
              ),
            ),
          ],
        ),
      );

  Widget _receiptButton(BuildContext context) {
    final label = receiptBusy
        ? 'checkout.payment.receiptProcessing'
        : receiptUploaded
            ? 'checkout.payment.receiptUploaded'
            : 'checkout.payment.uploadReceipt';

    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: receiptBusy ? null : onPickReceipt,
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(46),
          backgroundColor: Colors.white,
          foregroundColor: receiptUploaded ? SellobayColors.success : SellobayColors.ink,
          side: BorderSide(
            color: receiptUploaded ? SellobayColors.success : SellobayColors.border,
          ),
        ),
        icon: Icon(
          receiptUploaded ? Icons.check_circle_outline : Icons.receipt_long_outlined,
          size: 18,
        ),
        label: Text(context.t(label)),
      ),
    );
  }
}
