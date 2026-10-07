import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:url_launcher/url_launcher.dart';

/// «Sotuvchi bo'lish» — taklif sahifasi.
///
/// Ariza ILOVADA to'ldirilmaydi: u STIR, bank rekvizitlari va
/// hujjat yuklashni talab qiladi, server tomonida esa bunday
/// endpoint yo'q. Shuning uchun tugma web sahifasini ochadi —
/// o'sha yerda forma allaqachon bor (`apps/web` dagi `/sell`).
///
/// Ilovada soxta forma qursak, u yuborilmas yoki jim yo'qolardi.
class BecomeSellerScreen extends StatelessWidget {
  const BecomeSellerScreen({super.key});

  static const _benefits = <(IconData, String, String)>[
    (Icons.groups_outlined, 'sell.benefit.customers', 'sell.benefit.customersDesc'),
    (Icons.trending_up, 'sell.benefit.growth', 'sell.benefit.growthDesc'),
    (Icons.local_shipping_outlined, 'sell.benefit.logistics', 'sell.benefit.logisticsDesc'),
    (Icons.payments_outlined, 'sell.benefit.commission', 'sell.benefit.commissionDesc'),
  ];

  static const _requirements = <String>[
    'sell.req.legal',
    'sell.req.stir',
    'sell.req.bank',
    'sell.req.product',
  ];

  static const _steps = <(String, String)>[
    ('sell.step.apply', 'sell.step.applyDesc'),
    ('sell.step.verify', 'sell.step.verifyDesc'),
    ('sell.step.add', 'sell.step.addDesc'),
    ('sell.step.start', 'sell.step.startDesc'),
  ];

  @override
  Widget build(BuildContext context) {
    final runtime = SellobayRuntimeScope.of(context);
    final base = runtime.api.baseUrl;
    final locale = runtime.locale.locale;

    return Scaffold(
      appBar: AppBar(title: Text(context.t('sell.title'))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        children: [
          _hero(context),
          const SizedBox(height: 22),
          _sectionTitle(context.t('sell.benefitsTitle')),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.35,
            children: [
              for (final (icon, title, desc) in _benefits) _BenefitCard(icon, title, desc),
            ],
          ),
          const SizedBox(height: 22),
          _card(
            context,
            title: context.t('sell.requirementsTitle'),
            icon: Icons.description_outlined,
            children: [
              for (final key in _requirements)
                Padding(
                  padding: const EdgeInsets.only(bottom: 7),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.check_circle_outline,
                          size: 16, color: SellobayColors.success),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          context.t(key),
                          style: const TextStyle(fontSize: 13, height: 1.4),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 22),
          _sectionTitle(context.t('sell.stepsTitle')),
          for (var i = 0; i < _steps.length; i++) _step(context, i + 1, _steps[i]),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: () => _open(context, '$base/$locale/sell'),
            icon: const Icon(Icons.open_in_new, size: 18),
            label: Text(context.t('sell.ctaApply')),
          ),
          const SizedBox(height: 10),
          OutlinedButton(
            onPressed: () => _open(context, '$base/$locale/seller-guide'),
            child: Text(context.t('sell.ctaGuide')),
          ),
          const SizedBox(height: 10),
          Text(
            context.t('sell.webNote'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 11.5, height: 1.4, color: SellobayColors.mutedText),
          ),
        ],
      ),
    );
  }

  static Future<void> _open(BuildContext context, String url) async {
    final ok = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication)
        .catchError((_) => false);
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.t('sell.openError'))),
      );
    }
  }

  Widget _hero(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: SellobayColors.primary,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.storefront, size: 30, color: Colors.white),
            const SizedBox(height: 12),
            Text(
              context.t('sell.heroEyebrow').toUpperCase(),
              style: const TextStyle(
                fontSize: 10.5,
                letterSpacing: 1.2,
                fontWeight: FontWeight.w700,
                color: Colors.white70,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              context.t('sell.heroTitle'),
              style: const TextStyle(
                fontSize: 21,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              context.t('sell.heroSubtitle'),
              style: const TextStyle(fontSize: 12.5, height: 1.45, color: Colors.white),
            ),
          ],
        ),
      );

  Widget _step(BuildContext context, int number, (String, String) step) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 26,
              height: 26,
              alignment: Alignment.center,
              decoration: const BoxDecoration(
                color: SellobayColors.primary,
                shape: BoxShape.circle,
              ),
              child: Text(
                '$number',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.t(step.$1),
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  Text(
                    context.t(step.$2),
                    style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
                  ),
                ],
              ),
            ),
          ],
        ),
      );

  Widget _card(
    BuildContext context, {
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) =>
      Container(
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          border: Border.all(color: SellobayColors.border),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 17, color: SellobayColors.mutedText),
                const SizedBox(width: 7),
                Text(
                  title,
                  style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const SizedBox(height: 11),
            ...children,
          ],
        ),
      );

  Widget _sectionTitle(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 15.5,
            fontWeight: FontWeight.w700,
            color: SellobayColors.ink,
          ),
        ),
      );
}

/// Afzallik kartochkasi.
class _BenefitCard extends StatelessWidget {
  const _BenefitCard(this.icon, this.titleKey, this.descKey);

  final IconData icon;
  final String titleKey;
  final String descKey;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: SellobayColors.border),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 34,
              height: 34,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: SellobayColors.soft,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 18, color: SellobayColors.primary),
            ),
            const Spacer(),
            Text(
              context.t(titleKey),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, height: 1.25),
            ),
            const SizedBox(height: 2),
            Text(
              context.t(descKey),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11.5, height: 1.3, color: SellobayColors.mutedText),
            ),
          ],
        ),
      );
}
