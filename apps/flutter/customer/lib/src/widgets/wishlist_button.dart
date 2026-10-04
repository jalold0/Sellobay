import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Sevimlilar yurakchasi.
///
/// Belgi DARHOL o'zgaradi, so'rov keyin ketadi. Xato bo'lsa
/// [WishlistStore] holatni orqaga qaytaradi va biz xabar ko'rsatamiz —
/// aks holda foydalanuvchi saqlanmagan narsani saqlangan deb o'ylardi.
class WishlistButton extends StatelessWidget {
  const WishlistButton({super.key, required this.productId, this.compact = false});

  final String productId;

  /// Kartochka ustidagi kichik ko'rinish.
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final wishlist = WishlistScope.of(context);
    final active = wishlist.contains(productId);

    final icon = Icon(
      active ? Icons.favorite : Icons.favorite_border,
      size: compact ? 18 : 22,
      color: active ? SellobayColors.primary : SellobayColors.mutedText,
    );

    Future<void> onTap() async {
      try {
        await WishlistScope.read(context).toggle(productId);
      } catch (e) {
        if (!context.mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.errorText(e))),
        );
      }
    }

    if (!compact) {
      return IconButton(
        tooltip: context.t('wishlist.title'),
        onPressed: onTap,
        icon: icon,
      );
    }

    return Material(
      color: Colors.white,
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(padding: const EdgeInsets.all(6), child: icon),
      ),
    );
  }
}
