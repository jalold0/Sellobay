import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../widgets/order_status_chip.dart';

/// Bitta buyurtma.
///
/// Summa taqsimoti, to'lov holati, bekor qilish va qaytarish — bularning
/// hammasi `GET /api/orders/{id}` dan keladi. Ro'yxat javobida ular
/// YO'Q, shuning uchun bu ekran alohida so'rov qiladi.
class OrderDetailScreen extends StatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  OrderDetail? _order;
  bool _loading = true;
  bool _busy = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  OrdersRepository get _repo => SellobayRuntimeScope.of(context).orders;

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final order = await _repo.fetchOrder(widget.orderId);
      if (!mounted) return;
      setState(() {
        _order = order;
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

  /// Bekor qilish yoki qaytarish — ikkalasi ham tasdiq so'raydi va
  /// natijada buyurtma qayta yuklanadi (holatni server hal qiladi).
  Future<void> _act({
    required String confirmKey,
    required String doneKey,
    required Future<void> Function() action,
  }) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        content: Text(dialogContext.t(confirmKey)),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(dialogContext.t('common.no')),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(dialogContext.t('common.yes')),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _busy = true);
    try {
      await action();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.t(doneKey))),
      );
    } catch (e) {
      if (!mounted) return;
      // Server «allaqachon qabul qilingan» desa ham, bu rost xabar —
      // uni o'zimiz qayta yozmaymiz.
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
    final order = _order;

    return Scaffold(
      appBar: AppBar(title: Text(order?.number ?? context.t('profile.ordersPage.title'))),
      body: switch ((_loading, _error, order)) {
        (true, _, _) => const Center(
            child: SizedBox(
              width: 26,
              height: 26,
              child: CircularProgressIndicator(strokeWidth: 2.5, color: SellobayColors.primary),
            ),
          ),
        (_, final Object error, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.cloud_off, size: 42, color: SellobayColors.mutedText),
                  const SizedBox(height: 14),
                  Text(
                    context.errorText(error),
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 18),
                  FilledButton(onPressed: _load, child: Text(context.t('common.retry'))),
                ],
              ),
            ),
          ),
        (_, _, final OrderDetail o) => _detail(context, o),
        _ => const SizedBox.shrink(),
      },
    );
  }

  Widget _detail(BuildContext context, OrderDetail order) {
    final locale = SellobayRuntimeScope.of(context).locale.locale;
    final baseUrl = SellobayRuntimeScope.of(context).api.baseUrl;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      children: [
        Row(
          children: [
            OrderStatusChip(status: order.status, rawStatus: order.rawStatus),
            const SizedBox(width: 10),
            if (order.placedAt != null)
              // `Expanded` SHART: tor ekranda sana belgining yoniga
              // sig'maydi va qator toshib ketadi (test ushlagan edi).
              Expanded(
                child: Text(
                  formatOrderDateTime(order.placedAt!),
                  textAlign: TextAlign.right,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
                ),
              ),
          ],
        ),
        if (order.paymentReview) ...[
          const SizedBox(height: 10),
          _note(context.t('order.paymentReview'), SellobayColors.accent),
        ],
        const SizedBox(height: 20),
        _sectionTitle(context.t('tracking.items')),
        for (final line in order.items) _line(context, line, locale, baseUrl),
        const SizedBox(height: 20),
        _sectionTitle(context.t('checkout.summary')),
        _summary(context, order),
        if (order.address != null) ...[
          const SizedBox(height: 20),
          _sectionTitle(context.t('checkout.review.addressLabel')),
          _addressBlock(context, order),
        ],
        if (order.pickupPointName != null) ...[
          const SizedBox(height: 20),
          _sectionTitle(context.t('checkout.shipping.pickup')),
          Text(
            order.pickupPointName!.pick(locale),
            style: const TextStyle(fontSize: 13.5, color: SellobayColors.ink),
          ),
        ],
        if (order.notes != null && order.notes!.isNotEmpty) ...[
          const SizedBox(height: 20),
          _sectionTitle(context.t('checkout.address.notesLabel')),
          Text(
            order.notes!,
            style: const TextStyle(fontSize: 13.5, color: SellobayColors.mutedText),
          ),
        ],
        const SizedBox(height: 26),
        ..._actions(context, order),
      ],
    );
  }

  List<Widget> _actions(BuildContext context, OrderDetail order) {
    final buttons = <Widget>[];

    // Server qoidasi: faqat PENDING bekor qilinadi.
    if (order.status?.isCancellable ?? false) {
      buttons.add(
        OutlinedButton(
          onPressed: _busy
              ? null
              : () => _act(
                    confirmKey: 'profile.ordersPage.cancelConfirm',
                    doneKey: 'profile.ordersPage.cancelled',
                    action: () => _repo.cancelOrder(order.id),
                  ),
          style: OutlinedButton.styleFrom(foregroundColor: SellobayColors.destructive),
          child: Text(context.t('profile.ordersPage.cancelOrder')),
        ),
      );
    }

    // Qaytarish oynasini SERVER hisoblaydi — biz `returnable` ga ishonamiz.
    if (order.returnable) {
      if (buttons.isNotEmpty) buttons.add(const SizedBox(height: 10));
      buttons.add(
        OutlinedButton(
          onPressed: _busy
              ? null
              : () => _act(
                    confirmKey: 'profile.ordersPage.returnConfirm',
                    doneKey: 'profile.ordersPage.returnRequested',
                    action: () => _repo.requestReturn(order.id),
                  ),
          child: Text(context.t('profile.ordersPage.requestReturn')),
        ),
      );
    }

    if (buttons.isEmpty && order.status?.isDelivered == true && order.returnWindowDays > 0) {
      // Yetkazilgan, lekin oyna yopilgan — sababini aytamiz.
      buttons.add(
        Text(
          context.t('profile.ordersPage.returnWindow', params: {'days': order.returnWindowDays}),
          style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
        ),
      );
    }

    return buttons;
  }

  Widget _sectionTitle(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: SellobayColors.ink,
          ),
        ),
      );

  Widget _note(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(text, style: TextStyle(fontSize: 12.5, color: color)),
      );

  Widget _line(BuildContext context, OrderLine line, String locale, String baseUrl) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: SizedBox(
                width: 56,
                height: 56,
                child: ProductThumbnail(
                  url: resolveProductImageUrl(
                    dbUrl: line.rawImageUrl,
                    slug: line.slug ?? '',
                    baseUrl: baseUrl,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    // Buyurtma berilgan paytdagi nom — katalogdagi joriy
                    // nom emas.
                    line.name.pick(locale),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14,
                      height: 1.3,
                      fontWeight: FontWeight.w600,
                      color: SellobayColors.ink,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    context.t('checkout.pcs', params: {'count': line.quantity}),
                    style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 10),
            Text(
              formatMoney(line.totalPrice),
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: SellobayColors.ink,
              ),
            ),
          ],
        ),
      );

  Widget _summary(BuildContext context, OrderDetail order) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: SellobayColors.soft,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            _row(context.t('checkout.summaryItems'), formatMoney(order.subtotal)),
            _row(context.t('checkout.summaryShipping'), formatMoney(order.shippingTotal)),
            if (order.hasDiscount)
              _row(context.t('checkout.summaryDiscount'), '−${formatMoney(order.discountTotal)}'),
            if (order.promoCode != null)
              _row(context.t('cart.promoCode'), order.promoCode!),
            const Divider(height: 18),
            _row(context.t('checkout.summaryTotal'), formatMoney(order.grandTotal), bold: true),
          ],
        ),
      );

  Widget _addressBlock(BuildContext context, OrderDetail order) {
    final address = order.address!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          address.recipientName,
          style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 2),
        Text(
          address.phone,
          style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
        ),
        const SizedBox(height: 2),
        Text(
          address.oneLine,
          style: const TextStyle(fontSize: 13, height: 1.4, color: SellobayColors.mutedText),
        ),
      ],
    );
  }

  Widget _row(String label, String value, {bool bold = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: bold ? 15 : 13.5,
                fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
                color: bold ? SellobayColors.ink : SellobayColors.mutedText,
              ),
            ),
            Flexible(
              child: Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: bold ? 16 : 13.5,
                  fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
                  color: SellobayColors.ink,
                ),
              ),
            ),
          ],
        ),
      );
}
