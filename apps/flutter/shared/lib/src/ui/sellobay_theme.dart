import 'package:flutter/material.dart';

import 'sellobay_type.dart';

/// Brend ranglari — `packages/ui/src/globals.css` dagi tokenlardan.
///
/// Qiymatlar o'sha fayldagi izohlarda yozilgan HEX'lar (dizayner manbasi),
/// HSL dan hisoblangan taxminlar emas. Web rangni o'zgartirsa, bu yer ham
/// QO'LDA yangilanadi — Flutter CSS o'zgaruvchilarini o'qiy olmaydi.
abstract final class SellobayColors {
  /// `--primary` — Crimson, sellobay-master-square.png dan olingan.
  static const primary = Color(0xFF531625);
  static const primaryBright = Color(0xFF762237);

  /// `--secondary` / `--foreground` — brend qorasi.
  static const ink = Color(0xFF0A0A0C);

  /// `--accent` — premium oltin.
  static const accent = Color(0xFFC9A961);

  /// `--muted` — UMBRA editorial soft fon.
  static const soft = Color(0xFFFAF6F4);
  static const mutedText = Color(0xFF6B6B73);
  static const border = Color(0xFFEAEAEC);

  static const success = Color(0xFF1F8A5B);
  /// `--destructive` — #B81E2B, oq fonda 6,44:1. Ilgari #EF4444 edi (3,8:1 — WCAG AA'dan
  /// past, audit A11Y-02) va web'dagi tokendan ajralib qolgan edi.
  static const destructive = Color(0xFFB81E2B);
}

ThemeData buildSellobayTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: SellobayColors.primary,
    primary: SellobayColors.primary,
    onPrimary: Colors.white,
    secondary: SellobayColors.accent,
    error: SellobayColors.destructive,
    surface: Colors.white,
    onSurface: SellobayColors.ink,
  );

  // `--radius: 0.875rem` = 14px.
  const radius = BorderRadius.all(Radius.circular(14));

  OutlineInputBorder border(Color color, [double width = 1]) => OutlineInputBorder(
        borderRadius: radius,
        borderSide: BorderSide(color: color, width: width),
      );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: Colors.white,
    // Oila BIR joyda beriladi. Flutter'da Text o'z uslubini ambient
    // uslub ustiga qo'shadi (merge), shuning uchun ilovadagi mavjud
    // 238 ta "fontSize:" chaqiruvi ham shu oilani oladi — ularning
    // birortasini ham qayta yozish shart emas.
    fontFamily: SellobayType.sans,
    textTheme: buildSellobayTextTheme(),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: SellobayColors.ink,
      elevation: 0,
      centerTitle: false,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: SellobayColors.soft,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: border(SellobayColors.border),
      enabledBorder: border(SellobayColors.border),
      focusedBorder: border(SellobayColors.primary, 1.5),
      errorBorder: border(SellobayColors.destructive),
      focusedErrorBorder: border(SellobayColors.destructive, 1.5),
      hintStyle: const TextStyle(color: SellobayColors.mutedText),
    ),
    // Tugma matni labelLarge dan KELMAYDI: u slotni Chip va Tab ham
    // o'qiydi, shuning uchun u yerda Material o'lchami qoldirilgan.
    // Bu yerdagi uslub mavzunikini merge qilmay almashtiradi —
    // demak oila QO'LDA ko'rsatiladi, aks holda tugma matni yolg'iz
    // o'zi platforma shriftiga tushib qolardi.
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: const RoundedRectangleBorder(borderRadius: radius),
        textStyle: const TextStyle(
          fontFamily: SellobayType.sans,
          fontSize: SellobayType.bodyLg,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: const RoundedRectangleBorder(borderRadius: radius),
        side: const BorderSide(color: SellobayColors.border),
        foregroundColor: SellobayColors.ink,
      ),
    ),
    // M3 `ColorScheme.fromSeed` tanlangan holat uchun pushti
    // `secondaryContainer` chiqaradi — u brend rangi emas. Pastki panel
    // va chiplar ilovaning eng ko'rinadigan joyi, shuning uchun ular
    // aniq belgilanadi.
    //
    // DIQQAT: bu yerda `TextStyle` BERILMAYDI. `WidgetStateProperty`
    // dagi uslub mavzudagi shriftni merge qilmay almashtiradi va
    // oila ko'rsatilmasa platforma standartiga tushib ketadi.
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      indicatorColor: SellobayColors.primary.withValues(alpha: 0.10),
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(
          size: 23,
          color: states.contains(WidgetState.selected)
              ? SellobayColors.primary
              : SellobayColors.mutedText,
        ),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: Colors.white,
      selectedColor: SellobayColors.primary.withValues(alpha: 0.10),
      checkmarkColor: SellobayColors.primary,
      side: const BorderSide(color: SellobayColors.border),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(10))),
    ),
    // Segmentli tugma ham M3'ning pushti `secondaryContainer`ini oladi:
    // chiplar bilan bir xil brend ranglari. `TextStyle` yana BERILMAYDI.
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        backgroundColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? SellobayColors.primary.withValues(alpha: 0.10)
              : Colors.white,
        ),
        foregroundColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? SellobayColors.primary
              : SellobayColors.ink,
        ),
        side: const WidgetStatePropertyAll(
          BorderSide(color: SellobayColors.border),
        ),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}
