import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'courier_history_screen.dart';

/// Kuryer profili: ma'lumot, til, tarix va chiqish.
///
/// Mijoz profilidan farqli — bu yerda ism/email TAHRIRLANMAYDI.
/// Kuryer hisobini administrator yaratadi (`courier.loginSubtitle`),
/// shuning uchun ma'lumotni o'zgartirish huquqi ham unda. Tahrirlash
/// maydonlarini qo'ysak, saqlash har safar serverda rad etilardi.
class CourierProfileScreen extends StatefulWidget {
  const CourierProfileScreen({super.key});

  @override
  State<CourierProfileScreen> createState() => _CourierProfileScreenState();
}

class _CourierProfileScreenState extends State<CourierProfileScreen> {
  bool _localeSaving = false;
  bool _signingOut = false;
  String? _error;

  CourierStats? _stats;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadStats());
  }

  Future<void> _loadStats() async {
    try {
      final stats = await SellobayRuntimeScope.of(context).courier.fetchStats();
      if (mounted) setState(() => _stats = stats);
    } catch (_) {
      // Ko'rsatkich — qo'shimcha ma'lumot. Kelmasa profil baribir
      // ochiladi: til almashtirish va chiqish undan muhimroq.
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
      // Til SERVERDA saqlanadi — kuryer boshqa qurilmaga kirsa ham
      // o'sha tilni ko'radi. Tarjimalarni `SellobayScope` o'zi
      // almashtiradi, u `user.locale` ga ergashadi.
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
            child: Text(dialogContext.t('common.confirm')),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _signingOut = true);
    // Chiqishdan keyin `AuthScope` ekranni o'zi almashtiradi —
    // `setState` qilishga urinmaymiz, widget allaqachon yo'q bo'ladi.
    await AuthScope.read(context).signOut();
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthScope.of(context).user;

    return Scaffold(
      appBar: AppBar(title: Text(context.t('courier.profileTitle'))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        children: [
          if (user != null) _header(context, user),
          const SizedBox(height: 20),
          if (_stats != null) ...[
            _statsRow(context, _stats!),
            const SizedBox(height: 22),
          ],
          FormErrorBanner(_error),
          _section(context.t('localeSwitcher.label')),
          Wrap(
            spacing: 8,
            children: [
              for (final code in LocaleController.supported)
                ChoiceChip(
                  label: Text(_localeName(code)),
                  selected: LocaleController.resolve(user?.locale) == code,
                  onSelected: _localeSaving ? null : (_) => _setLocale(code),
                ),
            ],
          ),
          const SizedBox(height: 24),
          _linkTile(
            context,
            icon: Icons.history,
            label: context.t('courier.history'),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const CourierHistoryScreen()),
            ),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: _signingOut ? null : _signOut,
            style: OutlinedButton.styleFrom(foregroundColor: SellobayColors.destructive),
            icon: const Icon(Icons.logout, size: 18),
            label: Text(context.t(_signingOut ? 'profile.signingOut' : 'profile.signOut')),
          ),
        ],
      ),
    );
  }

  Widget _header(BuildContext context, AuthUser user) => Row(
        children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: SellobayColors.soft,
            child: Text(
              _initials(user.displayName),
              style: const TextStyle(
                fontSize: 17,
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
                  user.displayName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: SellobayColors.ink,
                  ),
                ),
                if (user.phone != null || user.email != null)
                  Text(
                    user.phone ?? user.email!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
                  ),
              ],
            ),
          ),
        ],
      );

  Widget _statsRow(BuildContext context, CourierStats stats) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: SellobayColors.soft,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            _stat(context.t('courier.statsDelivered'), '${stats.deliveredToday}'),
            _stat(context.t('courier.statsActive'), '${stats.active}'),
            _stat(context.t('courier.statsAllTime'), '${stats.allTimeDelivered}'),
          ],
        ),
      );

  Widget _stat(String label, String value) => Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: SellobayColors.ink,
              ),
            ),
            const SizedBox(height: 1),
            Text(
              label,
              maxLines: 2,
              style: const TextStyle(fontSize: 11.5, height: 1.25, color: SellobayColors.mutedText),
            ),
          ],
        ),
      );

  Widget _linkTile(
    BuildContext context, {
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) =>
      InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            children: [
              Icon(icon, size: 20, color: SellobayColors.mutedText),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600),
                ),
              ),
              const Icon(Icons.chevron_right, size: 20, color: SellobayColors.mutedText),
            ],
          ),
        ),
      );

  Widget _section(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 14.5,
            fontWeight: FontWeight.w700,
            color: SellobayColors.ink,
          ),
        ),
      );

  /// «O'zbekcha» o'rniga har tilda tanib olinadigan o'z nomi: rus
  /// tilidagi kuryer "Uzbek" ni, ingliz tilidagisi "Ruscha" ni
  /// interfeysda topa olmasligi mumkin.
  static String _localeName(String code) => switch (code) {
        'ru' => 'Русский',
        'en' => 'English',
        _ => "O'zbekcha",
      };

  static String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts[1].characters.first).toUpperCase();
  }
}
