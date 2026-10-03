import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
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
        final decoded = json.decode(utf8.decode(bytes));
        if (decoded is Map<String, dynamic>) body = decoded;
      }
    }
    calls.add(options.path);
    bodies.add(body);
    queries.add(options.queryParameters);
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
}) {
  final client = buildClient(backend);
  return SellobayRuntime(
    api: client.api,
    repository: client.repo,
    auth: AuthController(repository: client.repo, requiredRole: requiredRole),
    locale: locale,
    catalog: CatalogRepository(client.api),
  );
}
