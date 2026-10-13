import 'package:flutter/material.dart';

/// Sellobay tipografiyasi — o'lchov shkalasi va shrift oilalari.
///
/// NEGA KERAK: ilova bo'ylab 238 joyda `fontSize:` yozilgan va ular 25 xil
/// qiymat ishlatardi — 8.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5 kabi yarim
/// punktlar ham bor edi. Bu shkala emas, tasodif: har bir ekran o'ziga
/// yaqin qiymatni mustaqil tanlagan. Natijada yonma-yon turgan ikki
/// sarlavha ko'zga ilinar-ilinmas boshqacha chiqardi.
///
/// Bu yerda 10 ta pog'ona bor. Yangi matn shulardan birini oladi; oraliq
/// qiymat kerak bo'lsa, demak pog'ona noto'g'ri tanlangan.
abstract final class SellobayType {
  /// Interfeys shrifti — web'dagi `--font-sans` bilan bir xil.
  ///
  /// Fayl shu paketda (`assets/fonts/`, `pubspec.yaml` dagi `fonts:`).
  /// Paketdagi shrift ilovaga `packages/<paket>/<oila>` nomi bilan
  /// chiqadi — oddiy `'Inter'` deb yozilsa topilmaydi va matn jimgina
  /// platforma standartiga (Android'da Roboto) tushib qoladi. Aynan shu
  /// bo'lgan edi: oila nomi bor edi, fayl esa yo'q.
  static const sans = 'packages/sellobay_shared/Inter';

  /// Sarlavha shrifti — web'dagi `--font-serif`.
  ///
  /// FAQAT logotip va katta sarlavhalar uchun (>= 22). Playfair yuqori
  /// kontrastli didone: 14-16 punktda ingichka shtrixlari telefon
  /// ekranida yo'qoladi va matn kuchsiz ko'rinadi.
  static const serif = 'packages/sellobay_shared/Playfair Display';

  // ---- Shkala ----------------------------------------------------------
  // Qiymatlar butun son. Yarim punkt ko'zga ko'rinmaydi, lekin kodda
  // "bu yerda nimadir boshqacha" degan yolg'on signal beradi.

  static const micro = 11.0; // nishon, hisoblagich
  static const caption = 12.0; // meta, izoh
  static const bodySm = 13.0; // ikkilamchi matn
  static const body = 14.0; // asosiy matn — standart
  static const rowTitle = 15.0; // ro'yxat qatori sarlavhasi
  static const bodyLg = 16.0; // ajratilgan matn, tugma
  static const cardTitle = 18.0; // karta sarlavhasi
  static const section = 20.0; // bo'lim sarlavhasi
  static const screen = 24.0; // ekran sarlavhasi
  static const hero = 28.0; // bosh blok
  static const display = 34.0; // katta raqam (balans, summa)

  /// Sarlavha uslubi — serif oilasida.
  ///
  /// Web'da bu `className="font-serif"`: oila standart emas, ataylab
  /// yoqiladi. Shuning uchun bu yerda ham alohida chaqiriladi.
  static TextStyle heading(
    double size, {
    FontWeight weight = FontWeight.w700,
    Color? color,
    double height = 1.2,
  }) =>
      TextStyle(
        fontFamily: serif,
        fontSize: size,
        fontWeight: weight,
        height: height,
        color: color,
      );
}

/// Material slotlariga bog'langan matn mavzusi.
///
/// Flutter'da `Text(style: TextStyle(fontSize: 14))` ambient uslub bilan
/// QO'SHILADI (merge), almashtirmaydi. Shuning uchun bu yerda oila bir
/// marta berilsa, mavjud 238 ta `fontSize:` chaqiruvi ham o'sha oilani
/// oladi — ularni qayta yozish shart emas.
TextTheme buildSellobayTextTheme() {
  const f = SellobayType.sans;

  // Kichik o'lchamda satr oralig'i kengroq, kattada torroq: 28 punktli
  // sarlavhada 1.5 oraliq qatorlarni bir-biridan uzib yuboradi.
  TextStyle s(double size, FontWeight weight, double height) =>
      TextStyle(fontFamily: f, fontSize: size, fontWeight: weight, height: height);

  return TextTheme(
    displayLarge: s(SellobayType.display, FontWeight.w700, 1.10),
    displayMedium: s(SellobayType.hero, FontWeight.w700, 1.15),
    displaySmall: s(SellobayType.screen, FontWeight.w700, 1.20),

    headlineLarge: s(SellobayType.hero, FontWeight.w700, 1.15),
    headlineMedium: s(SellobayType.screen, FontWeight.w700, 1.20),
    headlineSmall: s(SellobayType.section, FontWeight.w700, 1.25),

    titleLarge: s(SellobayType.section, FontWeight.w700, 1.25),
    titleMedium: s(SellobayType.cardTitle, FontWeight.w600, 1.30),
    titleSmall: s(SellobayType.rowTitle, FontWeight.w600, 1.35),

    bodyLarge: s(SellobayType.bodyLg, FontWeight.w400, 1.50),
    bodyMedium: s(SellobayType.body, FontWeight.w400, 1.50),
    bodySmall: s(SellobayType.bodySm, FontWeight.w400, 1.45),

    // label slotlari Material o'lchamlarida QOLADI va bu ataylab.
    // Ularni Chip, Tab va SegmentedButton ham o'qiydi: labelLarge'ni
    // 16/w600 ga ko'targanda punkt ekranidagi shahar chiplari kengayib
    // 390px kenglikdan chiqib ketgan va testda tutilgan edi.
    // Tugma o'z o'lchamini mavzudan oladi — qarang sellobay_theme.dart.
    labelLarge: s(SellobayType.body, FontWeight.w500, 1.25),
    labelMedium: s(SellobayType.caption, FontWeight.w500, 1.35),
    labelSmall: s(SellobayType.micro, FontWeight.w600, 1.30),
  );
}
