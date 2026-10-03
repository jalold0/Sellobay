/// Mahsulot rasmi manzilini ko'rsatishga tayyor holatga keltiradi.
///
/// Bazada uch xil qiymat uchraydi (`packages/utils/src/product-image.ts`
/// izohida batafsil):
///   1. sotuvchi yuklagan haqiqiy fayl manzili — o'zgartirilmaydi;
///   2. `picsum.photos/seed/<seed>/...` — seed ma'lumotidan qolgan
///      TASODIFIY rasm xizmati. Uni ko'rsatish mumkin emas: u mahsulotga
///      aloqasi yo'q rasm qaytaradi (telefonda saytdagidan boshqa rasm
///      chiqardi). Seed'dan repodagi haqiqiy faylni topamiz;
///   3. bo'sh — rasm yo'q.
///
/// NEGA TS DAGI `LOCAL_PRODUCT_IMAGE_SEEDS` RO'YXATI KO'CHIRILMADI:
/// u repodagi fayllar ro'yxati va TS tomonining o'z izohida "vaqtinchalik,
/// sotuvchilar rasm yuklagan sari qisqaradi" deb yozilgan. Ikki tilda
/// qo'lda yuritilsa, ro'yxatlar muqarrar ajralib ketardi. O'rniga manzil
/// shunchaki quriladi va fayl topilmasa `Image.network` ning
/// `errorBuilder` i mahalliy placeholder'ni chizadi — natija bir xil,
/// lekin sinxronlashtiriladigan ro'yxat yo'q.
library;

final RegExp _picsumSeed = RegExp(r'picsum\.photos/seed/([^/]+)/');

/// picsum manzilidan seed. picsum bo'lmasa — `null`.
String? picsumSeed(String? url) {
  if (url == null || url.isEmpty) return null;
  return _picsumSeed.firstMatch(url)?.group(1);
}

/// Bu manzil haqiqiy mahsulot rasmimi yoki seed qoldig'imi.
bool isRealProductImageUrl(String? url) =>
    url != null && url.isNotEmpty && picsumSeed(url) == null;

/// Yuklab bo'ladigan to'liq manzil, yoki rasm yo'q bo'lsa `null`.
///
/// [baseUrl] — SHART: server `/products/x.jpg` kabi nisbiy yo'l qaytaradi
/// va uni telefon o'zi hal qila olmaydi.
String? resolveProductImageUrl({
  required String? dbUrl,
  required String slug,
  required String baseUrl,
}) {
  final base = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;

  if (isRealProductImageUrl(dbUrl)) {
    final url = dbUrl!;
    // Absolut manzil (sotuvchi yuklagan Blob) — tegilmaydi.
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // SVG placeholder'ni YUKLAMAYMIZ: Flutter uni qo'shimcha paketsiz
    // chiza olmaydi. `null` qaytsa, ekran o'z belgisini chizadi.
    if (url.endsWith('.svg')) return null;
    return url.startsWith('/') ? '$base$url' : '$base/$url';
  }

  final seed = picsumSeed(dbUrl) ?? slug;
  if (seed.isEmpty) return null;
  return '$base/products/$seed.jpg';
}
