import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'addresses_screen.dart';
import 'become_seller_screen.dart';
import 'help_screen.dart';
import 'personal_info_screen.dart';
import 'pickup_points_screen.dart';
import 'my_reviews_screen.dart';
import 'wallet_screen.dart';
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

  bool _localeSaving = false;
  String? _error;

  /// Maydonlar foydalanuvchi ma'lumoti bilan BIR MARTA to'ldiriladi.
  ///
  /// Har `didChangeDependencies` da to'ldirsak, tilni almashtirgandan
  /// keyin auth yangilanadi va yozilayotgan matn ustiga eskisi
  /// qaytarilardi.

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
                // Guruhlar: ilgari 10 ta teng vaznli havola ketma-ket edi.
                // Buyurtmalar, qaytarishlar va kuzatish «Buyurtmalar»
                // bo'limida (pastki panel), hamyon esa bitta ekranda.
                _group(context.t('profile.groupAccount')),
                // Tahrirlash ALOHIDA ekranda: profil — navigatsiya,
                // forma esa forma.
                _linkTile(
                  context,
                  icon: Icons.person_outline,
                  labelKey: 'profile.title',
                  onTap: () => _open(const PersonalInfoScreen()),
                ),
                _linkTile(
                  context,
                  icon: Icons.location_on_outlined,
                  labelKey: 'profile.nav.addresses',
                  onTap: () => _open(const AddressesScreen()),
                ),
                const SizedBox(height: 18),
                _group(context.t('profile.groupActivity')),
                _linkTile(
                  context,
                  icon: Icons.account_balance_wallet_outlined,
                  labelKey: 'wallet.title',
                  onTap: () => _open(const WalletScreen()),
                ),
                _linkTile(
                  context,
                  icon: Icons.favorite_border,
                  labelKey: 'profile.nav.wishlist',
                  onTap: () => _open(const WishlistScreen()),
                ),
                _linkTile(
                  context,
                  icon: Icons.rate_review_outlined,
                  labelKey: 'profile.nav.reviews',
                  onTap: () => _open(const MyReviewsScreen()),
                ),
                const SizedBox(height: 18),
                _group(context.t('profile.groupMore')),
                _linkTile(
                  context,
                  icon: Icons.storefront_outlined,
                  labelKey: 'pickupPoints.title',
                  onTap: () => _open(const PickupPointsScreen()),
                ),
                _linkTile(
                  context,
                  icon: Icons.help_outline,
                  labelKey: 'help.title',
                  onTap: () => _open(const HelpScreen()),
                ),
                _linkTile(
                  context,
                  icon: Icons.sell_outlined,
                  labelKey: 'sell.title',
                  onTap: () => _open(const BecomeSellerScreen()),
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
              const SizedBox(height: 8),
              // Ballar serverdan keladi; mahalliy hisob yo'q. Bosilsa hamyon.
              ActionChip(
                visualDensity: VisualDensity.compact,
                avatar: const Icon(
                  Icons.stars_rounded,
                  size: 16,
                  color: SellobayColors.accent,
                ),
                label: Text(
                  '${context.t('profile.stats.points')}: ${user.loyaltyPoints}',
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                onPressed: () => _open(const WalletScreen()),
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

  void _open(Widget screen) =>
      Navigator.of(context)
          .push(MaterialPageRoute<void>(builder: (_) => screen));

  /// Guruh sarlavhasi — ro'yxatni bo'laklarga ajratadi.
  Widget _group(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 4),
    child: Text(
      text.toUpperCase(),
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
        color: SellobayColors.mutedText,
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
