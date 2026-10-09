import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Sello Coins — balans, daraja, kunlik check-in va tarix.
///
/// Qoidalar SERVERDAN keladi: coin kursi va darajalar `/api/config`
/// dan (`coinValueSom`, `tiers`), balans va tarix `/api/loyalty` dan.
/// Ilovada hech narsa hisoblanmaydi — ADR 0009 dagi chegara.
///
/// Expo'da bu ekran bor edi, Flutter'da yo'q edi, garchi
/// `LoyaltyRepository` allaqachon yozilgan bo'lsa ham: uni faqat
/// checkout ishlatardi (coin yechish uchun).
class LoyaltyScreen extends StatefulWidget {
  const LoyaltyScreen({super.key});

  @override
  State<LoyaltyScreen> createState() => _LoyaltyScreenState();
}

class _LoyaltyScreenState extends State<LoyaltyScreen> {
  LoyaltySummary? _summary;
  bool _loading = true;
  bool _checkingIn = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  LoyaltyRepository get _repo => SellobayRuntimeScope.of(context).loyalty;

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final summary = await _repo.fetchSummary();
      if (!mounted) return;
      setState(() {
        _summary = summary;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e;
      });
    }
  }

  Future<void> _checkIn() async {
    setState(() => _checkingIn = true);
    try {
      final result = await _repo.checkIn();
      if (!mounted) return;
      setState(() => _checkingIn = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            // Server «allaqachon olingan» desa, soxta «+5 qo'shildi»
            // ko'rsatmaymiz.
            result.alreadyClaimed
                ? context.t('loyalty.checkinDone')
                : context.t('loyalty.checkinToast'),
          ),
        ),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _checkingIn = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.errorText(e))),
      );
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(context.t('loyalty.title'))),
        body: RefreshIndicator(onRefresh: _load, child: _body(context)),
      );

  Widget _body(BuildContext context) {
    if (_loading) {
      return const Center(
        child: SizedBox(
          width: 26,
          height: 26,
          child: CircularProgressIndicator(strokeWidth: 2.5, color: SellobayColors.primary),
        ),
      );
    }

    if (_error != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(32),
        children: [
          SizedBox(height: MediaQuery.sizeOf(context).height * 0.15),
          const Icon(Icons.cloud_off, size: 42, color: SellobayColors.mutedText),
          const SizedBox(height: 14),
          Text(
            context.errorText(_error!),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 18),
          Center(child: FilledButton(onPressed: _load, child: Text(context.t('common.retry')))),
        ],
      );
    }

    final s = _summary!;
    final config = SellobayRuntimeScope.of(context).config.value;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      children: [
        _balanceCard(context, s, config),
        const SizedBox(height: 20),
        if (config != null) ...[
          _tierSection(context, s, config),
          const SizedBox(height: 22),
        ],
        _checkinTile(context, s),
        const SizedBox(height: 22),
        _infoList(context, 'loyalty.earnTitle', const [
          'loyalty.earn.purchase',
          'loyalty.earn.review',
          'loyalty.earn.referral',
          'loyalty.earn.birthday',
          'loyalty.earn.checkin',
        ]),
        const SizedBox(height: 18),
        _infoList(context, 'loyalty.redeemTitle', const [
          'loyalty.redeem.discount',
          'loyalty.redeem.shipping',
          'loyalty.redeem.exclusive',
        ]),
        const SizedBox(height: 24),
        _section(context.t('loyalty.historyTitle')),
        if (s.history.isEmpty)
          Text(
            context.t('loyalty.history.empty'),
            style: const TextStyle(fontSize: 13, height: 1.5, color: SellobayColors.mutedText),
          )
        else
          for (final e in s.history) _historyRow(context, e),
      ],
    );
  }

  Widget _balanceCard(BuildContext context, LoyaltySummary s, SellobayConfig? config) {
    // Coin qiymati SERVERDAN — kurs o'zgarsa ilova yangilanmasdan
    // to'g'ri raqamni ko'rsatadi.
    final som = config == null ? null : s.coins * config.loyalty.coinValueSom;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: SellobayColors.primary,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.t('loyalty.balance'),
            style: const TextStyle(fontSize: 12.5, color: Colors.white70),
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '${s.coins}',
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                context.t('loyalty.coin'),
                style: const TextStyle(fontSize: 14, color: Colors.white70),
              ),
            ],
          ),
          if (som != null)
            Text(
              context.t('loyalty.worth', params: {'som': formatAmount(som)}),
              style: const TextStyle(fontSize: 13, color: Colors.white),
            ),
        ],
      ),
    );
  }

  Widget _tierSection(BuildContext context, LoyaltySummary s, SellobayConfig config) {
    final tiers = config.loyalty.tiers;
    if (tiers.isEmpty) return const SizedBox.shrink();

    // Joriy daraja — xarid summasi yetgan ENG YUQORISI.
    final reached = tiers.where((t) => s.spentSom >= t.min).toList();
    final current = reached.isEmpty ? tiers.first : reached.last;
    final nextIndex = tiers.indexOf(current) + 1;
    final next = nextIndex < tiers.length ? tiers[nextIndex] : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _section(context.t('loyalty.currentTier')),
        Row(
          children: [
            Text(current.icon, style: const TextStyle(fontSize: 20)),
            const SizedBox(width: 8),
            Text(
              context.t('loyalty.tiers.${current.key}'),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            const SizedBox(width: 10),
            Text(
              context.t('loyalty.cashback', params: {'pct': current.cashbackPct}),
              style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
            ),
          ],
        ),
        if (next != null) ...[
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: next.min == 0 ? 1 : (s.spentSom / next.min).clamp(0.0, 1.0),
              minHeight: 7,
              backgroundColor: SellobayColors.soft,
              valueColor: const AlwaysStoppedAnimation(SellobayColors.primary),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '${context.t('loyalty.nextTier', params: {
                  'tier': context.t('loyalty.tiers.${next.key}'),
                })} · ${context.t('loyalty.spendMore', params: {
                  'amount': formatAmount(next.min - s.spentSom),
                })}',
            style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
          ),
        ],
      ],
    );
  }

  Widget _checkinTile(BuildContext context, LoyaltySummary s) => SizedBox(
        width: double.infinity,
        child: s.checkedInToday
            ? OutlinedButton.icon(
                onPressed: null,
                icon: const Icon(Icons.check_circle_outline, size: 18),
                label: Text(context.t('loyalty.checkinDone')),
              )
            : FilledButton.icon(
                onPressed: _checkingIn ? null : _checkIn,
                icon: const Icon(Icons.card_giftcard, size: 18),
                label: Text(context.t('loyalty.checkinCta')),
              ),
      );

  Widget _infoList(BuildContext context, String titleKey, List<String> itemKeys) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _section(context.t(titleKey)),
          for (final key in itemKeys)
            Padding(
              padding: const EdgeInsets.only(bottom: 5),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 6),
                    child: Icon(Icons.circle, size: 5, color: SellobayColors.mutedText),
                  ),
                  const SizedBox(width: 9),
                  Expanded(
                    child: Text(
                      context.t(key),
                      style: const TextStyle(
                        fontSize: 13,
                        height: 1.45,
                        color: SellobayColors.mutedText,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      );

  Widget _historyRow(BuildContext context, LoyaltyEntry e) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    // Noma'lum sabab kalitida tarjima o'rniga kalitning
                    // o'zi chiqadi — jim bo'sh satrdan yaxshiroq.
                    context.t('loyalty.history.${e.reasonKey}'),
                    style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
                  ),
                  Text(
                    e.daysAgo == 0
                        ? context.t('loyalty.history.today')
                        : context.t('loyalty.history.daysAgo', params: {'days': e.daysAgo}),
                    style: const TextStyle(fontSize: 12, color: SellobayColors.mutedText),
                  ),
                ],
              ),
            ),
            Text(
              '${e.isEarn ? '+' : ''}${e.amount}',
              style: TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w800,
                color: e.isEarn ? SellobayColors.success : SellobayColors.destructive,
              ),
            ),
          ],
        ),
      );

  Widget _section(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 9),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 14.5,
            fontWeight: FontWeight.w700,
            color: SellobayColors.ink,
          ),
        ),
      );
}
