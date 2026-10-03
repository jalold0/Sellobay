import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Sessiya saqlovdan o'qilayotgan paytdagi ekran.
///
/// Odatda bir necha o'n millisekund ko'rinadi. Matn yo'q: shu qisqa
/// vaqtda chiqib ketadigan so'z o'qilmaydi, faqat miltillaydi.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: SizedBox(
          width: 28,
          height: 28,
          child: CircularProgressIndicator(strokeWidth: 2.5, color: SellobayColors.primary),
        ),
      ),
    );
  }
}
