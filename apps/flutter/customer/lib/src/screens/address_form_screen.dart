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
  // Yangi manzilda viloyat OLDINDAN yozilmaydi — faqat maslahat. Bo'sh
  // qolsa server o'z standartini qo'llaydi; «Toshkent» ni oldindan
  // qo'ysak, boshqa viloyatdagi mijoz uni o'chirishni unutardi.
  late final _region = TextEditingController(text: widget.existing?.region ?? '');
  late final _city = TextEditingController(text: widget.existing?.city ?? '');
  late final _street = TextEditingController(text: widget.existing?.street ?? '');
  late final _apartment = TextEditingController(text: widget.existing?.apartment ?? '');

  /// Majburiy maydonlar — xato va fokus uchun.
  late final _focus = {
    for (final c in [_recipient, _phone, _region, _city, _street]) c: FocusNode(),
  };

  /// Maydon ostidagi xatolar.
  Map<TextEditingController, String> _fieldErrors = const {};

  final _bannerKey = GlobalKey();

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
    for (final node in _focus.values) {
      node.dispose();
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

  /// Noto'g'ri maydonlar va sababi — forma tartibida.
  Map<TextEditingController, String> _validate() {
    final required = context.t('common.fieldRequired');
    final phone = _phone.text.trim();
    final region = _region.text.trim();
    return {
      if (_recipient.text.trim().length < 2) _recipient: required,
      if (phone.isEmpty)
        _phone: required
      else if (!isValidUzPhone(phone))
        _phone: context.t('auth.phoneInvalid'),
      // Viloyat ixtiyoriy, lekin yozilgan bo'lsa server kamida 2 belgi kutadi.
      if (region.isNotEmpty && region.length < 2) _region: required,
      if (_city.text.trim().length < 2) _city: required,
      if (_street.text.trim().length < 2) _street: required,
    };
  }

  Future<void> _save() async {
    final phone = _phone.text.trim();
    final problems = _validate();
    setState(() {
      _fieldErrors = problems;
      _error = null;
    });
    if (problems.isNotEmpty) {
      // Xato tepadagi chiziqda emas, maydonning O'ZIDA; fokus birinchi
      // noto'g'ri maydonni ko'rinadigan joyga suradi.
      _focus[problems.keys.first]?.requestFocus();
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
      // Saqlash tugmasi pastda, chiziq tepada — unga surib boramiz.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final target = _bannerKey.currentContext;
        if (target == null || !target.mounted) return;
        Scrollable.ensureVisible(
          target,
          duration: MediaQuery.disableAnimationsOf(target)
              ? Duration.zero
              : const Duration(milliseconds: 280),
          curve: Curves.easeOut,
        );
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
      // `ListView` emas: dangasa ro'yxat tepadagi xato chizig'ini
      // pastga surilganda daraxtdan chiqarib yuboradi — unga qaytib
      // surib bo'lmasdi. Forma qisqa, dangasalikdan foyda yo'q.
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        child: AutofillGroup(child: _form(context)),
      ),
    );
  }

  Widget _form(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FormErrorBanner(_error, key: _bannerKey),
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
              capitalize: TextCapitalization.words, autofill: AutofillHints.name),
          _field(_phone, 'profile.addressesPage.phone',
              keyboard: TextInputType.phone, autofill: AutofillHints.telephoneNumber),
          _field(_region, 'profile.addressesPage.region',
              hintKey: 'checkout.address.regionPlaceholder', autofill: AutofillHints.addressState),
          _field(_city, 'profile.addressesPage.city', autofill: AutofillHints.addressCity),
          _field(_street, 'profile.addressesPage.street',
              hintKey: 'profile.addressesPage.streetPlaceholder',
              autofill: AutofillHints.streetAddressLine1),
          _field(_apartment, 'profile.addressesPage.apartment',
              autofill: AutofillHints.streetAddressLine2, last: true),
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
      );

  Widget _field(
    TextEditingController controller,
    String labelKey, {
    String? hintKey,
    TextInputType? keyboard,
    TextCapitalization capitalize = TextCapitalization.none,
    String? autofill,
    bool last = false,
  }) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextField(
          controller: controller,
          focusNode: _focus[controller],
          keyboardType: keyboard,
          textCapitalization: capitalize,
          // «Keyingi» keyingi maydonga o'tadi, oxirgisida «Tayyor».
          textInputAction: last ? TextInputAction.done : TextInputAction.next,
          autofillHints: autofill == null ? null : [autofill],
          onChanged: (_) {
            // Tuzatilayotgan maydonning eski xatosi olib tashlanadi.
            if (!_fieldErrors.containsKey(controller)) return;
            setState(() => _fieldErrors = {..._fieldErrors}..remove(controller));
          },
          decoration: InputDecoration(
            labelText: context.t(labelKey),
            hintText: hintKey == null ? null : context.t(hintKey),
            errorText: _fieldErrors[controller],
            errorMaxLines: 2,
          ),
        ),
      );
}
