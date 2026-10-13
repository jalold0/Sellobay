import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'deep_links.dart';
import 'home_tabs.dart';
import 'screens/home_shell.dart';
import 'screens/splash_screen.dart';

class SellobayCustomerApp extends StatefulWidget {
  const SellobayCustomerApp({super.key, required this.runtime, this.linkSources = const []});

  final SellobayRuntime runtime;

  /// Buyurtmani ochishni so'raydigan manbalar (havola, push bosilishi).
  /// Testlarda bo'sh.
  final List<OrderLinkSource> linkSources;

  @override
  State<SellobayCustomerApp> createState() => _SellobayCustomerAppState();
}

class _SellobayCustomerAppState extends State<SellobayCustomerApp> {
  final _tabs = HomeTabsController();
  final _navigatorKey = GlobalKey<NavigatorState>();
  late final DeepLinkRouter _links = DeepLinkRouter(
    navigatorKey: _navigatorKey,
    auth: widget.runtime.auth,
    tabs: _tabs,
    sources: widget.linkSources,
  );

  @override
  void initState() {
    super.initState();
    _links.start();
  }

  @override
  void dispose() {
    _links.dispose();
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
          navigatorKey: _navigatorKey,
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
///
/// Mehmon ham qobiqqa KIRADI: katalog, savat va mehmon checkout'i
/// hisobsiz ishlaydi. Ilgari kirmagan odamni darhol login ekraniga
/// qamab qo'yardik — do'konni ko'rmasdan turib hisob ochishni talab
/// qilish xaridorning yarmini eshikdayoq qaytarardi. Hisob kerak
/// bo'lgan joylar (buyurtmalar, profil, sevimlilar) o'zi kirishni
/// so'raydi — qarang `auth_flow.dart`.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return switch (AuthScope.of(context).status) {
      // Sessiya hali o'qilmagan. Qobiqni darhol ko'rsatsak, kirgan
      // foydalanuvchi bir lahzaga «kiring» taklifini ko'rib qolardi.
      AuthStatus.unknown => const SplashScreen(),
      AuthStatus.signedOut || AuthStatus.signedIn => const HomeShell(),
    };
  }
}
