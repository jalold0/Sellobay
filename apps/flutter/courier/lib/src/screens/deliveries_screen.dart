import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../widgets/delivery_card.dart';
import 'delivery_detail_screen.dart';

/// Kuryerning topshiriqlari.
///
/// Ilgari bu ekranda `DELIVERIES` degan qotib yozilgan ikkita buyurtma
/// turardi ("ORD-2026-00001234", "Yunusobod") — bazada esa `Delivery`
/// jadvaliga hech kim yozmasdi. Endi ikkalasi ham bor: buyurtma
/// yaratilganda yozuv ochiladi, kuryer uni shu yerdan oladi.
class DeliveriesScreen extends StatefulWidget {
  const DeliveriesScreen({super.key});

  @override
  State<DeliveriesScreen> createState() => _DeliveriesScreenState();
}

class _DeliveriesScreenState extends State<DeliveriesScreen> {
  CourierDeliveries? _data;
  bool _loading = true;
  bool _busy = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  CourierRepository get _repo => SellobayRuntimeScope.of(context).courier;

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _repo.fetchDeliveries();
      if (!mounted) return;
      setState(() {
        _data = data;
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

  Future<void> _claim(CourierDelivery delivery) async {
    setState(() => _busy = true);
    try {
      await _repo.claim(delivery.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.t('courier.claimed'))),
      );
    } catch (e) {
      if (!mounted) return;
      // Boshqa kuryer ulgurgan bo'lsa server shuni aytadi.
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.errorText(e))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    if (mounted) await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.t('courier.deliveriesTitle')),
        actions: [
          IconButton(
            tooltip: context.t('profile.signOut'),
            onPressed: () => AuthScope.read(context).signOut(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: RefreshIndicator(onRefresh: _load, child: _body(context)),
    );
  }

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
          SizedBox(height: MediaQuery.sizeOf(context).height * 0.2),
          const Icon(Icons.cloud_off, size: 42, color: SellobayColors.mutedText),
          const SizedBox(height: 14),
          Text(
            context.errorText(_error!),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 18),
          Center(
            child: FilledButton(onPressed: _load, child: Text(context.t('common.retry'))),
          ),
        ],
      );
    }

    final data = _data!;
    final locale = SellobayRuntimeScope.of(context).locale.locale;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
      children: [
        _sectionTitle(context.t('courier.tabMine')),
        if (data.mine.isEmpty)
          _empty(context.t('courier.noMine'))
        else
          for (final delivery in data.mine)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: DeliveryCard(
                delivery: delivery,
                locale: locale,
                onTap: () => _openDetail(delivery),
              ),
            ),
        const SizedBox(height: 22),
        _sectionTitle(context.t('courier.tabAvailable')),
        if (data.available.isEmpty)
          _empty(context.t('courier.noAvailable'))
        else
          for (final delivery in data.available)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: DeliveryCard(
                delivery: delivery,
                locale: locale,
                onTap: () => _openDetail(delivery),
                onClaim: _busy ? null : () => _claim(delivery),
              ),
            ),
      ],
    );
  }

  Future<void> _openDetail(CourierDelivery delivery) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => DeliveryDetailScreen(delivery: delivery),
      ),
    );
    // Detalda holat o'zgargan bo'lishi mumkin.
    if (mounted) await _load();
  }

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

  Widget _empty(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Text(
          text,
          style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
        ),
      );
}
