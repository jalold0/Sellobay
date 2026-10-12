/// Ilovani ochadigan havolalar.
///
/// Havola TASHQARIDAN keladi (brauzer, boshqa ilova, push), shuning uchun
/// unga ishonilmaydi: faqat bizning shakllarimiz qabul qilinadi va
/// identifikator UUID bo'lishi shart. Boshqa hamma narsa `null`.
///
/// Qabul qilinadigan shakllar:
/// - `sellobay://orders/<uuid>` — to'lov sahifasi va push shu shaklni beradi;
/// - `https://sellobay.uz/orders/success?order=<uuid>` — to'lovdan qaytish
///   manzilining o'zi (keyinchalik Android App Links bilan ham ochiladi).
final _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  caseSensitive: false,
);

const _webHosts = {'sellobay.uz', 'www.sellobay.uz'};

/// Havoladan buyurtma identifikatorini oladi yoki `null`.
String? parseOrderLink(Uri uri, {Set<String> webHosts = _webHosts}) {
  String? id;

  if (uri.scheme == 'sellobay') {
    if (uri.host == 'orders' && uri.pathSegments.length == 1) {
      id = uri.pathSegments.first;
    }
  } else if (uri.scheme == 'https' && webHosts.contains(uri.host)) {
    // `/orders/success` va til prefiksi bilan (`/uz/orders/success`).
    final segments = uri.pathSegments;
    final isSuccess = segments.length >= 2 &&
        segments[segments.length - 2] == 'orders' &&
        segments.last == 'success';
    if (isSuccess) id = uri.queryParameters['order'];
  }

  if (id == null || !_uuid.hasMatch(id)) return null;
  // Kichik harfga keltiriladi: server UUID'ni shunday qaytaradi va
  // ro'yxat bilan taqqoslash buzilmasin.
  return id.toLowerCase();
}

/// Push bildirishnomaning `data` qismidan buyurtma identifikatori.
///
/// Server `{type: 'order', orderId, status}` yuboradi
/// (`packages/push` → `buildOrderStatusMessage`).
String? orderIdFromPushData(Map<String, dynamic> data) {
  if (data['type'] != 'order') return null;
  final id = data['orderId'];
  if (id is! String || !_uuid.hasMatch(id)) return null;
  return id.toLowerCase();
}
