import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../widgets/order_status_chip.dart';

/// Buyurtmani raqam va telefon bo'yicha kuzatish.
///
/// Kirish TALAB QILINMAYDI: buyurtma web'da mehmon sifatida berilgan
/// bo'lishi mumkin va bunday mijozda kabinet yo'q.
class TrackOrderScreen extends StatefulWidget {
  const TrackOrderScreen({super.key});

  @override
  State<TrackOrderScreen> createState() => _TrackOrderScreenState();
}

class _TrackOrderScreenState extends State<TrackOrderScreen> {
  final _number = TextEditingController();
  final _phone = TextEditingController();

  TrackedOrder? _order;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Kirgan foydalanuvchining raqami oldindan to'ldiriladi.
    final phone = AuthScope.read(context).user?.phone;
    if (phone != null) _phone.text = phone;
  }

  @override
  void dispose() {
    _number.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _search() async {
    final number = _number.text.trim();
    final phone = _phone.text.trim();
    if (number.length < 4 || !isValidUzPhone(phone)) {
      setState(() => _error = context.t('checkout.errors.required'));
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
      _order = null;
    });
    try {
      final order = await SellobayRuntimeScope.of(context).orders.track(
            number: number,
            phone: normalizeUzPhone(phone) ?? phone,
          );
      if (!mounted) return;
      setState(() {
        _order = order;
        _busy = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        // Server «topilmadi» va «telefon mos emas» ga BIR XIL javob
        // beradi — biz ham farqlamaymiz.
        _error = context.errorText(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = _order;

    return Scaffold(
      appBar: AppBar(title: Text(context.t('tracking.title'))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        children: [
          Text(
            context.t('tracking.subtitle'),
            style: const TextStyle(fontSize: 13.5, height: 1.45, color: SellobayColors.mutedText),
          ),
          const SizedBox(height: 18),
          FormErrorBanner(_error),
          TextField(
            controller: _number,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(
              labelText: context.t('tracking.orderNumber'),
              hintText: 'ORD-2026-00012345',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              labelText: context.t('tracking.phone'),
              helperText: context.t('tracking.phoneHint'),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : _search,
            child: Text(context.t(_busy ? 'tracking.searching' : 'common.search')),
          ),
          if (order != null) ...[
            const SizedBox(height: 26),
            _result(context, order),
          ],
        ],
      ),
    );
  }

  Widget _result(BuildContext context, TrackedOrder order) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: SellobayColors.soft,
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
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: SellobayColors.ink,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                OrderStatusChip(status: order.status, rawStatus: order.rawStatus),
              ],
            ),
            const SizedBox(height: 10),
            _row(context.t('tracking.total'), formatMoney(order.total)),
            _row(
              context.t('tracking.items'),
              context.t('tracking.itemCount', params: {'count': order.itemCount}),
            ),
            if (order.placedAt != null)
              _row(context.t('tracking.placedAt'), formatOrderDateTime(order.placedAt!)),
            if (order.timeline.isNotEmpty) ...[
              const Divider(height: 22),
              for (final step in order.timeline) _step(context, step),
            ],
          ],
        ),
      );

  Widget _step(BuildContext context, TrackedStep step) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.only(top: 4),
              child: Icon(Icons.circle, size: 8, color: SellobayColors.primary),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                // Ilova bilmaydigan holat XOM ko'rsatiladi.
                step.status == null ? step.rawStatus : context.t(step.status!.labelKey),
                style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600),
              ),
            ),
            if (step.at != null)
              Text(
                formatOrderDateTime(step.at!),
                style: const TextStyle(fontSize: 12, color: SellobayColors.mutedText),
              ),
          ],
        ),
      );

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
              ),
            ),
            const SizedBox(width: 10),
            Flexible(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerRight,
                child: Text(
                  value,
                  maxLines: 1,
                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
      );
}
