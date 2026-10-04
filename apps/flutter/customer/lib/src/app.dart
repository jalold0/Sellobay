import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'home_tabs.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
import 'screens/splash_screen.dart';

class SellobayCustomerApp extends StatefulWidget {
  const SellobayCustomerApp({super.key, required this.runtime});

  final SellobayRuntime runtime;

  @override
  State<SellobayCustomerApp> createState() => _SellobayCustomerAppState();
}

class _SellobayCustomerAppState extends State<SellobayCustomerApp> {
  final _tabs = HomeTabsController();

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final runtime = widget.runtime;
    // SellobayScope MaterialApp'dan YUQORIDA turadi, shuning uchun
    // Navigator surgan ekranlar ham `context.t()` va `AuthScope` ni
    // ko'ra oladi (ular MaterialApp'ning pastki daraxtida quriladi).
    return SellobayScope(
      runtime: runtime,
      // `HomeTabsScope` ham MaterialApp'dan YUQORIDA: surilgan ekranlar
      // («buyurtma qabul qilindi») bo'limni almashtira olishi kerak.
      child: HomeTabsScope(
        controller: _tabs,
        child: MaterialApp(
          onGenerateTitle: (context) => context.t('common.appName'),
          debugShowCheckedModeBanner: false,
          theme: buildSellobayTheme(),
          home: const AuthGate(),
        ),
      ),
    );
  }
}

/// Auth holatiga qarab ildiz ekranni tanlaydi.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return switch (AuthScope.of(context).status) {
      // Sessiya hali o'qilmagan. Bu holat `signedOut` dan ajratilgan:
      // aks holda ilova har ochilganda bir lahzaga login ekranini
      // ko'rsatib yuborardi.
      AuthStatus.unknown => const SplashScreen(),
      AuthStatus.signedOut => const LoginScreen(),
      AuthStatus.signedIn => const HomeShell(),
    };
  }
}
