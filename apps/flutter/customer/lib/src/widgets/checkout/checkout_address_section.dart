import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Saqlangan manzillar — bir bosishda formani to'ldiradi.
class CheckoutSavedAddresses extends StatelessWidget {
  const CheckoutSavedAddresses({
    super.key,
    required this.addresses,
    required this.onPick,
  });

  final List<SavedAddress> addresses;
  final ValueChanged<SavedAddress> onPick;

  @override
  Widget build(BuildContext context) => Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final address in addresses)
            ActionChip(
              key: ValueKey(address.id),
              // Yorliq bo'sh bo'lsa shahar ko'rsatiladi: «Uy»,
              // «Ish» kabi nom ixtiyoriy va ko'pincha yozilmaydi.
              label: Text(
                address.label?.isNotEmpty == true ? address.label! : address.city,
              ),
              onPressed: () => onPick(address),
              backgroundColor: SellobayColors.soft,
              side: const BorderSide(color: SellobayColors.border),
            ),
        ],
      );
}

/// Manzil formasidagi maydonlar — xato va fokus shu kalitlar bilan.
enum CheckoutField { name, phone, region, city, street, apartment, notes }

/// Yetkazish manzili formasi.
///
/// Kontrollerlar va fokus tugunlari TASHQARIDAN beriladi: ularning umri
/// ekranga tegishli, ma'lumot buyurtma yuborishda o'sha yerdan o'qiladi
/// va xato bo'lsa ekran birinchi noto'g'ri maydonga fokus beradi.
class CheckoutAddressForm extends StatelessWidget {
  const CheckoutAddressForm({
    super.key,
    required this.controllers,
    required this.focusNodes,
    this.errors = const {},
    this.onChanged,
    this.onRegionChanged,
  });

  final Map<CheckoutField, TextEditingController> controllers;
  final Map<CheckoutField, FocusNode> focusNodes;

  /// Maydon ostida ko'rinadigan xatolar. Umumiy chiziq emas: uzun
  /// sahifaning tepasidagi chiziqni pastdagi tugmani bosgan odam
  /// ko'rmasdi.
  final Map<CheckoutField, String> errors;

  /// Maydon o'zgardi — ekran uning xatosini olib tashlaydi.
  final ValueChanged<CheckoutField>? onChanged;

  /// Viloyat o'zgarsa punktlar ro'yxati eskiradi — ekran uni
  /// tozalaydi.
  final VoidCallback? onRegionChanged;

  @override
  Widget build(BuildContext context) => AutofillGroup(
        child: Column(
          children: [
            _field(
              context,
              CheckoutField.name,
              'firstName',
              capitalize: TextCapitalization.words,
              autofill: AutofillHints.name,
            ),
            _field(
              context,
              CheckoutField.phone,
              'phone',
              keyboard: TextInputType.phone,
              hint: true,
              autofill: AutofillHints.telephoneNumber,
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: _field(
                    context,
                    CheckoutField.region,
                    'region',
                    // Maslahat — misol, qiymat EMAS: bo'sh qoldirilsa
                    // server o'z standartini qo'llaydi.
                    hint: true,
                    bottom: 0,
                    autofill: AutofillHints.addressState,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _field(
                    context,
                    CheckoutField.city,
                    'city',
                    hint: true,
                    bottom: 0,
                    autofill: AutofillHints.addressCity,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _field(
              context,
              CheckoutField.street,
              'street',
              hint: true,
              autofill: AutofillHints.streetAddressLine1,
            ),
            _field(
              context,
              CheckoutField.apartment,
              'apartment',
              hint: true,
              autofill: AutofillHints.streetAddressLine2,
            ),
            _field(context, CheckoutField.notes, 'notes', hint: true, maxLines: 2, bottom: 0),
          ],
        ),
      );

  Widget _field(
    BuildContext context,
    CheckoutField field,
    String key, {
    TextInputType? keyboard,
    TextCapitalization capitalize = TextCapitalization.none,
    bool hint = false,
    int maxLines = 1,
    double bottom = 12,
    String? autofill,
  }) =>
      Padding(
        padding: EdgeInsets.only(bottom: bottom),
        child: TextField(
          controller: controllers[field],
          focusNode: focusNodes[field],
          keyboardType: maxLines > 1 ? TextInputType.multiline : keyboard,
          textCapitalization: capitalize,
          // Klaviaturadagi «Keyingi» keyingi maydonga o'tkazadi; izoh
          // ko'p qatorli — unda Enter yangi qator.
          textInputAction: maxLines > 1 ? TextInputAction.newline : TextInputAction.next,
          autofillHints: autofill == null ? null : [autofill],
          maxLines: maxLines,
          onChanged: (_) {
            onChanged?.call(field);
            if (field == CheckoutField.region) onRegionChanged?.call();
          },
          decoration: InputDecoration(
            labelText: context.t('checkout.address.$key'),
            hintText: hint ? context.t('checkout.address.${key}Placeholder') : null,
            errorText: errors[field],
            errorMaxLines: 2,
          ),
        ),
      );
}
