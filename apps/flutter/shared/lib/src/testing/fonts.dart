import 'dart:io';

import 'package:flutter/services.dart';

import '../ui/sellobay_type.dart';

/// Ekran suratlari (`tool/screens.dart`) uchun HAQIQIY shriftlar.
///
/// `flutter test` standart holda har bir glifni to'rtburchak chizadigan
/// sinov shriftini ishlatadi va `pubspec.yaml` dagi `fonts:` ni
/// YUKLAMAYDI. Shuning uchun brend shriftlari paket asset'idan qo'lda
/// ro'yxatdan o'tkaziladi — oila nomi ilovadagi bilan AYNAN bir xil
/// ([SellobayType.sans]/[SellobayType.serif]), ya'ni surat qurilmadagi
/// ko'rinishni beradi. Belgilar shrifti esa Flutter SDK bilan keladi.
Future<void> loadBrandFontsForScreens() async {
  Future<void> family(String name, Future<ByteData> bytes) async {
    final loader = FontLoader(name)..addFont(bytes);
    await loader.load();
  }

  await family(
    SellobayType.sans,
    rootBundle.load('packages/sellobay_shared/assets/fonts/Inter-Variable.ttf'),
  );
  await family(
    SellobayType.serif,
    rootBundle.load('packages/sellobay_shared/assets/fonts/PlayfairDisplay-Variable.ttf'),
  );

  final root = Platform.environment['FLUTTER_ROOT'];
  if (root == null) throw StateError('FLUTTER_ROOT yo`q — `flutter test` orqali ishga tushiring');
  final icons = File('$root/bin/cache/artifacts/material_fonts/materialicons-regular.otf');
  await family('MaterialIcons', Future.value(ByteData.sublistView(icons.readAsBytesSync())));
}
