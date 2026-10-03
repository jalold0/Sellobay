import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Kirgandan keyingi ekran.
///
/// VAQTINCHA: katalog, savat va profil hali yozilmagan. Bu yerda
/// soxta mahsulotlar yoki soxta buyurtmalar KO'RSATILMAYDI — ekran
/// nimaning tayyor ekanini rostini aytadi. Keyingi bosqichda shu
/// o'rinni katalog egallaydi.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = AuthScope.of(context);
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(
        title: Text(context.t('common.appName')),
        actions: [
          IconButton(
            tooltip: context.t('profile.signOut'),
            onPressed: () => AuthScope.read(context).signOut(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle_outline, size: 48, color: SellobayColors.success),
              const SizedBox(height: 16),
              Text(
                context.t('auth.loginSuccess'),
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: SellobayColors.ink,
                ),
              ),
              if (user != null) ...[
                const SizedBox(height: 6),
                Text(
                  user.displayName,
                  style: const TextStyle(fontSize: 14.5, color: SellobayColors.mutedText),
                ),
              ],
              const SizedBox(height: 28),
              Text(
                context.t('common.notConnectedYet'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
