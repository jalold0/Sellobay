import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../auth_flow.dart';
import '../widgets/product_card.dart';
import '../widgets/skeleton.dart';
import 'product_screen.dart';

/// Sevimlilar.
///
/// Server FAQAT `productId` ro'yxatini saqlaydi, shuning uchun
/// mahsulotlar alohida so'rov bilan olinadi (savat sinxronidagi kabi).
class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  List<ProductSummary>? _products;
  Object? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  /// Oxirgi ko'rilgan auth holati — mehmon kirgach ro'yxat yuklanadi.
  AuthStatus? _status;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final status = AuthScope.of(context).status;
    final signedInNow = _status == AuthStatus.signedOut && status == AuthStatus.signedIn;
    _status = status;
    if (signedInNow) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _load();
      });
    }
  }

  Future<void> _load() async {
    // Mehmonda server 401 beradi — so'ramaymiz, ekran kirish taklifini
    // ko'rsatadi.
    if (isGuest(AuthScope.read(context))) return;
    setState(() => _error = null);
    final wishlist = WishlistScope.read(context);
    final catalog = SellobayRuntimeScope.of(context).catalog;
    try {
      await wishlist.load();
      final ids = wishlist.ids;
      if (!mounted) return;
      if (ids.isEmpty) {
        setState(() => _products = const []);
        return;
      }
      final products = await catalog.fetchProductsByIds(ids.toList());
      if (!mounted) return;
      setState(() => _products = products);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final wishlist = WishlistScope.of(context);
    final guest = isGuest(AuthScope.of(context));

    return Scaffold(
      appBar: AppBar(title: Text(context.t('wishlist.title'))),
      // Sevimlilar serverda — mehmonga ro'yxat emas, kirish taklifi.
      // Kirgach ro'yxat o'zi yuklanadi (`didChangeDependencies`).
      body: guest
          ? GuestPrompt(
              icon: Icons.favorite_border,
              title: context.t('auth.guest.wishlistTitle'),
              message: context.t('auth.guest.wishlistHint'),
            )
          : RefreshIndicator(onRefresh: _load, child: _body(context, wishlist)),
    );
  }

  Widget _body(BuildContext context, WishlistStore wishlist) {
    if (_error != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(32),
        children: [
          SizedBox(height: MediaQuery.sizeOf(context).height * 0.18),
          const Icon(Icons.cloud_off, size: 42, color: SellobayColors.mutedText),
          const SizedBox(height: 14),
          Text(
            context.errorText(_error!),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 18),
          Center(child: FilledButton(onPressed: _load, child: Text(context.t('common.retry')))),
        ],
      );
    }

    final products = _products;
    if (products == null) {
      return const SingleChildScrollView(
        physics: NeverScrollableScrollPhysics(),
        child: ProductGridSkeleton(count: 4),
      );
    }

    // Yurakchasi olib tashlanganlari ro'yxatdan chiqadi, lekin qayta
    // so'rov yuborilmaydi.
    final visible = products.where((p) => wishlist.contains(p.id)).toList();

    if (visible.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(32),
        children: [
          SizedBox(height: MediaQuery.sizeOf(context).height * 0.16),
          const Icon(Icons.favorite_border, size: 42, color: SellobayColors.border),
          const SizedBox(height: 14),
          Text(
            context.t('wishlist.emptyTitle'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            context.t('wishlist.emptyDesc'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13.5, height: 1.4, color: SellobayColors.mutedText),
          ),
        ],
      );
    }

    final locale = SellobayRuntimeScope.of(context).locale.locale;
    final baseUrl = SellobayRuntimeScope.of(context).api.baseUrl;

    return GridView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 16,
        // Balandlik kartochka ichidagi matnga qarab hisoblangan —
        // `childAspectRatio` da u 21px toshib ketardi.
        mainAxisExtent: 310,
      ),
      itemCount: visible.length,
      itemBuilder: (_, i) {
        final product = visible[i];
        return ProductCard(
          product: product,
          locale: locale,
          baseUrl: baseUrl,
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute<void>(builder: (_) => ProductScreen(slug: product.slug)),
          ),
        );
      },
    );
  }
}
