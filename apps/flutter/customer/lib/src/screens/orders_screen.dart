import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../widgets/order_status_chip.dart';
import 'order_detail_screen.dart';

/// Buyurtmalarim.
///
/// Server oxirgi 50 tasini qaytaradi (`listUserOrders` da `take: 50`) —
/// shuning uchun bu yerda varaqlash yo'q va "hammasi shu" deb da'vo
/// qilinmaydi.
class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<OrderSummary> _orders = const [];
  bool _loading = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final orders = await SellobayRuntimeScope.of(context).orders.fetchOrders();
      if (!mounted) return;
      setState(() {
        _orders = orders;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.t('profile.ordersPage.title'))),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _body(context),
      ),
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
      return _message(
        context,
        icon: Icons.cloud_off,
        title: context.errorText(_error!),
        action: FilledButton(onPressed: _load, child: Text(context.t('common.retry'))),
      );
    }

    if (_orders.isEmpty) {
      return _message(
        context,
        icon: Icons.receipt_long_outlined,
        title: context.t('profile.ordersPage.emptyTitle'),
        subtitle: context.t('profile.ordersPage.emptyDesc'),
      );
    }

    final locale = SellobayRuntimeScope.of(context).locale.locale;
    final baseUrl = SellobayRuntimeScope.of(context).api.baseUrl;

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      itemCount: _orders.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, index) => _OrderCard(
        order: _orders[index],
        locale: locale,
        baseUrl: baseUrl,
        onTap: () async {
          await Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => OrderDetailScreen(orderId: _orders[index].id),
            ),
          );
          // Detalda bekor qilingan bo'lishi mumkin — ro'yxatni yangilaymiz.
          if (mounted) await _load();
        },
      ),
    );
  }

  Widget _message(
    BuildContext context, {
    required IconData icon,
    required String title,
    String? subtitle,
    Widget? action,
  }) =>
      ListView(
        // Bo'sh holatda ham tortib yangilash ishlashi uchun ro'yxat.
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          SizedBox(height: MediaQuery.sizeOf(context).height * 0.22),
          Icon(icon, size: 44, color: SellobayColors.mutedText),
          const SizedBox(height: 14),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 6),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13.5, color: SellobayColors.mutedText),
            ),
          ],
          if (action != null) ...[
            const SizedBox(height: 18),
            Center(child: action),
          ],
        ],
      );
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({
    required this.order,
    required this.locale,
    required this.baseUrl,
    required this.onTap,
  });

  final OrderSummary order;
  final String locale;
  final String baseUrl;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
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
                Expanded(
                  child: Text(
                    order.number,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: SellobayColors.ink,
                    ),
                  ),
                ),
                OrderStatusChip(status: order.status, rawStatus: order.rawStatus),
              ],
            ),
            if (order.placedAt != null) ...[
              const SizedBox(height: 3),
              Text(
                formatOrderDate(order.placedAt!),
                style: const TextStyle(fontSize: 12, color: SellobayColors.mutedText),
              ),
            ],
            if (order.paymentReview) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  const Icon(Icons.hourglass_empty, size: 14, color: SellobayColors.accent),
                  const SizedBox(width: 5),
                  Text(
                    context.t('order.paymentReview'),
                    style: const TextStyle(fontSize: 12, color: SellobayColors.mutedText),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 12),
            if (order.items.isNotEmpty) _thumbnails(context),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Text(
                    context.t('profile.ordersPage.itemsCount', params: {'count': order.itemCount}),
                    style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
                  ),
                ),
                Text(
                  formatMoney(order.grandTotal),
                  style: const TextStyle(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800,
                    color: SellobayColors.ink,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _thumbnails(BuildContext context) {
    const maxShown = 4;
    final shown = order.items.take(maxShown).toList();
    final rest = order.items.length - shown.length;

    return SizedBox(
      height: 48,
      child: Row(
        children: [
          for (final line in shown)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(9),
                child: SizedBox(
                  width: 48,
                  height: 48,
                  child: ProductThumbnail(
                    url: resolveProductImageUrl(
                      dbUrl: line.rawImageUrl,
                      slug: line.slug ?? '',
                      baseUrl: baseUrl,
                    ),
                  ),
                ),
              ),
            ),
          if (rest > 0)
            Container(
              width: 48,
              height: 48,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: SellobayColors.soft,
                borderRadius: BorderRadius.circular(9),
              ),
              child: Text(
                '+$rest',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: SellobayColors.mutedText,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
