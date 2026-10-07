import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../map/location_picker_screen.dart';

/// Manzil qo'shish yoki tahrirlash.
///
/// [existing] `null` bo'lsa — yangi manzil.
class AddressFormScreen extends StatefulWidget {
  const AddressFormScreen({super.key, this.existing});

  final SavedAddress? existing;

  @override
  State<AddressFormScreen> createState() => _AddressFormScreenState();
}

class _AddressFormScreenState extends State<AddressFormScreen> {
  late final _label = TextEditingController(text: widget.existing?.label ?? '');
  late final _recipient = TextEditingController(text: widget.existing?.recipientName ?? '');
  late final _phone = TextEditingController(text: widget.existing?.phone ?? '');
  late final _region = TextEditingController(text: widget.existing?.region ?? 'Toshkent');
  late final _city = TextEditingController(text: widget.existing?.city ?? '');
  late final _street = TextEditingController(text: widget.existing?.street ?? '');
  late final _apartment = TextEditingController(text: widget.existing?.apartment ?? '');

  late AddressType _type = widget.existing?.type ?? AddressType.home;

  /// Mavjud ASOSIY manzilni "asosiy emas" ga o'tkazib bo'lmaydi.
  ///
  /// Serverda belgini olib tashlash yo'li yo'q — `isDefault: true`
  /// faqat BOSHQASIGA o'tkazadi. Katakchani ochiq qoldirsak,
  /// foydalanuvchi uni so'ndirib, hech narsa o'zgarmaganini ko'rardi.
  late bool _isDefault = widget.existing?.isDefault ?? false;
  bool get _defaultLocked => widget.existing?.isDefault ?? false;

  /// Xaritadan tanlangan nuqta.
  late double? _latitude = widget.existing?.latitude;
  late double? _longitude = widget.existing?.longitude;

  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [_label, _recipient, _phone, _region, _city, _street, _apartment]) {
      c.dispose();
    }
    super.dispose();
  }

  /// Xaritani ochadi va qaytgan natijani formaga yozadi.
  ///
  /// Geokodlashdan kelgan matn — TAXMIN: u faqat BO'SH maydonlarni
  /// to'ldiradi. Mijoz allaqachon yozgan manzilni ustiga yozib
  /// yuborsak, aniqroq ma'lumot yo'qolardi.
  Future<void> _pickOnMap() async {
    final picked = await Navigator.of(context).push<PickedLocation>(
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          initial: _latitude != null && _longitude != null
              ? LatLng(_latitude!, _longitude!)
              : null,
        ),
      ),
    );
    if (picked == null || !mounted) return;

    setState(() {
      _latitude = picked.latitude;
      _longitude = picked.longitude;
      if (_region.text.trim().isEmpty && picked.region != null) _region.text = picked.region!;
      if (_city.text.trim().isEmpty && picked.city != null) _city.text = picked.city!;
      if (_street.text.trim().isEmpty && picked.street != null) _street.text = picked.street!;
    });
  }

  Future<void> _save() async {
    final phone = _phone.text.trim();
    if (_recipient.text.trim().length < 2 ||
        _city.text.trim().length < 2 ||
        _street.text.trim().length < 2 ||
        _region.text.trim().length < 2) {
      setState(() => _error = context.t('profile.addressesPage.fillMain'));
      return;
    }
    if (!isValidUzPhone(phone)) {
      setState(() => _error = context.t('auth.phoneInvalid'));
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    final repo = SellobayRuntimeScope.of(context).addresses;
    final input = AddressInput(
      label: _label.text,
      type: _type,
      recipientName: _recipient.text,
      // Serverga E.164 ko'rinishda yuboriladi; server ham
      // normallashtiradi, lekin ikkita turli yozuv saqlanib qolmasin.
      phone: normalizeUzPhone(phone) ?? phone,
      region: _region.text,
      city: _city.text,
      street: _street.text,
      apartment: _apartment.text,
      latitude: _latitude,
      longitude: _longitude,
      isDefault: _isDefault,
    );

    try {
      final existing = widget.existing;
      final saved = existing == null
          ? await repo.create(input)
          : await repo.update(existing.id, input);
      if (!mounted) return;
      Navigator.of(context).pop(saved);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = context.errorText(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isNew = widget.existing == null;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          context.t(isNew ? 'profile.addressesPage.newAddress' : 'profile.addressesPage.editAddress'),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        children: [
          FormErrorBanner(_error),
          Wrap(
            spacing: 8,
            children: [
              for (final type in AddressType.values)
                ChoiceChip(
                  label: Text(context.t(type.labelKey)),
                  selected: _type == type,
                  onSelected: (_) => setState(() => _type = type),
                ),
            ],
          ),
          const SizedBox(height: 16),
          _field(_label, 'profile.addressesPage.fieldLabel',
              hintKey: 'profile.addressesPage.labelPlaceholder'),
          _field(_recipient, 'profile.addressesPage.recipient',
              capitalize: TextCapitalization.words),
          _field(_phone, 'profile.addressesPage.phone', keyboard: TextInputType.phone),
          _field(_region, 'profile.addressesPage.region'),
          _field(_city, 'profile.addressesPage.city'),
          _field(_street, 'profile.addressesPage.street',
              hintKey: 'profile.addressesPage.streetPlaceholder'),
          _field(_apartment, 'profile.addressesPage.apartment'),
          const SizedBox(height: 4),
          // Xaritadan tanlash — MAJBURIY EMAS: internet sekin bo'lsa
          // yoki xarita yuklanmasa, manzilni qo'lda kiritib saqlash
          // baribir ishlashi kerak.
          OutlinedButton.icon(
            onPressed: _saving ? null : _pickOnMap,
            icon: Icon(
              _latitude == null ? Icons.map_outlined : Icons.check_circle_outline,
              size: 18,
              color: _latitude == null ? null : SellobayColors.success,
            ),
            label: Text(
              context.t(_latitude == null ? 'map.pickTitle' : 'map.picked'),
            ),
          ),
          const SizedBox(height: 10),
          CheckboxListTile(
            value: _isDefault,
            // Yoqilgan holatdan qaytarib bo'lmaydi — yuqoridagi izohga qarang.
            onChanged: _defaultLocked ? null : (v) => setState(() => _isDefault = v ?? false),
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            title: Text(
              context.t('profile.addressesPage.makeDefaultCheck'),
              style: const TextStyle(fontSize: 14),
            ),
          ),
          const SizedBox(height: 10),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: Text(
              context.t(_saving ? 'profile.addressesPage.saving' : 'profile.addressesPage.save'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String labelKey, {
    String? hintKey,
    TextInputType? keyboard,
    TextCapitalization capitalize = TextCapitalization.none,
  }) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextField(
          controller: controller,
          keyboardType: keyboard,
          textCapitalization: capitalize,
          decoration: InputDecoration(
            labelText: context.t(labelKey),
            hintText: hintKey == null ? null : context.t(hintKey),
          ),
        ),
      );
}
