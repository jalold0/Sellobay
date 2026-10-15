import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../courier_location.dart';
import '../external_actions.dart';
import '../widgets/delivery_status_chip.dart';
import 'scan_screen.dart';

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
    _code.dispose();
    super.dispose();
  }

  CourierRepository get _repo => SellobayRuntimeScope.of(context).courier;

  Future<void> _move(DeliveryStatus next) async {
    // Mijozga topshirish — kod bilan (ADR 0017), oddiy tugma emas.
    if (next == DeliveryStatus.delivered && _delivery.handover.required) {
      await _handOver();
      return;
    }

    String? note;

    // `FAILED` uchun sabab MAJBURIY — serverda ham shunday
    // (`400 REASON_REQUIRED`). Bo'sh yuborib, keyin xato olishdan
    // ko'ra oldindan so'raganimiz yaxshi.
    if (next == DeliveryStatus.failed) {
      note = await _askReason();
      if (note == null) return;
    }

    await _send(next, note: note);
  }

  /// Holatni yuboradi. Xato bo'lsa matnini qaytaradi (topshirish oynasi
  /// uni skaner ostida ko'rsatadi), muvaffaqiyatda — `null`.
  Future<String?> _send(
    DeliveryStatus next, {
    String? note,
    HandoverProof? handover,
    String successKey = 'courier.statusUpdated',
    bool toastError = true,
  }) async {
    setState(() => _busy = true);
    // Joylashuv — «iloji bo'lsa»: aniqlanmasa ham holat yuboriladi.
    final gps = await CourierLocation.current();
    try {
      final updated = await _repo.updateStatus(
        _delivery.id,
        next,
        note: note,
        latitude: gps?.latitude,
        longitude: gps?.longitude,
        handover: handover,
        // Surat FAQAT yakuniy holatlarga biriktiriladi — server ham
        // shunday (`400 PROOF_NOT_ALLOWED`). Oraliq holatda yuborsak,
        // o'tish butunlay rad etilardi.
        proofPhotoUrl: next == DeliveryStatus.delivered || next == DeliveryStatus.failed
            ? _proofPath
            : null,
      );
      if (!mounted) return null;
      setState(() {
        _delivery = updated;
        _busy = false;
      });
      _toast(context.t(successKey));
      return null;
    } catch (e) {
      if (!mounted) return null;
      setState(() => _busy = false);
      final text = context.errorText(e);
      if (toastError) _toast(text);
      // Noto'g'ri kod urinishlar sonini kamaytirgan — qolganini yangilaymiz.
      if (handover != null) await _refresh();
      return text;
    }
  }

  /// Urinishlar sonini serverdan qayta o'qiydi (noto'g'ri koddan keyin).
  Future<void> _refresh() async {
    try {
      final list = await _repo.fetchDeliveries();
      final fresh = list.mine.where((d) => d.id == _delivery.id).firstOrNull;
      if (fresh != null && mounted) setState(() => _delivery = fresh);
    } catch (_) {
      // Yangilanmasa ham ekran ishlayveradi — keyingi urinishda server baribir aytadi.
    }
  }

  /// Mijozga topshirish: QR (afzal), og'zaki kod yoki — kod bo'lmasa — surat bilan.
  Future<void> _handOver() async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) =>
          _HandoverSheet(handover: _delivery.handover, photoReady: _proofPath != null),
    );
    if (!mounted || choice == null) return;
    switch (choice) {
      case 'QR':
        await _handOverByQr();
      case 'CODE':
        await _handOverByCode();
      case 'PHOTO':
        await _handOverByPhoto();
    }
  }

  Future<void> _handOverByQr() async {
    await Navigator.of(context).push(
      MaterialPageRoute<String>(
        builder: (scanContext) => ScanScreen(
          title: scanContext.t('courier.scanHandoverTitle'),
          manualHintKey: 'courier.handoverCodeHint',
          manualSubmitKey: 'common.confirm',
          manualDigitsOnly: true,
          onDetect: (raw) async {
            // Qo'lda terilgan 4 raqam — og'zaki kod, aks holda QR matni.
            final proof = RegExp(r'^\d{4}$').hasMatch(raw)
                ? HandoverProof.code(raw)
                : HandoverProof.qr(raw);
            final error = await _send(
              DeliveryStatus.delivered,
              handover: proof,
              successKey: 'courier.handoverDone',
              toastError: false,
            );
            return error == null ? const ScanOutcome.done() : ScanOutcome.error(error);
          },
        ),
      ),
    );
  }

  Future<void> _handOverByCode() async {
    final code = await _askCode();
    if (code == null) return;
    await _send(
      DeliveryStatus.delivered,
      handover: HandoverProof.code(code),
      successKey: 'courier.handoverDone',
    );
  }

  /// Kodsiz — surat va sabab majburiy; server `PHOTO` deb belgilaydi va admin ko'radi.
  Future<void> _handOverByPhoto() async {
    if (_proofPath == null) {
      await _takeProof();
      if (!mounted || _proofPath == null) return;
    }
    final reason = await _askReason(
      titleKey: 'courier.handoverReason',
      hintKey: 'courier.handoverReasonHint',
    );
    if (reason == null) return;
    await _send(DeliveryStatus.delivered, note: reason, successKey: 'courier.handoverDone');
  }

  final _code = TextEditingController();

  Future<String?> _askCode() {
    _code.clear();
    return showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(dialogContext.t('courier.handoverCode')),
        content: TextField(
          controller: _code,
          autofocus: true,
          keyboardType: TextInputType.number,
          maxLength: 4,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: 14),
          decoration: InputDecoration(
            hintText: dialogContext.t('courier.handoverCodeHint'),
            hintStyle: const TextStyle(fontSize: 14, letterSpacing: 0),
            counterText: '',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text(dialogContext.t('common.cancel')),
          ),
          FilledButton(
            onPressed: () {
              final text = _code.text.trim();
              if (!RegExp(r'^\d{4}$').hasMatch(text)) return;
              Navigator.of(dialogContext).pop(text);
            },
            child: Text(dialogContext.t('courier.handoverConfirm')),
          ),
        ],
      ),
    );
  }

  Future<void> _call(String phone) async {
    final ok = await openFirst([callUri(phone)]);
    if (!ok && mounted) _toast(context.t('courier.cannotOpen'));
  }

  Future<void> _navigate({double? latitude, double? longitude, required String address}) async {
    final ok = await openFirst(
      navigationUris(latitude: latitude, longitude: longitude, address: address),
    );
    if (!ok && mounted) _toast(context.t('courier.cannotOpen'));
  }

  /// Sarlavha + manzil + «yo'l ko'rsatish» tugmasi.
  List<Widget> _addressBlock(
    BuildContext context, {
    required String title,
    required String address,
    required double? latitude,
    required double? longitude,
  }) => [
    _section(title),
    Text(address, style: const TextStyle(fontSize: 14, height: 1.45, color: SellobayColors.ink)),
    const SizedBox(height: 10),
    Align(
      alignment: Alignment.centerLeft,
      child: OutlinedButton.icon(
        onPressed: () => _navigate(latitude: latitude, longitude: longitude, address: address),
        icon: const Icon(Icons.directions_outlined, size: 18),
        label: Text(context.t('courier.navigate')),
      ),
    ),
    const SizedBox(height: 18),
  ];

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

  Future<String?> _askReason({
    String titleKey = 'courier.failReason',
    String hintKey = 'courier.failReasonHint',
  }) {
    _reason.clear();
    return showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(dialogContext.t(titleKey)),
        content: TextField(
          controller: _reason,
          autofocus: true,
          maxLines: 2,
          decoration: InputDecoration(hintText: dialogContext.t(hintKey)),
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
      // Holat tugmalari pastda mahkamlangan: ro'yxat (tovarlar, naqd, izoh) uzun
      // bo'lsa ham kuryer asosiy amalni qidirib aylantirmaydi.
      bottomNavigationBar: delivery.nextStatuses.isEmpty
          ? null
          : SafeArea(
              child: Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: SellobayColors.border)),
                ),
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 2),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: _actions(context, delivery),
                ),
              ),
            ),
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
          if (delivery.parcelCode != null) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                const Icon(Icons.qr_code_2, size: 18, color: SellobayColors.mutedText),
                const SizedBox(width: 6),
                Text(
                  '${context.t('courier.parcelCode')} ${delivery.parcelCode}',
                  style: const TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.6,
                    color: SellobayColors.ink,
                  ),
                ),
              ],
            ),
          ],
          // Naqd pul — kuryer eng avval shuni bilishi kerak: posilkani berishdan
          // OLDIN olinadi. To'langan buyurtmada mijozdan pul so'ralmasin.
          if (!delivery.isReturn) ...[
            const SizedBox(height: 14),
            _CashBanner(amount: delivery.codAmount),
          ],
          if (delivery.notes != null && delivery.notes!.trim().isNotEmpty) ...[
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: SellobayColors.soft,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: SellobayColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    context.t('courier.notes'),
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: SellobayColors.mutedText,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    delivery.notes!,
                    style: const TextStyle(fontSize: 13.5, height: 1.4, color: SellobayColors.ink),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 22),
          // Qaytarishda YO'NALISH teskari: mahsulot mijozdan OLINADI va
          // omborga topshiriladi. Ikkala manzil ham ko'rsatiladi, aks
          // holda kuryer qayerga borishni bilmasdi.
          if (delivery.isReturn) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: SellobayColors.destructive.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                context.t('courier.returnHint'),
                style: const TextStyle(
                  fontSize: 12.5,
                  height: 1.4,
                  fontWeight: FontWeight.w600,
                  color: SellobayColors.destructive,
                ),
              ),
            ),
            const SizedBox(height: 18),
            if (delivery.pickupAddress != null)
              ..._addressBlock(
                context,
                title: context.t('courier.pickupFrom'),
                address: delivery.pickupAddress!,
                // Mijozning koordinatasi saqlanmaydi — matn bo'yicha
                // qidiriladi. `destinationLat/Lng` qaytarishda OMBORGA
                // tegishli, mijozga emas.
                latitude: null,
                longitude: null,
              ),
            ..._addressBlock(
              context,
              title: context.t('courier.returnTo'),
              address: delivery.destinationAddress,
              latitude: delivery.latitude,
              longitude: delivery.longitude,
            ),
          ] else
            ..._addressBlock(
              context,
              title: context.t('courier.address'),
              address: delivery.destinationAddress,
              latitude: delivery.latitude,
              longitude: delivery.longitude,
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
          for (final item in delivery.items) _ItemRow(item: item, locale: locale),
          const SizedBox(height: 26),
          ..._proofSection(context, delivery),
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
    final canFinish =
        delivery.nextStatuses.contains(DeliveryStatus.delivered) ||
        delivery.nextStatuses.contains(DeliveryStatus.failed);
    if (!canFinish) {
      // Yakuniy holatda — allaqachon biriktirilganini ko'rsatamiz.
      if (!delivery.hasProofPhoto) return const [];
      return [_attachedRow(context.t('courier.photoAttached')), const SizedBox(height: 20)];
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
    // Bitta asosiy amal to'ldirilgan: «Yetkazdim» bo'lsa — u, oraliq holat
    // («Yetib keldim») esa ikkinchi darajali. Ikki bir xil bordo tugma
    // eshik oldida qaysi biri kerakligini ko'rsatmasdi.
    final deliverable = delivery.nextStatuses.contains(DeliveryStatus.delivered);
    Widget button(DeliveryStatus next) {
      void onTap() => _move(next);
      if (next == DeliveryStatus.failed) {
        return OutlinedButton(
          onPressed: _busy ? null : onTap,
          style: OutlinedButton.styleFrom(foregroundColor: SellobayColors.destructive),
          child: Text(context.t(next.actionKey)),
        );
      }
      if (next == DeliveryStatus.delivered && delivery.handover.required) {
        return FilledButton.icon(
          onPressed: _busy ? null : onTap,
          icon: const Icon(Icons.qr_code_scanner, size: 20),
          label: Text(context.t('courier.handOver')),
        );
      }
      if (deliverable && next != DeliveryStatus.delivered) {
        return OutlinedButton(
          onPressed: _busy ? null : onTap,
          child: Text(context.t(next.actionKey)),
        );
      }
      return FilledButton(onPressed: _busy ? null : onTap, child: Text(context.t(next.actionKey)));
    }

    return [
      for (final next in delivery.nextStatuses)
        Padding(padding: const EdgeInsets.only(bottom: 10), child: button(next)),
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

/// Naqd pul banneri: to'ldirilgan bordo — olinadi; yashil belgi — to'langan.
class _CashBanner extends StatelessWidget {
  const _CashBanner({required this.amount});

  /// Olinadigan summa (`Decimal`); `null` — to'langan.
  final Object? amount;

  @override
  Widget build(BuildContext context) {
    final cash = amount;
    if (cash == null) {
      return Row(
        children: [
          const Icon(Icons.verified_outlined, size: 18, color: SellobayColors.success),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              context.t('courier.paid'),
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
                color: SellobayColors.success,
              ),
            ),
          ),
        ],
      );
    }
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        color: SellobayColors.primary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          const Icon(Icons.payments_outlined, color: SellobayColors.accent, size: 26),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  context.t('courier.cod', params: {'amount': formatMoney(cash)}),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  context.t('courier.codHint'),
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.82), fontSize: 12.5),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Pozitsiya: rasm, nom, variant va SKU — kuryer posilka ichidagini tekshira olsin.
class _ItemRow extends StatelessWidget {
  const _ItemRow({required this.item, required this.locale});

