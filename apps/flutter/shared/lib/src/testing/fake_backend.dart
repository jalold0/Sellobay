import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../../sellobay_shared.dart';

/// Soxta HTTP qatlami: so'rovlarni yozib boradi va tayyor javob qaytaradi.
///
/// Haqiqiy backend o'rniga shu ishlatiladi, chunki tekshirilayotgan narsa
/// SERVER emas — interceptor xulqi: qaysi 401 da yangilash bo'ladi, nechta
/// marta bo'ladi, qanday body yuboriladi.
class FakeBackend implements HttpClientAdapter {
  FakeBackend(this.handler);

  /// `(so'rov, JSON body) -> javob`.
  final FutureOr<ResponseBody> Function(RequestOptions options, Map<String, dynamic>? body) handler;

  /// Yuborilgan yo'llar — kelish tartibida.
  final List<String> calls = <String>[];

  /// Yuborilgan body'lar — `calls` bilan bir xil indeksda.
  final List<Map<String, dynamic>?> bodies = <Map<String, dynamic>?>[];

  /// Yuborilgan so'rov parametrlari — `calls` bilan bir xil indeksda.
  final List<Map<String, dynamic>?> queries = <Map<String, dynamic>?>[];

  /// Yuborilgan sarlavhalar — `calls` bilan bir xil indeksda.
  final List<Map<String, dynamic>> headers = <Map<String, dynamic>>[];

  int countOf(String path) => calls.where((c) => c == path).length;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    Map<String, dynamic>? body;
    if (requestStream != null) {
      final bytes = <int>[];
      await for (final chunk in requestStream) {
        bytes.addAll(chunk);
      }
      if (bytes.isNotEmpty) {
        // JSON bo'lmagan tanalar ham bor (chek yuklashdagi
        // `multipart/form-data`). Ilgari dekodlash istisnosi dio
        // ichida tarmoq xatosiga aylanib, test «tarmoq yo'q» deb
        // yiqilardi. Bunday so'rov uchun `bodies` ga `null` tushadi,
        // `calls` esa baribir yoziladi.
        try {
          final decoded = json.decode(utf8.decode(bytes));
          if (decoded is Map<String, dynamic>) body = decoded;
        } on FormatException {
          body = null;
        }
      }
    }
    calls.add(options.path);
    bodies.add(body);
    queries.add(options.queryParameters);
    headers.add(Map<String, dynamic>.from(options.headers));
    return handler(options, body);
  }

  @override
  void close({bool force = false}) {}
}

/// `{ success: true, data: ... }`.
ResponseBody apiOk(Map<String, dynamic> data) => _body({'success': true, 'data': data}, 200);

/// Xom JSON matn — katalog route'lari kabi O'RALMAGAN javoblar uchun.
///
/// Matn sifatida beriladi, chunki testlar serverdan AYNAN ko'chirilgan
/// javobni ishlatadi: qayta yozilgan `Map` shaklni emas, tasavvurni
/// tekshirardi.
ResponseBody rawJson(String body, {int status = 200}) => ResponseBody.fromString(
      body,
      status,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );

/// Xom foydali yukni KONVERTGA o'raydi.
///
/// Fiksturalar o'qilishi uchun qulay bo'lsin deb saqlangan: ular
/// serverning `data` qismini yozadi, o'ram esa shu yerda qo'shiladi.
/// `apiOk` dan farqi — tayyor JSON SATRINI oladi, Map emas.
ResponseBody okJson(String payload, {int status = 200}) =>
    rawJson('{"success":true,"data":$payload}', status: status);

/// `{ success: false, error: { code, message } }`.
ResponseBody apiErr(
  int status,
  String code,
  String message, {
  int? retryAfterSec,
}) =>
    _body(
      {
        'success': false,
        'error': {'code': code, 'message': message},
      },
      status,
      extraHeaders: retryAfterSec == null
          ? null
          : {
              'retry-after': ['$retryAfterSec'],
            },
    );

ResponseBody _body(
  Map<String, dynamic> payload,
  int status, {
  Map<String, List<String>>? extraHeaders,
}) =>
    ResponseBody.fromString(
      json.encode(payload),
      status,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
        ...?extraHeaders,
      },
    );

/// Tarmoq uzilishi.
Never offline(RequestOptions options) => throw DioException.connectionError(
      requestOptions: options,
      reason: 'test: tarmoq yo`q',
    );

Map<String, dynamic> tokenPair(String suffix) => {
      'access': 'access-$suffix',
      'refresh': 'refresh-$suffix',
    };

Map<String, dynamic> userJson({
  String id = '11111111-1111-4111-8111-111111111111',
  String? phone = '+998901234567',
  String? email,
  List<String>? roles,
}) =>
    {
      'id': id,
      'email': email,
      'phone': phone,
      'firstName': 'Dilnoza',
      'lastName': null,
      'locale': 'uz',
      'status': 'ACTIVE',
      'loyaltyPoints': 0,
      'roles': ?roles,
    };

