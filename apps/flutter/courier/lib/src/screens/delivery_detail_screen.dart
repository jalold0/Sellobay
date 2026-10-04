import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../external_actions.dart';
import '../widgets/delivery_status_chip.dart';

/// Bitta topshiriq va holatni o'zgartirish tugmalari.
///
/// Tugmalar ro'yxati SERVERDAN keladi (`nextStatuses`). O'tish
/// qoidalarini Dart'da takrorlasak, ikkisi vaqt o'tib ajralib ketardi
/// va ilova serverda rad etiladigan tugmani ko'rsatardi.
class DeliveryDetailScreen extends StatefulWidget {
  const DeliveryDetailScreen({super.key, required this.delivery});

  /// Testda almashtiriladi — kamera widget testida ishlamaydi
  /// (platforma kanali yo'q, chaqiruv javobsiz osilib qolardi).
  @visibleForTesting
  static ImagePicker picker = ImagePicker();

  final CourierDelivery delivery;

  @override
  State<DeliveryDetailScreen> createState() => _DeliveryDetailScreenState();
}

class _DeliveryDetailScreenState extends State<DeliveryDetailScreen> {
  late CourierDelivery _delivery = widget.delivery;
  bool _busy = false;

  /// Yuklangan isbot suratining ichki yo'li (hali biriktirilmagan).
  String? _proofPath;
  bool _photoBusy = false;

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
      final updated = await _repo.updateStatus(
        _delivery.id,
        next,
        note: note,
        // Surat FAQAT yakuniy holatlarga biriktiriladi — server ham
        // shunday (`400 PROOF_NOT_ALLOWED`). Oraliq holatda yuborsak,
        // o'tish butunlay rad etilardi.
        proofPhotoUrl: next == DeliveryStatus.delivered || next == DeliveryStatus.failed
            ? _proofPath
            : null,
      );
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

  Future<void> _call(String phone) async {
    final ok = await openFirst([callUri(phone)]);
    if (!ok && mounted) _toast(context.t('courier.cannotOpen'));
  }

  Future<void> _navigate(CourierDelivery d) async {
    final ok = await openFirst(
      navigationUris(
        latitude: d.latitude,
        longitude: d.longitude,
        address: d.destinationAddress,
      ),
    );
    if (!ok && mounted) _toast(context.t('courier.cannotOpen'));
  }

  /// Isbot suratini oladi va DARHOL yuklaydi.
  ///
  /// Holat o'zgartirishdan alohida: surat bir necha megabayt, tarmoq
  /// uzilsa butun o'tishni qayta yuborish kerak bo'lardi.
  Future<void> _takeProof() async {
    final shot = await DeliveryDetailScreen.picker.pickImage(
      // Galereya EMAS: isbot topshirish paytida olinishi kerak, eski
      // suratni biriktirish uni ma'nosiz qilardi.
      source: ImageSource.camera,
      // Server 4 MB gacha qabul qiladi.
      maxWidth: 1600,
      imageQuality: 80,
    );
    if (shot == null || !mounted) return;

    setState(() => _photoBusy = true);
    try {
      final bytes = await shot.readAsBytes();
      final path = await _repo.uploadProofPhoto(bytes: bytes, filename: shot.name);
      if (!mounted) return;
      setState(() {
        _proofPath = path;
        _photoBusy = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _photoBusy = false;
        // Eski yo'l qolib ketmasin — kuryer yuklandi deb o'ylamasin.
        _proofPath = null;
      });
      _toast(context.errorText(e));
    }
  }

  void _toast(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
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
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton.icon(
              onPressed: () => _navigate(delivery),
              icon: const Icon(Icons.directions_outlined, size: 18),
              label: Text(context.t('courier.navigate')),
            ),
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
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerLeft,
                // `FilledButton` EMAS: to'ldirilgan tugmalar bu ekranda
                // holat o'zgartirish uchun ajratilgan. Qo'ng'iroq va
                // yo'l ko'rsatish — boshqa toifa: ular topshiriqni
                // o'zgartirmaydi, boshqa ilovaga o'tkazadi.
                child: OutlinedButton.icon(
                  onPressed: () => _call(delivery.recipientPhone!),
                  icon: const Icon(Icons.call_outlined, size: 18),
                  label: Text(context.t('courier.call')),
                ),
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
          ..._proofSection(context, delivery),
          ..._actions(context, delivery),
        ],
      ),
    );
  }

  /// Isbot surati bo'limi.
  ///
  /// Faqat yakuniy holatga o'tish MUMKIN bo'lganda ko'rinadi: yo'lda
  /// ketayotgan kuryerga surat tugmasi kerak emas, topshirish paytida
  /// esa kerak.
  ///
  /// Surat MAJBURIY EMAS. Majburiy qilsak, kamerasi ishlamagan yoki
  /// ruxsat bermagan kuryer topshiriqni umuman yopa olmay qolardi —
  /// va buyurtma mijozda «yo'lda» bo'lib muzlab turardi.
  List<Widget> _proofSection(BuildContext context, CourierDelivery delivery) {
    final canFinish = delivery.nextStatuses.contains(DeliveryStatus.delivered) ||
        delivery.nextStatuses.contains(DeliveryStatus.failed);
    if (!canFinish) {
      // Yakuniy holatda — allaqachon biriktirilganini ko'rsatamiz.
      if (!delivery.hasProofPhoto) return const [];
      return [
        _attachedRow(context.t('courier.photoAttached')),
        const SizedBox(height: 20),
      ];
    }

    final attached = _proofPath != null;
    return [
      _section(context.t('courier.proofPhoto')),
      Text(
        context.t('courier.proofPhotoHint'),
        style: const TextStyle(fontSize: 12.5, height: 1.4, color: SellobayColors.mutedText),
      ),
      const SizedBox(height: 10),
      if (attached) _attachedRow(context.t('courier.photoAttached')),
      if (attached) const SizedBox(height: 8),
      Align(
        alignment: Alignment.centerLeft,
        child: OutlinedButton.icon(
          onPressed: _photoBusy || _busy ? null : _takeProof,
          icon: const Icon(Icons.photo_camera_outlined, size: 18),
          label: Text(
            context.t(
              _photoBusy
                  ? 'courier.photoUploading'
                  : attached
                      ? 'courier.retakePhoto'
                      : 'courier.takePhoto',
            ),
          ),
        ),
      ),
      const SizedBox(height: 22),
    ];
  }

  Widget _attachedRow(String text) => Row(
        children: [
          const Icon(Icons.check_circle_outline, size: 17, color: SellobayColors.success),
          const SizedBox(width: 7),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: SellobayColors.success,
              ),
            ),
          ),
        ],
      );

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
