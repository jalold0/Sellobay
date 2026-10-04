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
      // Foni NATIVE splash bilan bir xil (`pubspec.yaml`) — oq
      // qoldirsak, brend rangidan oqqa sakrash ko'rinardi.
      AuthStatus.unknown => const Scaffold(
          backgroundColor: SellobayColors.ink,
          body: Center(
            child: SizedBox(
              width: 28,
              height: 28,
              child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
            ),
          ),
        ),
      AuthStatus.signedOut => const CourierLoginScreen(),
      AuthStatus.signedIn => const DeliveriesScreen(),
    };
  }
}
