import 'package:flutter/foundation.dart';
import 'package:url_launcher/url_launcher.dart';

/// Qurilmadagi BOSHQA ilovalarga topshiriladigan amallar: qo'ng'iroq va
/// xaritada yo'l ko'rsatish.
///
/// Manzil qurish mantiqi `launchUrl` dan AJRATILGAN: URI yasash sof
/// funksiya va testda tekshiriladi, ilova ochish esa platformaga
/// bog'liq va widget testida umuman ishlamaydi.

/// `tel:` manzili.
///
/// Raqamdan bo'shliq, qavs va tire olib tashlanadi: `tel:` sxemasi
/// ularni qabul qiladi, lekin ba'zi dialerlar «+998 90 123 45 67» ni
/// ochganda birinchi bo'shliqdan keyingisini tashlab yuboradi.
/// Boshidagi `+` SAQLANADI — usiz xalqaro raqam terilmaydi.
Uri callUri(String phone) {
  final cleaned = phone.replaceAll(RegExp(r'[^0-9+]'), '');
  return Uri(scheme: 'tel', path: cleaned);
}

/// Xaritada ochish uchun manzillar — TARTIB bilan.
///
/// Birinchisi `geo:` — Android uni qurilmadagi xarita ilovasiga beradi
/// (Yandex, Google, 2GIS — foydalanuvchi o'zi tanlagani). Xarita
/// ilovasi umuman bo'lmasa, `launchUrl` `false` qaytaradi yoki
/// otiladi, shunda ikkinchi manzil — brauzerda ochiladigan oddiy
/// havola — ishlatiladi.
///
/// Koordinata bo'lsa o'sha ishlatiladi: manzil matni («Toshkent,
/// Yunusobod 1») xaritada noaniq topiladi yoki umuman topilmaydi.
List<Uri> navigationUris({double? latitude, double? longitude, required String address}) {
  final hasCoords = latitude != null && longitude != null;
  final label = Uri.encodeComponent(address);

  if (hasCoords) {
    final point = '$latitude,$longitude';
    return [
      Uri.parse('geo:$point?q=$point($label)'),
      Uri.parse('https://www.google.com/maps/search/?api=1&query=$point'),
    ];
  }

  // Koordinatasiz — faqat matn bo'yicha qidiruv.
  if (address.trim().isEmpty) return const [];
  return [
    Uri.parse('geo:0,0?q=$label'),
    Uri.parse('https://www.google.com/maps/search/?api=1&query=$label'),
  ];
}

/// Ro'yxatdagi birinchi OCHILADIGAN manzilni ochadi.
///
/// Muvaffaqiyatsizlikni `false` bilan qaytaradi, otilmaydi: chaqiruvchi
/// foydalanuvchiga tushunarli xabar ko'rsatadi. Platforma kanali
/// `MissingPluginException` ham tashlashi mumkin (test muhitida) —
/// u ham shu yerda ushlanadi.
typedef UrlOpener = Future<bool> Function(Uri uri);

/// Testda almashtiriladi.
@visibleForTesting
UrlOpener urlOpener = (uri) => launchUrl(uri, mode: LaunchMode.externalApplication);

Future<bool> openFirst(List<Uri> uris) async {
  for (final uri in uris) {
    try {
      if (await urlOpener(uri)) return true;
    } catch (_) {
      // Keyingisini sinaymiz.
    }
  }
  return false;
}
