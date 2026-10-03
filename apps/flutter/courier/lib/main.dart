import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'src/app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Rol darvozasi SHU YERDA o'rnatiladi: kuryer huquqi bo'lmagan hisob
  // kirsa, sessiya serverda ham bekor qilinadi (`AuthController._denyRole`).
  final runtime = await bootstrapSellobay(requiredRole: UserRoles.courier);
  runApp(SellobayCourierApp(runtime: runtime));
}
