import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Sessiya saqlovdan o'qilayotgan paytdagi ekran.
///
/// Odatda bir necha o'n millisekund ko'rinadi. Matn yo'q: shu qisqa
/// vaqtda chiqib ketadigan so'z o'qilmaydi, faqat miltillaydi.
///
/// Foni NATIVE splash bilan bir xil (`flutter_native_splash`,
/// `pubspec.yaml`). Oq qoldirsak, brend rangidan oqqa, keyin yana
/// ilovaga sakrash ko'rinardi.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: SellobayColors.primary,
      body: Center(
        child: SizedBox(
          width: 28,
          height: 28,
          child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
        ),
      ),
    );
  }
}
