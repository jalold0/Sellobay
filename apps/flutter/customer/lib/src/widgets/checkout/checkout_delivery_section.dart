import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Yetkazib berish usulini tanlash va tanlangan punkt.
///
/// Usullar ro'yxati `DeliveryMethod` enumidan — u serverdagi enum
/// bilan bir xil va qo'lda takrorlanmaydi.
class CheckoutDeliverySection extends StatelessWidget {
  const CheckoutDeliverySection({
    super.key,
    required this.method,
    required this.onMethodChanged,
    required this.pickupPoint,
    required this.onChoosePickup,
  });

  final DeliveryMethod method;
  final ValueChanged<DeliveryMethod> onMethodChanged;

  /// Tanlangan punkt — `null` bo'lsa faqat tanlash tugmasi.
  final PickupPoint? pickupPoint;

  final VoidCallback onChoosePickup;

  @override
  Widget build(BuildContext context) => Column(
        children: [
          RadioGroup<DeliveryMethod>(
            groupValue: method,
            onChanged: (value) {
              if (value != null) onMethodChanged(value);
            },
            child: Column(
              children: [
                for (final option in DeliveryMethod.values)
                  RadioListTile<DeliveryMethod>(
                    value: option,
                    contentPadding: EdgeInsets.zero,
                    title: Text(
                      context.t(option.labelKey),
                      style: const TextStyle(fontSize: 14.5),
                    ),
                    subtitle: option.isTashkentOnly
                        ? Text(
                            context.t('checkout.shipping.expressTashkent'),
                            style: const TextStyle(
                              fontSize: 12,
                              color: SellobayColors.mutedText,
                            ),
                          )
                        : null,
                  ),
              ],
            ),
          ),
          if (method == DeliveryMethod.pickupPoint) _pickupPicker(context),
        ],
      );

  /// Punkt tanlash — ro'yxat emas, ALOHIDA EKRAN.
  ///
  /// Ilgari bu `DropdownButton` edi. 8 ta shahardagi 12 ta punkt
  /// ochiluvchi ro'yxatga sig'maydi va mijoz qaysi punkt o'ziga
  /// yaqinligini tushunmasdi: manzil, ish vaqti va mo'ljal
  /// ko'rinmasdi.
  Widget _pickupPicker(BuildContext context) {
    final point = pickupPoint;
    final locale = SellobayRuntimeScope.of(context).locale.locale;

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (point != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: SellobayColors.soft,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    point.name.pick(locale),
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    point.address,
                    style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
                  ),
                  if (point.workingHours != null && point.workingHours!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        point.workingHours!,
                        style: const TextStyle(fontSize: 12, color: SellobayColors.mutedText),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
          OutlinedButton.icon(
            onPressed: onChoosePickup,
            icon: const Icon(Icons.map_outlined, size: 18),
            label: Text(
              context.t(
                point == null ? 'checkout.shipping.selectPickup' : 'pickupPoints.title',
              ),
            ),
          ),
        ],
      ),
    );
  }
}