/// Xotiradagi sessiya saqlovi.
///
/// `flutter_secure_storage` platforma kanaliga chiqadi, testda esa
/// platforma yo'q. Barcha metodlar qoplangani uchun asl saqlovga
/// umuman murojaat qilinmaydi.
class MemorySessionStore extends SessionStore {
  String? _access;
  String? _refresh;
  AuthUser? _user;

  bool get isEmpty => _access == null && _refresh == null && _user == null;

  @override
  Future<String?> readAccess() async => _access;

  @override
  Future<String?> readRefresh() async => _refresh;

  @override
  Future<void> save({required String access, required String refresh}) async {
    _access = access;
    _refresh = refresh;
  }

  @override
  Future<AuthUser?> readUser() async => _user;

  @override
  Future<void> saveUser(AuthUser user) async => _user = user;

  @override
  Future<void> clear() async {
    _access = null;
    _refresh = null;
    _user = null;
  }
}

/// Test uchun tayyor klient.
({ApiClient api, AuthRepository repo, MemorySessionStore store}) buildClient(FakeBackend backend) {
  final store = MemorySessionStore();
  final dio = Dio()..httpClientAdapter = backend;
  final api = ApiClient(dio: dio, session: store);
  return (api: api, repo: AuthRepository(api), store: store);
}

/// Soxta backendga ulangan to'liq runtime — vidjet testlari uchun.
///
/// [locale] ALLAQACHON yuklangan bo'lishi kerak. Uni `setUpAll` da
/// yuklang: `testWidgets` tanasi soxta vaqt zonasida ishlaydi va u
/// yerda asset o'qish hech qachon tugamaydi.
SellobayRuntime buildRuntime(
  FakeBackend backend, {
  required LocaleController locale,
  String? requiredRole,
  CartStore? cart,
  SellobayConfig? config,
  Duration cartDebounce = const Duration(milliseconds: 800),
}) {
  final client = buildClient(backend);
  final auth = AuthController(repository: client.repo, requiredRole: requiredRole);
  final catalog = CatalogRepository(client.api);
  final cartStore = cart ?? CartStore(storage: InMemoryCartStorage());
  return SellobayRuntime(
    api: client.api,
    repository: client.repo,
    auth: auth,
    locale: locale,
    catalog: catalog,
    cart: cartStore,
    checkout: CheckoutRepository(client.api),
    addresses: AddressRepository(client.api),
    orders: OrdersRepository(client.api),
    loyalty: LoyaltyRepository(client.api),
    promo: PromoRepository(client.api),
    reviews: ReviewsRepository(client.api),
    wishlist: WishlistStore(repository: WishlistRepository(client.api), auth: auth),
    courier: CourierRepository(client.api),
    cartSync: CartSync(
      auth: auth,
      cart: cartStore,
      repository: CartRepository(client.api),
      catalog: catalog,
      debounce: cartDebounce,
    )..start(),
    config: ValueNotifier<SellobayConfig?>(config),
  );
}

/// Xotiradagi savat saqlovi — testda qurilma xotirasi yo'q.
class InMemoryCartStorage implements CartStorage {
  String? _value;

  @override
  Future<String?> read() async => _value;

  @override
  Future<void> write(String value) async => _value = value;

  @override
  Future<void> clear() async => _value = null;
}

/// `GET /api/config` ning HAQIQIY javobi (lokal prod build'dan olingan).
///
/// Testlar qo'lda yozilgan shakl ustida emas, serverning o'z javobi
/// ustida ishlasin — server o'zgarsa test yiqilsin, ilova emas.
const realConfigResponse = '''
{
  "shipping": { "currency": "UZS", "standardFee": 20000, "expressFee": 50000, "freeThreshold": 500000 },
  "loyalty": {
    "coinPerSom": 0.001,
    "coinValueSom": 10,
    "tiers": [
      { "key": "bronze",   "min": 0,        "cashbackPct": 1, "icon": "B" },
      { "key": "silver",   "min": 1000000,  "cashbackPct": 2, "icon": "S" },
      { "key": "gold",     "min": 5000000,  "cashbackPct": 3, "icon": "G" },
      { "key": "platinum", "min": 20000000, "cashbackPct": 5, "icon": "P" }
    ]
  },
  "returns": { "windowDays": 14 },
  "geo": { "tashkentCityBbox": { "latMin": 41.15, "latMax": 41.4, "lngMin": 69.1, "lngMax": 69.45 } },
  "locales": ["uz", "ru", "en"]
}
''';

/// Shu javobdan qurilgan konfiguratsiya.
SellobayConfig testConfig() =>
    SellobayConfig.fromJson(json.decode(realConfigResponse) as Map<String, dynamic>);
