import 'package:decimal/decimal.dart';
import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'pickup_points_screen.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';

import '../widgets/checkout/checkout_address_section.dart';
import '../widgets/checkout/checkout_coins_row.dart';
import '../widgets/checkout/checkout_delivery_section.dart';
import '../widgets/checkout/checkout_promo_row.dart';
import '../widgets/checkout/checkout_summary.dart';
import '../widgets/checkout/manual_card_panel.dart';
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

  Widget _savedAddresses(BuildContext context) => CheckoutSavedAddresses(
        addresses: _addresses,
        onPick: _applyAddress,
      );

  Widget _addressForm(BuildContext context) => CheckoutAddressForm(
        name: _name,
        phone: _phone,
        region: _region,
        city: _city,
        street: _street,
        apartment: _apartment,
        notes: _notes,
        // Viloyat o'zgarsa yuklangan punktlar eskiradi.
        onRegionChanged: () => _pickupPoints = const [],
      );

  Widget _deliveryOptions(BuildContext context) => CheckoutDeliverySection(
        method: _delivery,
        onMethodChanged: (value) {
          setState(() => _delivery = value);
          // Punktlar FAQAT kerak bo'lganda yuklanadi — har checkout
          // ochilishida emas.
          if (value == DeliveryMethod.pickupPoint) _loadPickupPoints();
        },
        pickupPoint: _pickupPoint,
        onChoosePickup: _openPickupPoints,
      );

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

  /// Qo'lda karta to'lovi — alohida vidjet.
  Widget _manualCardPanel(BuildContext context) => ManualCardPanel(
        cards: _options?.cards ?? const <PaymentCard>[],
        amount: _totals(context).total,
        noteController: _paymentNote,
        receiptUploaded: _receiptPath != null,
        receiptBusy: _receiptBusy,
        onPickReceipt: _pickReceipt,
      );

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

  Widget _promoRow(BuildContext context) => CheckoutPromoRow(
        controller: _promoField,
        onApply: _applyPromo,
        checking: _checkingPromo,
        result: _promo,
      );

  /// Sello Coins kaliti — alohida vidjet.
  ///
  /// Nechta coin ishlatish mumkinligini SHU YERDA hisoblaymiz: bu
  /// uchun savat jami va serverdan kelgan kurs kerak.
  Widget _coinsRow(BuildContext context) {
    final totals = _totals(context);
    final redeemable = _redeemableCoins(context, totals);
    return CheckoutCoinsRow(
      redeemable: redeemable,
      valueSom: Decimal.fromInt(redeemable * (_coinValueSom(context) ?? 0)),
      enabled: _useCoins,
      onChanged: (v) => setState(() => _useCoins = v),
    );
  }

  /// Xulosa — alohida vidjet (`checkout_summary.dart`).
  ///
  /// Bu yerda faqat chegirmalar HISOBLANADI; chizish vidjetda.
  Widget _summary(BuildContext context, CartTotals totals) {
    final coins = _coinsToRedeem(context, totals);
    return CheckoutSummary(
      totals: totals,
      promoDiscount: _promo?.valid == true ? _promo!.discount : null,
      coinDiscount: Decimal.fromInt(coins * (_coinValueSom(context) ?? 0)),
    );
  }

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
