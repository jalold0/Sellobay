import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'screens/login_screen.dart';

/// Kirish oqimi — mehmon hisob talab qiladigan amalga duch kelganda.
///
/// Ilova endi mehmonni ham ichkariga kiritadi: katalog, savat va
/// mehmon checkout'i hisobsiz ishlaydi. Hisob kerak bo'lgan joyda
/// (buyurtmalar, profil, sevimlilar, onlayn to'lov) kirish ekrani
/// USTIGA suriladi va muvaffaqiyatdan keyin foydalanuvchi AYNAN
/// turgan joyiga qaytadi — bosh sahifaga emas.

/// Kirish oqimining birinchi marshruti shu nom bilan belgilanadi —
/// [finishSignIn] oqimni shu nuqtagacha yopadi.
const signInRouteName = '/sign-in';

/// Mehmonmi — sessiya YO'Q ekani aniq bo'lsa.
///
/// [AuthStatus.unknown] mehmon hisoblanmaydi: bu holatda ilova qobig'i
/// umuman ko'rinmaydi (`AuthGate` splash ko'rsatadi), ya'ni hisob talab
/// qiladigan tugmaga yetib bo'lmaydi.
bool isGuest(AuthController auth) => auth.status == AuthStatus.signedOut;

/// Foydalanuvchi kirganini kafolatlaydi.
///
/// Mehmon bo'lmasa darhol `true`. Aks holda kirish ekranini ochadi va
/// natijani qaytaradi: kirdi — `true`, ortga qaytdi — `false`.
Future<bool> requireSignIn(BuildContext context) async {
  final auth = AuthScope.read(context);
  if (!isGuest(auth)) return true;
  await Navigator.of(context).push<bool>(
    MaterialPageRoute(
      settings: const RouteSettings(name: signInRouteName),
      builder: (_) => const LoginScreen(),
    ),
  );
  return auth.isSignedIn;
}

/// Kirish (yoki ro'yxatdan o'tish) muvaffaqiyatli tugadi — oqimni yopadi.
///
/// Kirish ekrani, kod ekrani, ro'yxatdan o'tish — hammasi bitta oqim.
/// Ularning hammasi olib tashlanadi va foydalanuvchi oqim BOSHLANGAN
/// ekranda qoladi (masalan, sevimliga qo'shmoqchi bo'lgan mahsulot).
/// Oqim belgisi topilmasa (masalan, ekran testda ildiz sifatida
/// ochilgan) — ildizgacha qaytiladi.
void finishSignIn(BuildContext context) {
  final navigator = Navigator.of(context);
  var found = false;
  navigator.popUntil((route) {
    if (route.settings.name == signInRouteName) {
      found = true;
      return true;
    }
    return route.isFirst;
  });
  if (found) navigator.pop(true);
}

/// Hisob talab qiladigan bo'limning mehmon uchun ko'rinishi.
///
/// Bo'sh ekran yoki xato emas — nima uchun kirish kerakligini aytadi
/// va bitta aniq amal beradi.
class GuestPrompt extends StatelessWidget {
  const GuestPrompt({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.secondary,
  });

  final IconData icon;
  final String title;
  final String message;

  /// Hisobsiz ham bajarsa bo'ladigan ikkinchi amal (ixtiyoriy).
  final Widget? secondary;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 44, color: SellobayColors.mutedText),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: SellobayType.cardTitle,
                fontWeight: FontWeight.w700,
                color: SellobayColors.ink,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: SellobayType.bodySm,
                height: 1.45,
                color: SellobayColors.mutedText,
              ),
            ),
            const SizedBox(height: 22),
            FilledButton(
              onPressed: () => requireSignIn(context),
              child: Text(context.t('auth.loginSubmit')),
            ),
            if (secondary != null) ...[const SizedBox(height: 10), secondary!],
          ],
        ),
      ),
    );
  }
}
