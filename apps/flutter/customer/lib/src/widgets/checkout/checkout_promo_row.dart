import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Promokod kiritish qatori va server javobi.
///
/// Kodni SERVER tekshiradi (`POST /api/promo/validate`) — vidjet
/// natijani faqat ko'rsatadi. Chegirmani klientda hisoblamaymiz:
/// qoida (eng kam summa, maksimal chegirma, muddat) serverda va
/// ikkinchi nusxa vaqt o'tib undan uzoqlashardi.
class CheckoutPromoRow extends StatelessWidget {
  const CheckoutPromoRow({
    super.key,
    required this.controller,
    required this.onApply,
    required this.checking,
    this.result,
  });

  final TextEditingController controller;
  final VoidCallback onApply;

  /// So'rov ketyapti — tugma o'chiriladi.
  final bool checking;

  /// Serverning javobi. `null` — hali tekshirilmagan.
  final PromoPreview? result;

  @override
  Widget build(BuildContext context) {
    final promo = result;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                textCapitalization: TextCapitalization.characters,
                decoration: InputDecoration(hintText: context.t('cart.promoPlaceholder')),
              ),
            ),
            const SizedBox(width: 10),
            OutlinedButton(
              onPressed: checking ? null : onApply,
              style: OutlinedButton.styleFrom(minimumSize: const Size(96, 52)),
              child: Text(
                checking ? context.t('cart.promoChecking') : context.t('cart.promoApply'),
              ),
            ),
          ],
        ),
        if (promo != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              // Yaroqsiz kodda SERVERNING sababi ko'rsatiladi —
              // «eng kam summa yetmadi» va «muddati tugagan» mijoz
              // uchun boshqa-boshqa narsa.
              promo.valid
                  ? context.t('checkout.promoAppliedChip', params: {'code': promo.code ?? ''})
                  : promo.message ?? context.t('cart.promoInvalid'),
              style: TextStyle(
                fontSize: 12.5,
                color: promo.valid ? SellobayColors.success : SellobayColors.destructive,
              ),
            ),
          ),
      ],
    );
  }
}
