import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:url_launcher/url_launcher.dart';

import 'order_success_screen.dart';

/// Buyurtmani rasmiylashtirish.
///
/// Yakuniy summani SERVER hisoblaydi (`orders-server.ts`). Bu yerdagi
/// xulosa faqat ko'rsatish uchun — shu sababli buyurtma yaratilgach
/// serverning `grandTotal` i ko'rsatiladi, mijoz ko'rgan taxmin emas.
class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

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
  List<PaymentProvider> _providers = const [];

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
      final providers = await _repo.fetchPaymentProviders();
      if (!mounted) return;

      // Mehmon onlayn to'lovni BOSHLAY OLMAYDI: `/api/payments/create`
      // auth talab qiladi va 401 beradi. Shuning uchun unga faqat
      // naqd pul taklif qilinadi — tanlab, keyin devorga urilmasin.
      final usable =
          _signedIn ? providers : providers.where((p) => !p.isOnline).toList();

      setState(() {
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
        promoCode: _promo?.valid == true ? _promo!.code : null,
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

  Widget _pickupPicker(BuildContext context) {
    if (_pickupPoints.isEmpty) {
      // Punktlar hali ulanmagan bo'lishi mumkin — to'qima ro'yxat
      // ko'rsatmaymiz.
      return Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Text(
          context.t('checkout.shipping.pickupSoon'),
          style: const TextStyle(fontSize: 12.5, height: 1.5, color: SellobayColors.mutedText),
        ),
      );
    }
    final locale = SellobayRuntimeScope.of(context).locale.locale;
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: DropdownButtonFormField<PickupPoint>(
        initialValue: _pickupPoint,
        isExpanded: true,
        decoration: InputDecoration(labelText: context.t('checkout.shipping.selectPickup')),
        items: [
          for (final point in _pickupPoints)
            DropdownMenuItem(
              value: point,
              child: Text('${point.name.pick(locale)} · ${point.address}', overflow: TextOverflow.ellipsis),
            ),
        ],
        onChanged: (value) => setState(() => _pickupPoint = value),
      ),
    );
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
                ),
            ],
          ),
        ),
        if (!_signedIn)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              // Mehmonda onlayn to'lov endpointi 401 beradi.
              context.t('auth.loginRequired'),
              style: const TextStyle(fontSize: 12, color: SellobayColors.mutedText),
            ),
          ),
      ],
    );
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

  Widget _summary(BuildContext context, CartTotals totals) {
    final discount = _promo?.valid == true ? _promo!.discount : null;
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
          const Divider(height: 18),
          _row(context.t('checkout.summaryTotal'), formatMoney(totals.total), bold: true),
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
            Text(
              value,
              style: TextStyle(
                fontSize: bold ? 17 : 13.5,
                fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
                color: SellobayColors.ink,
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
