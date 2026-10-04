import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'addresses_screen.dart';
import 'wishlist_screen.dart';

/// Profil: ma'lumotlar, til va chiqish.
///
/// Ilgari chiqish tugmasi FAQAT katalog AppBar'ida edi, til esa umuman
/// almashtirib bo'lmasdi — `LocaleController` qurilma tilini olib,
/// shunisi bilan qolib ketardi.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _email = TextEditingController();

  bool _saving = false;
  bool _localeSaving = false;
  String? _error;

  /// Maydonlar foydalanuvchi ma'lumoti bilan BIR MARTA to'ldiriladi.
  ///
  /// Har `didChangeDependencies` da to'ldirsak, tilni almashtirgandan
  /// keyin auth yangilanadi va yozilayotgan matn ustiga eskisi
  /// qaytarilardi.
  bool _filled = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_filled) return;
    final user = AuthScope.of(context).user;
    if (user == null) return;
    _firstName.text = user.firstName ?? '';
    _lastName.text = user.lastName ?? '';
    _email.text = user.email ?? '';
    _filled = true;
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _email.dispose();
    super.dispose();
  }

  Future<void> _save() async {
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
      );
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.t('profile.saved'))),
      );
    } catch (e) {
      if (!mounted) return;
      // Server «email band» deyishi mumkin — uning matnini ko'rsatamiz.
      setState(() {
        _saving = false;
        _error = context.errorText(e);
      });
    }
  }

  Future<void> _setLocale(String code) async {
    final auth = AuthScope.read(context);
    if (auth.user?.locale == code) return;

    setState(() {
      _localeSaving = true;
      _error = null;
    });
    try {
      // Til SERVERDA saqlanadi. Tarjimalarni `SellobayScope` o'zi
      // almashtiradi — u `user.locale` ga ergashadi.
      await auth.updateLocale(code);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = context.errorText(e));
    } finally {
      if (mounted) setState(() => _localeSaving = false);
    }
  }

  Future<void> _signOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(dialogContext.t('profile.signOut')),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(dialogContext.t('common.cancel')),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(dialogContext.t('profile.signOut')),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    await AuthScope.read(context).signOut();
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthScope.of(context).user;

    return Scaffold(
      appBar: AppBar(title: Text(context.t('nav.profile'))),
      body: user == null
          // Chiqish bosilgan lahzada AuthGate hali almashmagan bo'lishi
          // mumkin — bo'sh forma ko'rsatmaymiz.
          ? const SizedBox.shrink()
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
              children: [
                _header(context, user),
                const SizedBox(height: 24),
                FormErrorBanner(_error),
                _section(context.t('profile.infoTitle')),
                TextField(
                  controller: _firstName,
                  textCapitalization: TextCapitalization.words,
                  decoration: InputDecoration(labelText: context.t('profile.fields.firstName')),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _lastName,
                  textCapitalization: TextCapitalization.words,
                  decoration: InputDecoration(labelText: context.t('profile.fields.lastName')),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  decoration: InputDecoration(labelText: context.t('profile.fields.email')),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                        )
                      : Text(context.t('profile.saveChanges')),
                ),
                const SizedBox(height: 26),
                _linkTile(
                  context,
                  icon: Icons.favorite_border,
                  labelKey: 'profile.nav.wishlist',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(builder: (_) => const WishlistScreen()),
                  ),
                ),
                _linkTile(
                  context,
                  icon: Icons.location_on_outlined,
                  labelKey: 'profile.nav.addresses',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(builder: (_) => const AddressesScreen()),
                  ),
                ),
                const SizedBox(height: 26),
                _section(context.t('localeSwitcher.label')),
                _localePicker(context, user.locale),
                const SizedBox(height: 30),
                OutlinedButton.icon(
                  onPressed: _signOut,
                  style: OutlinedButton.styleFrom(foregroundColor: SellobayColors.destructive),
                  icon: const Icon(Icons.logout, size: 18),
                  label: Text(context.t('profile.signOut')),
                ),
              ],
            ),
    );
  }

  Widget _header(BuildContext context, AuthUser user) {
    final name = user.displayName.isEmpty ? context.t('profile.userFallback') : user.displayName;
    // Telefon bilan kirgan foydalanuvchining ismi bo'lmasligi mumkin —
    // bunda `displayName` telefonni qaytaradi va uni ikki marta
    // ko'rsatish ortiqcha.
    final subtitle = [user.phone, user.email].whereType<String>().where((s) => s != name).join(' · ');

    return Row(
      children: [
        CircleAvatar(
          radius: 28,
          backgroundColor: SellobayColors.soft,
          child: Text(
            _initials(name),
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: SellobayColors.primary,
            ),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: SellobayColors.ink,
                ),
              ),
              if (subtitle.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
                ),
              ],
              const SizedBox(height: 6),
              Text(
                // Ballar serverdan keladi; mahalliy hisob yo'q.
                '${context.t('profile.stats.points')}: ${user.loyaltyPoints}',
                style: const TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: SellobayColors.accent,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _localePicker(BuildContext context, String? current) => Wrap(
        spacing: 8,
        children: [
          for (final code in LocaleController.supported)
            ChoiceChip(
              label: Text(_localeName(code)),
              selected: LocaleController.resolve(current) == code,
              onSelected: _localeSaving ? null : (_) => _setLocale(code),
            ),
        ],
      );

  Widget _linkTile(
    BuildContext context, {
    required IconData icon,
    required String labelKey,
    required VoidCallback onTap,
  }) =>
      InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            children: [
              Icon(icon, size: 20, color: SellobayColors.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  context.t(labelKey),
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                ),
              ),
              const Icon(Icons.chevron_right, size: 20, color: SellobayColors.mutedText),
            ],
          ),
        ),
      );

  Widget _section(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 15.5,
            fontWeight: FontWeight.w700,
            color: SellobayColors.ink,
          ),
        ),
      );

  /// Til nomi O'Z TILIDA — tarjima qilinmaydi.
  ///
  /// "Ruscha" degan yozuvni rus tilini qidirayotgan odam o'zbekcha
  /// interfeysda topa olmasligi mumkin; "Русский" esa har qanday tilda
  /// tanib olinadi.
  static String _localeName(String code) => switch (code) {
        'ru' => 'Русский',
        'en' => 'English',
        _ => "O'zbekcha",
      };

  static String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    // Telefon raqami bosh harf bo'lib ko'rinmaydi — belgi qo'yamiz.
    if (!RegExp('[A-Za-zА-Яа-я]').hasMatch(parts.first)) return '#';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts[1].characters.first).toUpperCase();
  }
}
