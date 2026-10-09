import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'src/app.dart';
import 'src/push/firebase_token_source.dart';
import 'src/push/link_sources.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Tarjimalar yuklanadi, sessiya tiklash esa fonda ketadi — qarang
  // `bootstrapSellobay`.
  final runtime = await bootstrapSellobay();
  final pushReady = await _startPush(runtime);
  runApp(
    SellobayCustomerApp(
      runtime: runtime,
      linkSources: [
        // To'lovdan qaytish: `sellobay://orders/<id>`.
        AppLinksOrderSource(),
        // Bildirishnoma bosilishi — faqat Firebase sozlangan bo'lsa.
        if (pushReady) PushTapOrderSource(),
      ],
    ),
  );
}

/// Push ixtiyoriy: Firebase sozlanmagan bo'lsa (`google-services.json`
/// yo'q — CI, yangi klon) ilova push'siz ishlayveradi.
Future<bool> _startPush(SellobayRuntime runtime) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {
    return false;
  }
  PushRegistrar(
    auth: runtime.auth,
    repository: PushRepository(runtime.api),
    source: FirebaseTokenSource(),
    appName: 'customer',
  ).start();
  return true;
}