  final DeliveryItem item;
  final String locale;

  @override
  Widget build(BuildContext context) {
    final options = item.options
        .map((o) => '${o.name.pick(locale)}: ${o.value.pick(locale)}')
        .join(', ');
    final image = item.imageUrl;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Container(
              width: 52,
              height: 52,
              color: SellobayColors.soft,
              child: image == null
                  ? const Icon(Icons.inventory_2_outlined, color: SellobayColors.mutedText)
                  : Image.network(
                      image,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) =>
                          const Icon(Icons.inventory_2_outlined, color: SellobayColors.mutedText),
                    ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name.pick(locale),
                  style: const TextStyle(
                    fontSize: 13.5,
                    height: 1.3,
                    fontWeight: FontWeight.w600,
                    color: SellobayColors.ink,
                  ),
                ),
                if (options.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      options,
                      style: const TextStyle(fontSize: 12.5, color: SellobayColors.ink),
                    ),
                  ),
                if (item.sku != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      context.t('courier.sku', params: {'sku': item.sku}),
                      style: const TextStyle(fontSize: 11.5, color: SellobayColors.mutedText),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Text(
            '×${item.quantity}',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: SellobayColors.ink,
            ),
          ),
        ],
      ),
    );
  }
}

/// Topshirish usullari — ustunlik tartibida. QR eng ishonchli (posilka ham
/// tekshiriladi), kod — mijozning telefoni qo'lida bo'lmasa, surat — oxirgi chora.
class _HandoverSheet extends StatelessWidget {
  const _HandoverSheet({required this.handover, required this.photoReady});

