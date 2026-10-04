import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../home_tabs.dart';

import 'checkout_screen.dart';

/// Savat.
///
/// Yetkazish narxi `GET /api/config` dan keladi — Dart'da yozilmagan.
/// Config hali yuklanmagan bo'lsa yetkazish qatori UMUMAN ko'rsatilmaydi:
/// taxminiy raqam yozib, keyin checkout'da boshqa summa chiqishidan
/// ko'ra, aytmaslik rost.
class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cart = CartScope.of(context);
    final locale = SellobayRuntimeScope.of(context).locale.locale;
    final baseUrl = SellobayRuntimeScope.of(context).api.baseUrl;

    return Scaffold(
      appBar: AppBar(
        title: Text(context.t('cart.title')),
        actions: [
          if (!cart.isEmpty)
            TextButton(
              onPressed: () => _confirmClear(context, cart),
              child: Text(context.t('cart.clearAll')),
            ),
        ],
      ),
      body: cart.isEmpty ? _empty(context) : _list(context, cart, locale, baseUrl),
      bottomNavigationBar: cart.isEmpty ? null : _summary(context, cart),
    );
  }

  Widget _empty(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.shopping_bag_outlined, size: 44, color: SellobayColors.mutedText),
              const SizedBox(height: 16),
              Text(
                context.t('cart.empty'),
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: SellobayColors.ink,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                context.t('cart.emptyHint'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13.5, color: SellobayColors.mutedText),
              ),
              const SizedBox(height: 20),
              FilledButton(
                // Savat ham bo'lim, ham alohida surilgan ekran bo'lishi
                // mumkin. Qobiq ichida `pop` qiladigan narsa yo'q —
                // tugma jim o'tirib qolardi.
                onPressed: () => backToCatalog(context),
                child: Text(context.t('cart.continueShopping')),
              ),
            ],
          ),
        ),
      );

  Widget _list(BuildContext context, CartStore cart, String locale, String baseUrl) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      itemCount: cart.lines.length,
      separatorBuilder: (_, _) => const Divider(height: 24, color: SellobayColors.border),
      itemBuilder: (context, index) {
        final line = cart.lines[index];
        return _CartRow(line: line, locale: locale, baseUrl: baseUrl);
      },
    );
  }

  Widget _summary(BuildContext context, CartStore cart) {
    final config = SellobayRuntimeScope.of(context).config;

    return ValueListenableBuilder<SellobayConfig?>(
      valueListenable: config,
      builder: (context, rules, _) {
        // Pul hisobi umumiy paketda — ekran faqat ko'rsatadi.
        final totals = computeCartTotals(cart, rules);

        return SafeArea(
          child: Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: SellobayColors.border)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _freeShippingHint(context, totals),
                _summaryRow(
                  context.t('cart.subtotal'),
                  formatMoney(totals.subtotal),
                  muted: true,
                ),
                if (totals.shippingFee != null)
                  _summaryRow(
                    context.t('cart.shipping'),
                    totals.isFreeShipping
                        ? context.t('cart.shippingFree')
                        : formatMoney(totals.shippingFee),
                    muted: true,
                    highlight: totals.isFreeShipping,
                  ),
                const SizedBox(height: 6),
                _summaryRow(context.t('cart.total'), formatMoney(totals.total), bold: true),
                const SizedBox(height: 10),
                FilledButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(builder: (_) => const CheckoutScreen()),
                  ),
                  child: Text(context.t('cart.checkout')),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// "Yana N qo'shing — tekin yetkazib berish".
  Widget _freeShippingHint(BuildContext context, CartTotals totals) {
    final remaining = totals.amountToFreeShipping;
    if (remaining == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          const Icon(Icons.local_shipping_outlined, size: 16, color: SellobayColors.primary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              context.t('cart.freeShipHint', params: {'amount': formatMoney(remaining)}),
              style: const TextStyle(fontSize: 12.5, color: SellobayColors.primary),
            ),
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(
    String label,
    String value, {
    bool bold = false,
    bool muted = false,
    bool highlight = false,
  }) =>
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: bold ? 15 : 13.5,
                fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
                color: muted ? SellobayColors.mutedText : SellobayColors.ink,
              ),
            ),
            Text(
              value,
              style: TextStyle(
                fontSize: bold ? 17 : 13.5,
                fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
                color: highlight ? SellobayColors.success : SellobayColors.ink,
              ),
            ),
          ],
        ),
      );

  Future<void> _confirmClear(BuildContext context, CartStore cart) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(dialogContext.t('cart.clearAll')),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(dialogContext.t('common.cancel')),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(dialogContext.t('common.confirm')),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    cart.clear();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(context.t('cart.cleared'))),
    );
  }
}

class _CartRow extends StatelessWidget {
  const _CartRow({required this.line, required this.locale, required this.baseUrl});

  final CartLine line;
  final String locale;
  final String baseUrl;

  @override
  Widget build(BuildContext context) {
    final cart = CartScope.read(context);
    final options = [line.color, line.size].whereType<String>().where((s) => s.isNotEmpty);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 76,
          height: 76,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: ProductThumbnail(
              url: resolveProductImageUrl(
                dbUrl: line.rawImageUrl,
                slug: line.slug,
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
              if (line.brandName != null)
                Text(
                  line.brandName!.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.6,
                    color: SellobayColors.mutedText,
                  ),
                ),
              Text(
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
              if (options.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    options.join(' · '),
                    style: const TextStyle(fontSize: 12, color: SellobayColors.mutedText),
                  ),
                ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _Stepper(
                    quantity: line.quantity,
                    onChanged: (value) => cart.setQuantity(line.key, value),
                  ),
                  const Spacer(),
                  Flexible(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerRight,
                      child: Text(
                        formatMoney(line.lineTotal, currency: line.currency),
                        maxLines: 1,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: SellobayColors.ink,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        IconButton(
          tooltip: context.t('cart.remove'),
          onPressed: () {
            cart.remove(line.key);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(context.t('cart.itemRemoved'))),
            );
          },
          icon: const Icon(Icons.close, size: 18, color: SellobayColors.mutedText),
        ),
      ],
    );
  }
}

class _Stepper extends StatelessWidget {
  const _Stepper({required this.quantity, required this.onChanged});

  final int quantity;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: SellobayColors.border),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _button(
            icon: Icons.remove,
            tooltip: context.t('cart.decrease'),
            onPressed: () => onChanged(quantity - 1),
          ),
          SizedBox(
            width: 30,
            child: Text(
              '$quantity',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
            ),
          ),
          _button(
            icon: Icons.add,
            tooltip: context.t('cart.increase'),
            // Server bitta satrda 999 tadan ko'pini qabul qilmaydi.
            onPressed: quantity >= 999 ? null : () => onChanged(quantity + 1),
          ),
        ],
      ),
    );
  }

  Widget _button({required IconData icon, required String tooltip, VoidCallback? onPressed}) =>
      IconButton(
        tooltip: tooltip,
        onPressed: onPressed,
        icon: Icon(icon, size: 16),
        visualDensity: VisualDensity.compact,
        constraints: const BoxConstraints(minWidth: 34, minHeight: 34),
        padding: EdgeInsets.zero,
      );
}

/// Katalogga qaytadi — qayerdan chaqirilganiga qarab.
void backToCatalog(BuildContext context) {
  if (Navigator.of(context).canPop()) {
    Navigator.of(context).pop();
    return;
  }
  HomeTabsScope.read(context)?.go(HomeTab.catalog);
}
