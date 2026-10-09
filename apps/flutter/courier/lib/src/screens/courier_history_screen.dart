import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../widgets/delivery_card.dart';
import 'delivery_detail_screen.dart';

/// Tugagan topshiriqlar.
///
/// Asosiy ro'yxatdan ALOHIDA: kuryer kun davomida o'nlab yetkazish
/// qiladi va tugaganlari o'sha yerda qolsa, bugungi faol ish ko'rinmay
/// ketardi.
///
/// Sahifalash KURSOR bo'yicha (`id`), ofset bo'yicha emas: yangi
/// topshiriq tugagan sayin ro'yxat suriladi va ofset bilan o'qisak,
/// ayrim yozuvlar ikki marta chiqib, ayrimlari tushib qolardi.
class CourierHistoryScreen extends StatefulWidget {
  const CourierHistoryScreen({super.key});

  @override
  State<CourierHistoryScreen> createState() => _CourierHistoryScreenState();
}

class _CourierHistoryScreenState extends State<CourierHistoryScreen> {
  final _items = <CourierDelivery>[];
  String? _cursor;
  bool _hasMore = true;
  bool _loading = true;
  bool _loadingMore = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadFirst());
  }

  CourierRepository get _repo => SellobayRuntimeScope.of(context).courier;

  Future<void> _loadFirst() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = await _repo.fetchHistory();
      if (!mounted) return;
      setState(() {
        _items
          ..clear()
          ..addAll(page.items);
        _cursor = page.nextCursor;
        _hasMore = page.hasMore;
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

  Future<void> _loadMore() async {
    if (_loadingMore || !_hasMore) return;
    setState(() => _loadingMore = true);
    try {
      final page = await _repo.fetchHistory(cursor: _cursor);
      if (!mounted) return;
      setState(() {
        _items.addAll(page.items);
        _cursor = page.nextCursor;
        _hasMore = page.hasMore;
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
      // Birinchi sahifa ko'rinib turibdi — uni xato ekraniga
      // almashtirmaymiz, faqat xabar beramiz.
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.errorText(e))),
      );
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(context.t('courier.history'))),
        body: RefreshIndicator(onRefresh: _loadFirst, child: _body(context)),
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
          SizedBox(height: MediaQuery.sizeOf(context).height * 0.18),
          const Icon(Icons.cloud_off, size: 42, color: SellobayColors.mutedText),
          const SizedBox(height: 14),
          Text(
            context.errorText(_error!),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 18),
          Center(
            child: FilledButton(onPressed: _loadFirst, child: Text(context.t('common.retry'))),
          ),
        ],
      );
    }

    if (_items.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(32),
        children: [
          SizedBox(height: MediaQuery.sizeOf(context).height * 0.18),
          Text(
            context.t('courier.historyEmpty'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14, color: SellobayColors.mutedText),
          ),
        ],
      );
    }

    final locale = SellobayRuntimeScope.of(context).locale.locale;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 28),
      children: [
        for (final delivery in _items)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: DeliveryCard(
              delivery: delivery,
              locale: locale,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => DeliveryDetailScreen(delivery: delivery),
                ),
              ),
            ),
          ),
        if (_hasMore)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: OutlinedButton(
              onPressed: _loadingMore ? null : _loadMore,
              child: Text(
                context.t(_loadingMore ? 'common.loading' : 'courier.loadMore'),
              ),
            ),
          ),
      ],
    );
  }
}
