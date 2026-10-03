import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'screens/deliveries_screen.dart';
import 'screens/login_screen.dart';

class SellobayCourierApp extends StatelessWidget {
  const SellobayCourierApp({super.key, required this.runtime});

  final SellobayRuntime runtime;

  @override
  Widget build(BuildContext context) {
    return SellobayScope(
      runtime: runtime,
      child: MaterialApp(
        onGenerateTitle: (context) => context.t('courier.appName'),
        debugShowCheckedModeBanner: false,
        theme: buildSellobayTheme(),
        home: const _CourierGate(),
      ),
    );
  }
}

class _CourierGate extends StatelessWidget {
  const _CourierGate();

  @override
  Widget build(BuildContext context) {
    return switch (AuthScope.of(context).status) {
      AuthStatus.unknown => const Scaffold(
          body: Center(
            child: SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(strokeWidth: 2.5, color: SellobayColors.primary),
            ),
          ),
        ),
      AuthStatus.signedOut => const CourierLoginScreen(),
      AuthStatus.signedIn => const DeliveriesScreen(),
    };
  }
}
