import 'package:flutter/material.dart';

import 'sellobay_theme.dart';

/// Forma ustidagi xato chizig'i.
///
/// Snackbar EMAS: snackbar o'z-o'zidan yo'qoladi va foydalanuvchi uni
/// o'qib ulgurmasligi mumkin. Kirish xatosi — formaning holati, shuning
/// uchun u formada turadi.
class FormErrorBanner extends StatelessWidget {
  const FormErrorBanner(this.message, {super.key});

  final String? message;

  @override
  Widget build(BuildContext context) {
    final text = message;
    if (text == null || text.isEmpty) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: SellobayColors.destructive.withValues(alpha: 0.08),
        borderRadius: const BorderRadius.all(Radius.circular(12)),
        border: Border.all(color: SellobayColors.destructive.withValues(alpha: 0.35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline, size: 18, color: SellobayColors.destructive),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(color: SellobayColors.destructive, fontSize: 13.5, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}
