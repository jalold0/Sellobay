import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:url_launcher/url_launcher.dart';

/// Yordam markazi — aloqa kanallari va tez-tez so'raladigan savollar.
///
/// Aloqa ma'lumotlari SERVERDAN keladi (`/api/config` dagi `support`),
/// kodga yozilmaydi: telefon yoki Telegram o'zgarsa, ilovani qayta
/// chiqarish kerak bo'lmaydi.
///
/// SOZLANMAGAN kanal ko'rsatilmaydi. Ilgari web footer'ida
/// `info@example.uz` turardi — o'rin egasi, haqiqiy manzil emas;
/// bunday tugma bosilganda hech narsa ochilmasdi.
class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  static const _faq = <(String, String)>[
    ('help.q1', 'help.a1'),
    ('help.q2', 'help.a2'),
    ('help.q3', 'help.a3'),
    ('help.q4', 'help.a4'),
    ('help.q5', 'help.a5'),
  ];

  @override
  Widget build(BuildContext context) {
    final support = SellobayRuntimeScope.of(context).config.value?.support;

    return Scaffold(
      appBar: AppBar(title: Text(context.t('help.title'))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        children: [
          _hero(context),
          const SizedBox(height: 18),
          if (support == null || support.isEmpty)
            Text(
              context.t('help.noChannels'),
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
            )
          else
            Row(
              children: [
                if (support.telegram != null)
                  _ChannelButton(
                    icon: Icons.send_outlined,
                    labelKey: 'help.telegram',
                    uri: _telegramUri(support.telegram!),
                  ),
                if (support.phone != null)
                  _ChannelButton(
                    icon: Icons.call_outlined,
                    labelKey: 'help.phone',
                    uri: Uri(scheme: 'tel', path: support.phone!.replaceAll(RegExp(r'[^0-9+]'), '')),
                  ),
                if (support.email != null)
                  _ChannelButton(
                    icon: Icons.mail_outline,
                    labelKey: 'help.email',
                    uri: Uri(scheme: 'mailto', path: support.email!),
                  ),
              ],
            ),
          const SizedBox(height: 26),
          Text(
            context.t('help.faqTitle'),
            style: const TextStyle(
              fontSize: 15.5,
              fontWeight: FontWeight.w700,
              color: SellobayColors.ink,
            ),
          ),
          const SizedBox(height: 8),
          for (final (question, answer) in _faq)
            Theme(
              // `ExpansionTile` standart holda ajratgich chizadi —
              // kartochka ichida u ortiqcha.
              data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
              child: ExpansionTile(
                key: ValueKey(question),
                tilePadding: EdgeInsets.zero,
                childrenPadding: const EdgeInsets.only(bottom: 10),
                title: Text(
                  context.t(question),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      context.t(answer),
                      style: const TextStyle(
                        fontSize: 13,
                        height: 1.5,
                        color: SellobayColors.mutedText,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  /// `sellobay_support` ham, to'liq havola ham kelishi mumkin.
  static Uri _telegramUri(String value) =>
      value.startsWith('http') ? Uri.parse(value) : Uri.parse('https://t.me/$value');

  Widget _hero(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 22),
        decoration: BoxDecoration(
          color: SellobayColors.primary,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            const Icon(Icons.help_outline, size: 34, color: Colors.white),
            const SizedBox(height: 10),
            Text(
              context.t('help.title'),
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              context.t('help.subtitle'),
              style: const TextStyle(fontSize: 12.5, color: Colors.white70),
            ),
          ],
        ),
      );
}

/// Bitta aloqa kanali.
class _ChannelButton extends StatelessWidget {
  const _ChannelButton({required this.icon, required this.labelKey, required this.uri});

  final IconData icon;
  final String labelKey;
  final Uri uri;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: OutlinedButton(
            onPressed: () async {
              final ok = await launchUrl(uri, mode: LaunchMode.externalApplication)
                  .catchError((_) => false);
              if (!ok && context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(context.t('courier.cannotOpen'))),
                );
              }
            },
            style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
            child: Column(
              children: [
                Icon(icon, size: 20),
                const SizedBox(height: 5),
                Text(context.t(labelKey), style: const TextStyle(fontSize: 12)),
              ],
            ),
          ),
        ),
      );
}
