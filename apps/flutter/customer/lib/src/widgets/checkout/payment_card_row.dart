import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Qo'lda to'lov uchun platforma kartasi — raqam va nusxalash tugmasi.
///
/// SOF KO'RINISH: holat saqlamaydi, faqat kartani ko'rsatadi va
/// raqamni almashuv buferiga qo'yadi.
class PaymentCardRow extends StatelessWidget {
  const PaymentCardRow({super.key, required this.card});

  final PaymentCard card;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(12, 8, 6, 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(11),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    card.number,
                    // `fontFamily: 'monospace'` ATAYLAB yo'q: Android'da
                    // u platforma shriftiga tushadi, iOS'da esa bunday
                    // oila yo'q va jim e'tiborsiz qoldiriladi. Raqam
                    // guruhlari allaqachon bo'sh joy bilan ajratilgan,
                    // oraliqni kattalashtirish yetarli.
                    style: const TextStyle(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.1,
                      color: SellobayColors.ink,
                    ),
                  ),
                  Text(
                    [card.holder, ?card.bank].join(' - '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11.5, color: SellobayColors.mutedText),
                  ),
                ],
              ),
            ),
            TextButton(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: card.number));
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(context.t('checkout.payment.copied'))),
                );
              },
              child: Text(context.t('checkout.payment.copyCard')),
            ),
          ],
        ),
      );
}
