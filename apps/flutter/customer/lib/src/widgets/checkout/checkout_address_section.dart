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

/// Yetkazish manzili formasi.
///
/// Kontrollerlar TASHQARIDAN beriladi: ularning umri ekranga tegishli
/// va ma'lumot buyurtma yuborishda o'sha yerdan o'qiladi.
class CheckoutAddressForm extends StatelessWidget {
  const CheckoutAddressForm({
    super.key,
    required this.name,
    required this.phone,
    required this.region,
    required this.city,
    required this.street,
    required this.apartment,
    required this.notes,
    this.onRegionChanged,
  });

  final TextEditingController name;
  final TextEditingController phone;
  final TextEditingController region;
  final TextEditingController city;
  final TextEditingController street;
  final TextEditingController apartment;
  final TextEditingController notes;

  /// Viloyat o'zgarsa punktlar ro'yxati eskiradi — ekran uni
  /// tozalaydi.
  final VoidCallback? onRegionChanged;

  @override
  Widget build(BuildContext context) => Column(
        children: [
          _field(context, name, 'firstName', capitalize: TextCapitalization.words),
          _field(context, phone, 'phone', keyboard: TextInputType.phone, hint: true),
          Row(
            children: [
              Expanded(
                child: _field(
                  context,
                  region,
                  'region',
                  hint: true,
                  bottom: 0,
                  onChanged: onRegionChanged == null ? null : (_) => onRegionChanged!(),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(child: _field(context, city, 'city', hint: true, bottom: 0)),
            ],
          ),
          const SizedBox(height: 12),
          _field(context, street, 'street', hint: true),
          _field(context, apartment, 'apartment', hint: true),
          _field(context, notes, 'notes', hint: true, maxLines: 2, bottom: 0),
        ],
      );

  Widget _field(
    BuildContext context,
    TextEditingController controller,
    String key, {
    TextInputType? keyboard,
    TextCapitalization capitalize = TextCapitalization.none,
    bool hint = false,
    int maxLines = 1,
    double bottom = 12,
    ValueChanged<String>? onChanged,
  }) =>
      Padding(
        padding: EdgeInsets.only(bottom: bottom),
        child: TextField(
          controller: controller,
          keyboardType: keyboard,
          textCapitalization: capitalize,
          maxLines: maxLines,
          onChanged: onChanged,
          decoration: InputDecoration(
            labelText: context.t('checkout.address.$key'),
            hintText: hint ? context.t('checkout.address.${key}Placeholder') : null,
          ),
        ),
      );
}
