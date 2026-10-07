import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Shaxsiy ma'lumotlar — ism, email, jins, tug'ilgan kun.
///
/// NEGA ALOHIDA EKRAN: ilgari tahrirlash profil ekranining ichida
/// edi va u o'sib borardi. Profil — navigatsiya, tahrirlash — forma;
/// ikkalasini bir faylda saqlash ularni ham o'qishni, ham test
/// qilishni qiyinlashtiradi.
///
/// Telefon TAHRIRLANMAYDI: u kirish identifikatori va uni
/// o'zgartirish OTP tasdiqlashini talab qiladi — server bunday
/// oqimni hali bermaydi.
class PersonalInfoScreen extends StatefulWidget {
  const PersonalInfoScreen({super.key});

  @override
  State<PersonalInfoScreen> createState() => _PersonalInfoScreenState();
}

class _PersonalInfoScreenState extends State<PersonalInfoScreen> {
  /// Serverdagi `Gender` enum bilan BIR XIL.
  static const _genders = <String, String>{
    'MALE': 'profile.gender.male',
    'FEMALE': 'profile.gender.female',
    'UNSPECIFIED': 'profile.gender.other',
  };

  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _email = TextEditingController();

  String _gender = 'UNSPECIFIED';
  DateTime? _birthDate;

  bool _saving = false;
  String? _error;
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    _initialized = true;

    final user = AuthScope.read(context).user;
    _firstName.text = user?.firstName ?? '';
    _lastName.text = user?.lastName ?? '';
    _email.text = user?.email ?? '';
    _gender = _genders.containsKey(user?.gender) ? user!.gender! : 'UNSPECIFIED';
    _birthDate = user?.birthDate == null ? null : DateTime.tryParse(user!.birthDate!);
  }

  @override
  void dispose() {
    for (final c in [_firstName, _lastName, _email]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickBirthDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _birthDate ?? DateTime(now.year - 25),
      // 120 yosh — real chegara; kelajakdagi sana ma'nosiz.
      firstDate: DateTime(now.year - 120),
      lastDate: now,
    );
    if (picked != null && mounted) setState(() => _birthDate = picked);
  }

  Future<void> _save() async {
    // Email KLIENTDA ham tekshiriladi: serverga bormasdan darhol
    // aytish tezroq va bitta so'rovni tejaydi. Yakuniy qaror baribir
    // serverda (u «band» ekanini ham biladi).
    final email = _email.text.trim();
    if (email.isNotEmpty) {
      final issue = emailIssueKey(email);
      if (issue != null) {
        setState(() => _error = context.t(issue));
        return;
      }
    }

    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      await AuthScope.read(context).updateProfile(
        firstName: _firstName.text,
        lastName: _lastName.text,
        email: email,
        gender: _gender,
        // Server `YYYY-MM-DD` kutadi — vaqt qismisiz.
        birthDate: _birthDate == null ? null : _formatDate(_birthDate!),
      );
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.t('profile.saved'))),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = context.errorText(e);
      });
    }
  }

  static String _formatDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final user = AuthScope.of(context).user;

    return Scaffold(
      appBar: AppBar(title: Text(context.t('profile.title'))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        children: [
          FormErrorBanner(_error),
          _field(_firstName, 'profile.fields.firstName',
              capitalize: TextCapitalization.words),
          _field(_lastName, 'profile.fields.lastName',
              capitalize: TextCapitalization.words),
          _field(_email, 'profile.fields.email', keyboard: TextInputType.emailAddress),
          if (user?.phone != null) _readOnlyPhone(context, user!.phone!),
          const SizedBox(height: 8),
          _label(context.t('profile.gender.title')),
          Wrap(
            spacing: 8,
            children: [
              for (final entry in _genders.entries)
                ChoiceChip(
                  key: ValueKey(entry.key),
                  label: Text(context.t(entry.value)),
                  selected: _gender == entry.key,
                  onSelected: _saving ? null : (_) => setState(() => _gender = entry.key),
                ),
            ],
          ),
          const SizedBox(height: 18),
          _label(context.t('profile.birthday')),
          InkWell(
            onTap: _saving ? null : _pickBirthDate,
            borderRadius: BorderRadius.circular(12),
            child: InputDecorator(
              decoration: const InputDecoration(),
              child: Text(
                _birthDate == null ? '2000-01-31' : _formatDate(_birthDate!),
                style: TextStyle(
                  fontSize: 15,
                  color: _birthDate == null ? SellobayColors.mutedText : SellobayColors.ink,
                ),
              ),
            ),
          ),
          const SizedBox(height: 22),
          FilledButton(
            onPressed: _saving ? null : _save,
            child: Text(context.t(_saving ? 'profile.saving' : 'profile.saveChanges')),
          ),
        ],
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          text,
          style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
        ),
      );

  Widget _field(
    TextEditingController controller,
    String labelKey, {
    TextInputType? keyboard,
    TextCapitalization capitalize = TextCapitalization.none,
  }) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: TextField(
          controller: controller,
          keyboardType: keyboard,
          textCapitalization: capitalize,
          enabled: !_saving,
          decoration: InputDecoration(labelText: context.t(labelKey)),
        ),
      );

  /// Telefon — faqat ko'rsatish uchun.
  Widget _readOnlyPhone(BuildContext context, String phone) => Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: TextField(
          controller: TextEditingController(text: phone),
          readOnly: true,
          decoration: InputDecoration(
            labelText: context.t('profile.fields.phone'),
            suffixIcon: const Icon(Icons.lock_outline, size: 18),
          ),
        ),
      );
}
