import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('brend shriftlari ilova to`plamida — mavzudagi oila nomi bilan', () async {
    // Ilgari mavzu 'Inter' va 'Playfair Display' ni so'rardi, lekin
    // hech qaysi pubspec ularni e'lon qilmagan edi — matn jimgina
    // Roboto'ga tushardi. Oila nomi manifestdagi bilan AYNAN mos
    // kelishi shart (paket shrifti `packages/<paket>/` prefiksi bilan).
    final manifest = json.decode(await rootBundle.loadString('FontManifest.json')) as List<dynamic>;
    final families = manifest.cast<Map<String, dynamic>>().map((f) => f['family']).toSet();

    expect(families, contains(SellobayType.sans));
    expect(families, contains(SellobayType.serif));
  });
}
