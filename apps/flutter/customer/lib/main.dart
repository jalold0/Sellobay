import 'package:flutter/material.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'src/app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Tarjimalar yuklanadi, sessiya tiklash esa fonda ketadi — qarang
  // `bootstrapSellobay`.
  final runtime = await bootstrapSellobay();
  runApp(SellobayCustomerApp(runtime: runtime));
}
