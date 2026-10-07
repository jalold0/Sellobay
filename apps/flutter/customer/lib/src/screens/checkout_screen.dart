import 'package:decimal/decimal.dart';
import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'pickup_points_screen.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import 'order_success_screen.dart';

/// Buyurtmani rasmiylashtirish.
///
/// Yakuniy summani SERVER hisoblaydi (`orders-server.ts`). Bu yerdagi
/// xulosa faqat ko'rsatish uchun — shu sababli buyurtma yaratilgach
/// serverning `grandTotal` i ko'rsatiladi, mijoz ko'rgan taxmin emas.
class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  /// Rasm tanlovchi.
  ///
  /// Testda almashtiriladi: haqiqiysi platforma kanaliga chiqadi va
  /// testda platforma yo'q — chaqiruv javobsiz osilib qolardi.
  @visibleForTesting
  static ImagePicker picker = ImagePicker();

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _region = TextEditingController(text: 'Toshkent');
  final _city = TextEditingController();
  final _street = TextEditingController();
  final _apartment = TextEditingController();
  final _notes = TextEditingController();
  final _promoField = TextEditingController();

  /// Takroriy yuborishdan himoya: kalit checkout boshida BIR MARTA
  /// hosil qilinadi va qayta urinishlarda o'zgarmaydi. Har urinishda
  /// yangilansa, tarmoq uzilib qayta yuborilganda ikkinchi buyurtma
  /// yaratilardi.
  final String _idempotencyKey = generateUuidV4();

  List<SavedAddress> _addresses = const [];
  List<PickupPoint> _pickupPoints = const [];
  PaymentOptions? _options;
  List<PaymentProvider> _providers = const [];

  /// Yuklangan chekning ichki yo'li (`receipts/...`).
  ///
  /// Rasmning o'zi emas: server chekni yopiq saqlaydi va faqat yo'lni
  /// qaytaradi, buyurtmaga ham o'sha yuboriladi.
  String? _receiptPath;
  bool _receiptBusy = false;
  final _paymentNote = TextEditingController();

  /// Joriy coin balansi (`GET /api/loyalty`). Mehmonda 0.
  int _coinBalance = 0;
  bool _useCoins = false;

  DeliveryMethod _delivery = DeliveryMethod.homeDelivery;
  PickupPoint? _pickupPoint;
  PaymentProvider? _payment;
  PromoPreview? _promo;

  bool _loading = true;
  bool _submitting = false;
  bool _checkingPromo = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    for (final c in [_name, _phone, _region, _city, _street, _apartment, _notes, _promoField]) {
      c.dispose();
    }
    _paymentNote.dispose();
    super.dispose();
  }

  CheckoutRepository get _repo => SellobayRuntimeScope.of(context).checkout;

  bool get _signedIn => AuthScope.read(context).isSignedIn;

  Future<void> _load() async {
    final user = AuthScope.read(context).user;
    if (user != null) {
      _name.text = user.displayName;
      _phone.text = user.phone ?? '';
    }

    try {
      final options = await _repo.fetchPaymentOptions();
      if (!mounted) return;

      // Mehmon onlayn to'lovni BOSHLAY OLMAYDI: `/api/payments/create`
      // auth talab qiladi va 401 beradi. Shuning uchun unga faqat
      // naqd pul taklif qilinadi — tanlab, keyin devorga urilmasin.
      // Qo'lda karta (`UZCARD`) mehmonga ham ochiq: redirect yo'q va
      // chek yuklash endpointi auth talab qilmaydi.
      final usable = _signedIn
          ? options.selectable
          : options.selectable.where((p) => !p.isOnline).toList();

      setState(() {
        _options = options;
        _providers = usable;
        _payment = usable.isEmpty ? null : usable.first;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = context.errorText(e);
      });
    }

    // Coin balansi — faqat kirgan foydalanuvchida (`/api/loyalty` 401).
    if (_signedIn) {
      try {
        final loyalty = await SellobayRuntimeScope.of(context).loyalty.fetchSummary();
        if (mounted) setState(() => _coinBalance = loyalty.coins);
      } catch (_) {
        // Balans olinmasa coin bo'limi ko'rsatilmaydi. Raqamni
        // o'zimiz o'ylab topmaymiz.
      }
    }

    // Saqlangan manzillar — faqat kirgan foydalanuvchida.
    if (_signedIn) {
      try {
        final addresses = await _repo.fetchAddresses();
        if (!mounted) return;
        setState(() => _addresses = addresses);
        final preferred = addresses.where((a) => a.isDefault).firstOrNull ?? addresses.firstOrNull;
        if (preferred != null) _applyAddress(preferred);
      } catch (_) {
        // Manzillar yordamchi qulaylik — yuklanmasa forma qo'lda to'ldiriladi.
      }
    }
  }

  void _applyAddress(SavedAddress address) {
    setState(() {
      _name.text = address.recipientName;
      _phone.text = address.phone;
      _region.text = address.region;
      _city.text = address.city;
      _street.text = address.street;
      _apartment.text = address.apartment ?? '';
    });
  }

  Future<void> _loadPickupPoints() async {
    if (_pickupPoints.isNotEmpty) return;
    try {
      final points = await _repo.fetchPickupPoints(region: _region.text.trim());
      if (!mounted) return;
      setState(() => _pickupPoints = points);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = context.errorText(e));
    }
  }

  CartTotals _totals(BuildContext context) => computeCartTotals(
        CartScope.of(context),
        SellobayRuntimeScope.of(context).config.value,
      );

  /// 1 coin necha so'm — SERVERDAN (`/api/config`).
  ///
  /// Dart'ga ko'chirib yozsak, qoida ikki joyda bo'lib, vaqt o'tib
  /// ajralib ketardi. Qoidalar yuklanmagan bo'lsa coin bo'limi
  /// umuman ko'rsatilmaydi.
  int? _coinValueSom(BuildContext context) =>
      SellobayRuntimeScope.of(context).config.value?.loyalty.coinValueSom;

  /// Shu buyurtmada ishlatish mumkin bo'lgan coinlar.
  ///
  /// Chegara SERVERDAGI bilan bir xil: balans va promokoddan keyingi
  /// qoldiq. Yakuniy raqamni baribir server hisoblaydi.
  int _redeemableCoins(BuildContext context, CartTotals totals) {
    final value = _coinValueSom(context);
    if (value == null || value <= 0 || _coinBalance <= 0) return 0;
    final promo = (_promo?.valid == true ? _promo!.discount : null) ?? Decimal.zero;
    final afterPromo = totals.total - promo;
    if (afterPromo <= Decimal.zero) return 0;
    final maxByTotal = (afterPromo.toDouble() / value).floor();
    return _coinBalance < maxByTotal ? _coinBalance : maxByTotal;
  }

  int _coinsToRedeem(BuildContext context, CartTotals totals) =>
      _useCoins ? _redeemableCoins(context, totals) : 0;

  Future<void> _applyPromo() async {
    final code = _promoField.text.trim();
    if (code.isEmpty) return;
    final totals = _totals(context);
    setState(() {
      _checkingPromo = true;
      _error = null;
    });
    try {
      final preview = await _repo.validatePromo(
        code: code,
        subtotal: totals.subtotal,
        shippingFee: totals.shippingFee ?? 0,
      );
      if (!mounted) return;
      setState(() {
        _promo = preview;
        _checkingPromo = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _checkingPromo = false;
        _error = context.errorText(e);
      });
    }
  }

  String? _validate(BuildContext context) {
    if (_name.text.trim().length < 2) return context.t('checkout.errors.required');
    if (!isValidUzPhone(_phone.text)) return context.t('auth.phoneInvalid');
    if (_city.text.trim().length < 2 || _street.text.trim().length < 2) {
      return context.t('checkout.errors.required');
    }
    if (_delivery == DeliveryMethod.pickupPoint && _pickupPoint == null) {
      return context.t('checkout.shipping.selectPickup');
    }
    if (_payment == null) return context.t('checkout.payment.title');
    // Chek serverda ham MAJBURIY (`400 RECEIPT_REQUIRED`) — oldindan
    // aytganimiz yaxshi.
    if (_payment!.requiresReceipt && _receiptPath == null) {
      return context.t('checkout.payment.receiptRequired');
    }
    return null;
  }

  Future<void> _submit() async {
    final problem = _validate(context);
    if (problem != null) {
      setState(() => _error = problem);
      return;
    }

    final cart = CartScope.read(context);
    final repo = _repo;
    final provider = _payment!;
    setState(() {
      _submitting = true;
      _error = null;
    });

    final PlacedOrder order;
    try {
      order = await repo.createOrder(
        items: cart.lines,
        recipientName: _name.text,
        // E.164 — CLAUDE.md qoidasi (server ham normallashtiradi).
        phone: normalizeUzPhone(_phone.text) ?? _phone.text,
        region: _region.text,
        city: _city.text,
        street: _street.text,
        apartment: _apartment.text,
        deliveryMethod: _delivery,
        pickupPointId: _pickupPoint?.id,
        paymentProvider: provider,
        paymentReceipt: _receiptPath,
        paymentNote: _paymentNote.text,
        promoCode: _promo?.valid == true ? _promo!.code : null,
        redeemCoins: _coinsToRedeem(context, _totals(context)),
        notes: _notes.text,
        idempotencyKey: _idempotencyKey,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = context.errorText(e);
      });
      return;
    }

    // Buyurtma YARATILDI. Bundan keyingi har qanday nosozlik (to'lov
    // sahifasi ochilmasligi) buyurtmani bekor qilmaydi — shuning uchun
    // savat shu yerda tozalanadi va mijoz muvaffaqiyat ekranini ko'radi.
    cart.clear();

    String? checkoutUrl;
    if (provider.isOnline) {
      try {
        final start = await repo.startPayment(orderId: order.id, provider: provider);
        checkoutUrl = start.checkoutUrl;
      } catch (_) {
        // To'lovni keyinroq ham amalga oshirish mumkin — buyurtma kutmoqda.
      }
    }

    if (!mounted) return;
    if (checkoutUrl != null) {
      // Tashqi to'lov sahifasi. Ochilmasa ham buyurtma joyida qoladi.
      await launchUrl(Uri.parse(checkoutUrl), mode: LaunchMode.externalApplication)
          .catchError((Object _) => false);
    }

    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(builder: (_) => OrderSuccessScreen(order: order)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cart = CartScope.of(context);
    if (cart.isEmpty && !_submitting) return _emptyCart(context);

    final totals = _totals(context);

    return Scaffold(
      appBar: AppBar(title: Text(context.t('checkout.title'))),
      body: _loading
          ? const Center(
              child: SizedBox(
                width: 26,
                height: 26,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: SellobayColors.primary),
              ),
            )
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
              children: [
                FormErrorBanner(_error),
                if (_addresses.isNotEmpty) ...[
                  _sectionTitle(context.t('checkout.review.addressLabel')),
                  _savedAddresses(context),
                  const SizedBox(height: 18),
                ],
                _sectionTitle(context.t('checkout.address.title')),
                _addressForm(context),
                const SizedBox(height: 22),
                _sectionTitle(context.t('checkout.shipping.title')),
                _deliveryOptions(context),
                const SizedBox(height: 22),
                _coinsRow(context),
                _sectionTitle(context.t('checkout.payment.title')),
                _paymentOptions(context),
                const SizedBox(height: 22),
                _sectionTitle(context.t('cart.promoCode')),
                _promoRow(context),
                const SizedBox(height: 24),
                _summary(context, totals),
              ],
            ),
      bottomNavigationBar: _loading ? null : _submitBar(context, totals),
    );
  }

  Widget _emptyCart(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(context.t('checkout.title'))),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  context.t('checkout.emptyTitle'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Text(
                  context.t('checkout.emptyHint'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13.5, color: SellobayColors.mutedText),
                ),
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(context.t('checkout.openCatalog')),
                ),
              ],
            ),
          ),
        ),
      );

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

  Widget _savedAddresses(BuildContext context) => Wrap(
        spacing: 8,
        runSpacing: 8,
        children: [
          for (final address in _addresses)
            ActionChip(
              label: Text(address.label?.isNotEmpty == true ? address.label! : address.city),
              onPressed: () => _applyAddress(address),
              backgroundColor: SellobayColors.soft,
              side: const BorderSide(color: SellobayColors.border),
            ),
        ],
      );

  Widget _addressForm(BuildContext context) => Column(
        children: [
          TextField(
            controller: _name,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(labelText: context.t('checkout.address.firstName')),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: InputDecoration(
              labelText: context.t('checkout.address.phone'),
              hintText: context.t('checkout.address.phonePlaceholder'),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _region,
                  decoration: InputDecoration(
                    labelText: context.t('checkout.address.region'),
                    hintText: context.t('checkout.address.regionPlaceholder'),
                  ),
                  onChanged: (_) => _pickupPoints = const [],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _city,
                  decoration: InputDecoration(
                    labelText: context.t('checkout.address.city'),
                    hintText: context.t('checkout.address.cityPlaceholder'),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _street,
            decoration: InputDecoration(
              labelText: context.t('checkout.address.street'),
              hintText: context.t('checkout.address.streetPlaceholder'),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _apartment,
            decoration: InputDecoration(
              labelText: context.t('checkout.address.apartment'),
              hintText: context.t('checkout.address.apartmentPlaceholder'),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _notes,
            maxLines: 2,
            decoration: InputDecoration(
              labelText: context.t('checkout.address.notes'),
              hintText: context.t('checkout.address.notesPlaceholder'),
            ),
          ),
        ],
      );

  Widget _deliveryOptions(BuildContext context) => Column(
        children: [
          RadioGroup<DeliveryMethod>(
            groupValue: _delivery,
            onChanged: (value) {
              if (value == null) return;
              setState(() => _delivery = value);
              if (value == DeliveryMethod.pickupPoint) _loadPickupPoints();
            },
            child: Column(
              children: [
                for (final method in DeliveryMethod.values)
                  RadioListTile<DeliveryMethod>(
                    value: method,
                    contentPadding: EdgeInsets.zero,
                    title:
                        Text(context.t(method.labelKey), style: const TextStyle(fontSize: 14.5)),
                    subtitle: method.isTashkentOnly
                        ? Text(
                            context.t('checkout.shipping.expressTashkent'),
                            style:
                                const TextStyle(fontSize: 12, color: SellobayColors.mutedText),
                          )
                        : null,
                  ),
              ],
            ),
          ),
          if (_delivery == DeliveryMethod.pickupPoint) _pickupPicker(context),
        ],
      );

  /// Punkt tanlash — ro'yxat emas, ALOHIDA EKRAN.
  ///
  /// Ilgari bu `DropdownButton` edi. 8 ta shahardagi 12 ta punkt
  /// ochiluvchi ro'yxatga sig'maydi va mijoz qaysi punkt o'ziga
  /// yaqinligini tushunmasdi: manzil, ish vaqti va mo'ljal
  /// ko'rinmasdi. Endi xaritali ekran ochiladi.
  Widget _pickupPicker(BuildContext context) {
    final point = _pickupPoint;
    final locale = SellobayRuntimeScope.of(context).locale.locale;

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (point != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: SellobayColors.soft,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    point.name.pick(locale),
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    point.address,
                    style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
                  ),
                  if (point.workingHours != null && point.workingHours!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        point.workingHours!,
                        style: const TextStyle(fontSize: 12, color: SellobayColors.mutedText),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 8),
          ],
          OutlinedButton.icon(
            onPressed: _openPickupPoints,
            icon: const Icon(Icons.map_outlined, size: 18),
            label: Text(
              context.t(point == null
                  ? 'checkout.shipping.selectPickup'
                  : 'pickupPoints.title'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _openPickupPoints() async {
    final picked = await Navigator.of(context).push<PickupPoint>(
      MaterialPageRoute(
        builder: (_) => PickupPointsScreen(
          selectable: true,
          // Formada yozilgan shahar oldindan tanlanadi — mijoz
          // odatda o'sha shahardagi punktdan olib ketadi. Bo'sh
          // bo'lsa barcha shaharlar ko'rsatiladi.
          initialCity: _city.text.trim().isEmpty ? null : _city.text.trim(),
        ),
      ),
    );
    if (picked != null && mounted) setState(() => _pickupPoint = picked);
  }

  Widget _paymentOptions(BuildContext context) {
    if (_providers.isEmpty) {
      // Server hech qanday usulni tasdiqlamadi — tanlov ko'rsatmaymiz.
      return Text(
        context.t('common.notConnectedYet'),
        style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
      );
    }
    return Column(
      children: [
        RadioGroup<PaymentProvider>(
          groupValue: _payment,
          onChanged: (value) => setState(() => _payment = value),
          child: Column(
            children: [
              for (final provider in _providers)
                RadioListTile<PaymentProvider>(
                  value: provider,
                  contentPadding: EdgeInsets.zero,
                  title:
                      Text(context.t(provider.labelKey), style: const TextStyle(fontSize: 14.5)),
                  subtitle: Text(
                    context.t(provider.hintKey),
                    style: const TextStyle(fontSize: 12, color: SellobayColors.mutedText),
                  ),
                ),
            ],
          ),
        ),
        if (_payment?.requiresReceipt ?? false) _manualCardPanel(context),
        // Izoh FAQAT shu sababdan usul yashirilgan bo'lsa chiqadi.
        // Ilgari u mehmonga doim ko'rinardi va «buyurtma berish uchun
        // ro'yxatdan o'ting» deb turardi — qo'lda karta bilan esa
        // mehmon ham buyurtma bera oladi, ya'ni yolg'on edi.
        if (!_signedIn && (_options?.providers.any((p) => p.isOnline) ?? false))
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              // Mehmonda `/api/payments/create` 401 beradi. Matn
              // AYNAN shu haqda: buyurtmaning o'zini mehmon ham
              // bera oladi (qo'lda karta yoki naqd bilan).
              context.t('auth.loginForOnlinePayment'),
              style: const TextStyle(fontSize: 12, color: SellobayColors.mutedText),
            ),
          ),
      ],
    );
  }

  /// Qo'lda karta to'lovi: kartalar, chek va izoh.
  ///
  /// Ko'rinishi WEB bilan bir xil (`payment-section.tsx`): summa,
  /// nusxalanadigan karta raqamlari, chek yuklash va ixtiyoriy izoh.
  Widget _manualCardPanel(BuildContext context) {
    final cards = _options?.cards ?? const <PaymentCard>[];
    final totals = _totals(context);

    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: SellobayColors.primary.withValues(alpha: 0.03),
        border: Border.all(color: SellobayColors.primary.withValues(alpha: 0.30)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.t('checkout.payment.cardTransferTitle'),
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: SellobayColors.ink,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            context.t('checkout.payment.cardTransferHint'),
            style: const TextStyle(fontSize: 12, height: 1.45, color: SellobayColors.mutedText),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(11),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    context.t('checkout.payment.amountToTransfer'),
                    style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
                  ),
                ),
                Text(
                  // Summa SERVER qayta hisoblaydi; bu yerda mijoz
                  // ko'rayotgan jamisi turadi.
                  formatMoney(totals.total),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: SellobayColors.ink,
                  ),
                ),
              ],
            ),
          ),
          for (final card in cards) ...[
            const SizedBox(height: 8),
            _cardRow(context, card),
          ],
          const SizedBox(height: 12),
          _receiptPicker(context),
          const SizedBox(height: 10),
          TextField(
            controller: _paymentNote,
            maxLength: 200,
            decoration: InputDecoration(
              labelText: context.t('checkout.payment.receiptNoteLabel'),
              hintText: context.t('checkout.payment.receiptNotePlaceholder'),
              counterText: '',
              fillColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _cardRow(BuildContext context, PaymentCard card) => Container(
        padding: const EdgeInsets.fromLTRB(12, 8, 6, 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(11),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    card.number,
                    // `fontFamily: 'monospace'` ATAYLAB yo'q: Android'da
                    // u platforma shriftiga tushadi, iOS'da esa bunday
                    // oila yo'q va jim e'tiborsiz qoldiriladi. Raqam
                    // guruhlari allaqachon bo'sh joy bilan ajratilgan,
                    // oraliqni kattalashtirish yetarli.
                    style: const TextStyle(
                      fontSize: 15.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.1,
                      color: SellobayColors.ink,
                    ),
                  ),
                  Text(
                    [card.holder, ?card.bank].join(' - '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11.5, color: SellobayColors.mutedText),
                  ),
                ],
              ),
            ),
            TextButton(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: card.number));
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(context.t('checkout.payment.copied'))),
                );
              },
              child: Text(context.t('checkout.payment.copyCard')),
            ),
          ],
        ),
      );

  Widget _receiptPicker(BuildContext context) {
    final done = _receiptPath != null;
    final label = _receiptBusy
        ? 'checkout.payment.receiptProcessing'
        : done
            ? 'checkout.payment.receiptUploaded'
            : 'checkout.payment.uploadReceipt';

    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: _receiptBusy ? null : _pickReceipt,
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(46),
          backgroundColor: Colors.white,
          foregroundColor: done ? SellobayColors.success : SellobayColors.ink,
          side: BorderSide(color: done ? SellobayColors.success : SellobayColors.border),
        ),
        icon: Icon(done ? Icons.check_circle_outline : Icons.receipt_long_outlined, size: 18),
        label: Text(context.t(label)),
      ),
    );
  }

  /// Chekni tanlaydi va DARHOL yuklaydi.
  ///
  /// Rasm buyurtma bilan birga emas, alohida yuboriladi: buyurtma
  /// so'rovi bir necha megabaytlik rasm bilan og'irlashsa, tarmoq
  /// uzilganda butun buyurtma qayta yuborilishi kerak bo'lardi.
  Future<void> _pickReceipt() async {
    final picked = await CheckoutScreen.picker.pickImage(
      source: ImageSource.gallery,
      // Server ~3.5MB gacha qabul qiladi; shu yerda kichraytirib
      // yuboramiz, aks holda zamonaviy telefon surati rad etilardi.
      maxWidth: 1600,
      imageQuality: 80,
    );
    if (picked == null || !mounted) return;

    setState(() {
      _receiptBusy = true;
      _error = null;
    });
    try {
      final bytes = await picked.readAsBytes();
      final path = await _repo.uploadReceipt(bytes: bytes, filename: picked.name);
      if (!mounted) return;
      setState(() {
        _receiptPath = path;
        _receiptBusy = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _receiptBusy = false;
        // Eski chek saqlanib qolmasin — mijoz yuklandi deb o'ylamasin.
        _receiptPath = null;
        _error = context.errorText(e);
      });
    }
  }

  Widget _promoRow(BuildContext context) {
    final promo = _promo;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _promoField,
                textCapitalization: TextCapitalization.characters,
                decoration: InputDecoration(hintText: context.t('cart.promoPlaceholder')),
              ),
            ),
            const SizedBox(width: 10),
            OutlinedButton(
              onPressed: _checkingPromo ? null : _applyPromo,
              style: OutlinedButton.styleFrom(minimumSize: const Size(96, 52)),
              child: Text(
                _checkingPromo ? context.t('cart.promoChecking') : context.t('cart.promoApply'),
              ),
            ),
          ],
        ),
        if (promo != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              promo.valid
                  ? context.t('checkout.promoAppliedChip', params: {'code': promo.code ?? ''})
                  : promo.message ?? context.t('cart.promoInvalid'),
              style: TextStyle(
                fontSize: 12.5,
                color: promo.valid ? SellobayColors.success : SellobayColors.destructive,
              ),
            ),
          ),
      ],
    );
  }

  /// Sello Coins bilan to'lash.
  ///
  /// Web'dagi kabi BITTA kalit: mumkin bo'lgan hammasi ishlatiladi
  /// (`checkout-flow.tsx`). Qisman yechish serverda ham, web'da ham
  /// yo'q — ikki xil xulq yaratmaymiz.
  Widget _coinsRow(BuildContext context) {
    final totals = _totals(context);
    final redeemable = _redeemableCoins(context, totals);
    // Ishlatadigan coin yo'q bo'lsa bo'lim umuman ko'rsatilmaydi:
    // nolga teng kalitni bosib ko'rgan mijoz nima bo'lmaganini
    // tushunmasdi.
    if (redeemable <= 0) return const SizedBox.shrink();

    final som = Decimal.fromInt(redeemable * (_coinValueSom(context) ?? 0));
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: SwitchListTile(
        value: _useCoins,
        onChanged: (v) => setState(() => _useCoins = v),
        contentPadding: EdgeInsets.zero,
        title: Text(
          context.t('checkout.useCoinsTitle'),
          style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          context.t(
            'checkout.useCoinsAvail',
            params: {'coins': redeemable, 'som': formatMoney(som)},
          ),
          style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
        ),
      ),
    );
  }

  Widget _summary(BuildContext context, CartTotals totals) {
    final discount = _promo?.valid == true ? _promo!.discount : null;
    final coins = _coinsToRedeem(context, totals);
    final coinDiscount = Decimal.fromInt(coins * (_coinValueSom(context) ?? 0));
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: SellobayColors.soft,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          _row(context.t('checkout.summaryItems'), formatMoney(totals.subtotal)),
          if (totals.shippingFee != null)
            _row(
              context.t('checkout.summaryShipping'),
              totals.isFreeShipping
                  ? context.t('checkout.shipping.free')
                  : formatMoney(totals.shippingFee),
            ),
          if (discount != null) _row(context.t('checkout.promoDiscount'), '−${formatMoney(discount)}'),
          if (coinDiscount > Decimal.zero)
            _row(context.t('checkout.coinDiscount'), '−${formatMoney(coinDiscount)}'),
          const Divider(height: 18),
          _row(
            context.t('checkout.summaryTotal'),
            // Taxminiy: yakuniy summani server qayta hisoblaydi.
            formatMoney(totals.total - (discount ?? Decimal.zero) - coinDiscount),
            bold: true,
          ),
          const SizedBox(height: 6),
          Text(
            // Yakuniy summani server qayta hisoblaydi — bu taxmin.
            context.t('checkout.sslNote'),
            style: const TextStyle(fontSize: 11, color: SellobayColors.mutedText),
          ),
        ],
      ),
    );
  }

  /// Xulosa qatori.
  ///
  /// Yorliq ham, qiymat ham siqiladi: ikkalasi ham qat'iy bo'lsa,
  /// uzunroq matn (masalan «Sello Coins chegirmasi» + yetti xonali
  /// summa) qatorni toshirib yuborardi — tor ekranda yoki matn
  /// kattalashtirilganda.
  Widget _row(String label, String value, {bool bold = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: bold ? 15 : 13.5,
                  fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
                  color: bold ? SellobayColors.ink : SellobayColors.mutedText,
                ),
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
                  style: TextStyle(
                    fontSize: bold ? 17 : 13.5,
                    fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
                    color: SellobayColors.ink,
                  ),
                ),
              ),
            ),
          ],
        ),
      );

  Widget _submitBar(BuildContext context, CartTotals totals) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: FilledButton(
            onPressed: _submitting || _providers.isEmpty ? null : _submit,
            child: _submitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                  )
                : Text(context.t('checkout.placeOrder')),
          ),
        ),
      );
}
