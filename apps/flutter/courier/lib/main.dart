import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'src/app.dart';
import 'src/push/firebase_token_source.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Rol darvozasi SHU YERDA o'rnatiladi: kuryer huquqi bo'lmagan hisob
  // kirsa, sessiya serverda ham bekor qilinadi (`AuthController._denyRole`).
  final runtime = await bootstrapSellobay(requiredRole: UserRoles.courier);
  await _startPush(runtime);
  runApp(SellobayCourierApp(runtime: runtime));
}

/// Push ixtiyoriy: Firebase sozlanmagan bo'lsa (`google-services.json`
/// yo'q — CI, yangi klon) ilova push'siz ishlayveradi.
Future<void> _startPush(SellobayRuntime runtime) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {
    return;
  }
  PushRegistrar(
    auth: runtime.auth,
    repository: PushRepository(runtime.api),
    source: FirebaseTokenSource(),
    appName: 'courier',
  ).start();
}
