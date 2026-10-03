import 'package:flutter/material.dart';

import 'sellobay_theme.dart';

/// Mahsulot rasmi — yuklanmasa o'rnini bosuvchi belgi bilan.
///
/// [url] `resolveProductImageUrl()` dan kelgan to'liq manzil bo'lishi
/// kerak. `null` bo'lsa yoki yuklanmasa, TASODIFIY rasm ko'rsatilmaydi:
/// mahsulotga aloqasi yo'q chiroyli rasm — foydalanuvchini chalg'itadi.
/// Neytral belgi rost bo'lib qoladi.
class ProductThumbnail extends StatelessWidget {
  const ProductThumbnail({super.key, required this.url, this.fit = BoxFit.cover});

  final String? url;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final src = url;
    if (src == null || src.isEmpty) return const _Placeholder();

    return Image.network(
      src,
      fit: fit,
      // Rasm fayli yo'q bo'lsa (404) — belgi. Repoda hamma seed uchun
      // fayl yo'q va bu normal holat.
      errorBuilder: (context, error, stack) => const _Placeholder(),
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return const ColoredBox(color: SellobayColors.soft);
      },
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder();

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: SellobayColors.soft,
      child: Center(
        child: Icon(Icons.image_outlined, size: 28, color: SellobayColors.border),
      ),
    );
  }
}
