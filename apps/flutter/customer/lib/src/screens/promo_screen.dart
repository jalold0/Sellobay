import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../widgets/coupon_card.dart';

/// «Promokodlarim» — hamyon va kod qo'shish.
///
/// Checkout'dagi promokod maydonidan BOSHQA narsa: u berilgan kodni
/// shu savat uchun tekshiradi, bu esa foydalanuvchiga biriktirilgan
/// kodlar ro'yxatini ko'rsatadi.
class PromoScreen extends StatefulWidget {
  const PromoScreen({super.key});

  @override
  State<PromoScreen> createState() => _PromoScreenState();
}

class _PromoScreenState extends State<PromoScreen> {
  List<UserCoupon> _items = const [];
  bool _loading = true;
  Object? _error;

  final _code = TextEditingController();
  bool _claiming = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  PromoRepository get _repo => SellobayRuntimeScope.of(context).promo;

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final items = await _repo.fetchMine();
      if (!mounted) return;
      setState(() {
        _items = items;
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

  Future<void> _claim() async {
    final code = _code.text.trim();
    if (code.length < 2) return;

    setState(() => _claiming = true);
    try {
      final result = await _repo.claim(code);
      if (!mounted) return;
      setState(() => _claiming = false);
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            // Takroriy qo'shish XATO EMAS — server amalni idempotent
            // qilgan. Shuning uchun boshqacha xabar, qizil emas.
            context.t(result.alreadyHad ? 'promo.alreadyHad' : 'promo.added'),
          ),
        ),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _claiming = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.errorText(e))),
      );
    }
  }

  Future<void> _openAddSheet() async {
    _code.clear();
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setLocal) => AlertDialog(
          title: Text(dialogContext.t('promo.addTitle')),
          content: TextField(
            controller: _code,
            autofocus: true,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(hintText: dialogContext.t('promo.placeholder')),
          ),
          actions: [
            TextButton(
              onPressed: _claiming ? null : () => Navigator.of(dialogContext).pop(),
              child: Text(dialogContext.t('promo.cancel')),
            ),
            FilledButton(
              onPressed: _claiming
                  ? null
                  : () async {
                      setLocal(() {});
                      await _claim();
                    },
              child: Text(dialogContext.t('promo.apply')),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(context.t('promo.title'))),
        body: RefreshIndicator(onRefresh: _load, child: _body(context)),
        bottomNavigationBar: _loading || _error != null
            ? null
            : SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                  child: FilledButton.icon(
                    onPressed: _openAddSheet,
                    icon: const Icon(Icons.local_offer_outlined, size: 18),
                    label: Text(context.t('promo.add')),
                  ),
                ),
              ),
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

    if (_items.isEmpty) {
      // TO'QIMA promokod ko'rsatilmaydi.
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(32),
        children: [
          SizedBox(height: MediaQuery.sizeOf(context).height * 0.14),
          const Icon(Icons.local_offer_outlined, size: 42, color: SellobayColors.mutedText),
          const SizedBox(height: 14),
          Text(
            context.t('promo.empty'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            context.t('promo.emptyDesc'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, height: 1.45, color: SellobayColors.mutedText),
          ),
        ],
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
      itemCount: _items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, i) => CouponCard(coupon: _items[i]),
    );
  }
}
