import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../widgets/delivery_status_chip.dart';

/// Bitta topshiriq va holatni o'zgartirish tugmalari.
///
/// Tugmalar ro'yxati SERVERDAN keladi (`nextStatuses`). O'tish
/// qoidalarini Dart'da takrorlasak, ikkisi vaqt o'tib ajralib ketardi
/// va ilova serverda rad etiladigan tugmani ko'rsatardi.
class DeliveryDetailScreen extends StatefulWidget {
  const DeliveryDetailScreen({super.key, required this.delivery});

  final CourierDelivery delivery;

  @override
  State<DeliveryDetailScreen> createState() => _DeliveryDetailScreenState();
}

class _DeliveryDetailScreenState extends State<DeliveryDetailScreen> {
  late CourierDelivery _delivery = widget.delivery;
  bool _busy = false;

  /// Sabab maydoni.
  ///
  /// Ekranning O'ZIGA tegishli: dialog yopilgach darhol `dispose()`
  /// qilsak, chiqish animatsiyasi hali tugamagan bo'ladi va `TextField`
  /// yo'q qilingan kontroller bilan qayta quriladi
  /// («A TextEditingController was used after being disposed»).
  final _reason = TextEditingController();

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  CourierRepository get _repo => SellobayRuntimeScope.of(context).courier;

  Future<void> _move(DeliveryStatus next) async {
    String? note;

    // `FAILED` uchun sabab MAJBURIY — serverda ham shunday
    // (`400 REASON_REQUIRED`). Bo'sh yuborib, keyin xato olishdan
    // ko'ra oldindan so'raganimiz yaxshi.
    if (next == DeliveryStatus.failed) {
      note = await _askReason();
      if (note == null) return;
    }

    setState(() => _busy = true);
    try {
      final updated = await _repo.updateStatus(_delivery.id, next, note: note);
      if (!mounted) return;
      setState(() {
        _delivery = updated;
        _busy = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.t('courier.statusUpdated'))),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.errorText(e))),
      );
    }
  }

  Future<String?> _askReason() {
    _reason.clear();
    return showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(dialogContext.t('courier.failReason')),
        content: TextField(
          controller: _reason,
          autofocus: true,
          maxLines: 2,
          decoration: InputDecoration(hintText: dialogContext.t('courier.failReasonHint')),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text(dialogContext.t('common.cancel')),
          ),
          FilledButton(
            onPressed: () {
              // Bo'sh sabab bilan yopmaymiz — serverda ham u majburiy.
              final text = _reason.text.trim();
              if (text.isEmpty) return;
              Navigator.of(dialogContext).pop(text);
            },
            child: Text(dialogContext.t('common.confirm')),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final locale = SellobayRuntimeScope.of(context).locale.locale;
    final delivery = _delivery;

    return Scaffold(
      appBar: AppBar(title: Text(delivery.orderNumber)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        children: [
          Row(
            children: [
              DeliveryStatusChip(
                status: delivery.status,
                rawStatus: delivery.rawStatus,
                claimed: delivery.claimed,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  formatMoney(delivery.orderTotal),
                  textAlign: TextAlign.right,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: SellobayColors.ink,
                  ),
                ),
              ),
            ],
          ),
          if (delivery.failureReason != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
              decoration: BoxDecoration(
                color: SellobayColors.destructive.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                delivery.failureReason!,
                style: const TextStyle(fontSize: 12.5, color: SellobayColors.destructive),
              ),
            ),
          ],
          const SizedBox(height: 22),
          _section(context.t('courier.address')),
          Text(
            delivery.destinationAddress,
            style: const TextStyle(fontSize: 14, height: 1.45, color: SellobayColors.ink),
          ),
          if (delivery.recipientName != null) ...[
            const SizedBox(height: 20),
            _section(context.t('courier.recipient')),
            Text(
              delivery.recipientName!,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
            if (delivery.recipientPhone != null) ...[
              const SizedBox(height: 2),
              SelectableText(
                delivery.recipientPhone!,
                style: const TextStyle(fontSize: 14, color: SellobayColors.primary),
              ),
            ],
          ],
          const SizedBox(height: 20),
          _section(context.t('tracking.items')),
          for (final item in delivery.items)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${item.quantity}×',
                    style: const TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: SellobayColors.mutedText,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      item.name.pick(locale),
                      style: const TextStyle(fontSize: 13.5, height: 1.35),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 26),
          ..._actions(context, delivery),
        ],
      ),
    );
  }

  List<Widget> _actions(BuildContext context, CourierDelivery delivery) {
    if (delivery.nextStatuses.isEmpty) {
      // Yakuniy holat — boshqa tugma yo'q.
      return const [];
    }
    return [
      for (final next in delivery.nextStatuses)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: next == DeliveryStatus.failed
              ? OutlinedButton(
                  onPressed: _busy ? null : () => _move(next),
                  style: OutlinedButton.styleFrom(foregroundColor: SellobayColors.destructive),
                  child: Text(context.t(next.actionKey)),
                )
              : FilledButton(
                  onPressed: _busy ? null : () => _move(next),
                  child: Text(context.t(next.actionKey)),
                ),
        ),
    ];
  }

  Widget _section(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
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