  final HandoverState handover;

  /// Isbot surati allaqachon olinganmi — «kodsiz» varianti shunda tezroq.
  final bool photoReady;

  @override
  Widget build(BuildContext context) {
    final locked = handover.locked;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(context.t('courier.handOver'), style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(
              locked
                  ? context.t('courier.handoverLocked')
                  : context.t('courier.attemptsLeft', params: {'count': handover.attemptsLeft}),
              style: TextStyle(
                fontSize: 12.5,
                color: locked ? SellobayColors.destructive : SellobayColors.mutedText,
              ),
            ),
            const SizedBox(height: 14),
            _option(
              context,
              value: 'QR',
              icon: Icons.qr_code_scanner,
              titleKey: 'courier.handoverScan',
              hintKey: 'courier.handoverScanHint',
              enabled: !locked,
              primary: true,
            ),
            _option(
              context,
              value: 'CODE',
              icon: Icons.pin_outlined,
              titleKey: 'courier.handoverCode',
              hintKey: 'courier.handoverCodeHint',
              enabled: !locked,
            ),
            _option(
              context,
              value: 'PHOTO',
              icon: photoReady ? Icons.check_circle_outline : Icons.photo_camera_outlined,
              titleKey: 'courier.handoverPhoto',
              hintKey: 'courier.handoverPhotoHint',
              enabled: true,
            ),
          ],
        ),
      ),
    );
  }

  Widget _option(
    BuildContext context, {
    required String value,
    required IconData icon,
    required String titleKey,
    required String hintKey,
    required bool enabled,
    bool primary = false,
  }) {
    final fg = primary ? Colors.white : SellobayColors.ink;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: primary ? SellobayColors.primary : Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: primary ? BorderSide.none : const BorderSide(color: SellobayColors.border),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: enabled ? () => Navigator.of(context).pop(value) : null,
          child: Opacity(
            opacity: enabled ? 1 : 0.4,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: Row(
                children: [
                  Icon(icon, color: primary ? SellobayColors.accent : SellobayColors.primary),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.t(titleKey),
                          style: TextStyle(color: fg, fontSize: 14.5, fontWeight: FontWeight.w700),
                        ),
                        Text(
                          context.t(hintKey),
                          style: TextStyle(
                            color: primary
                                ? Colors.white.withValues(alpha: 0.8)
                                : SellobayColors.mutedText,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
