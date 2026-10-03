import 'package:dio/dio.dart';

import '../auth/token_store.dart';
import '../config/app_config.dart';
import 'api_exception.dart';
import 'sellobay_config.dart';

/// Sellobay API klienti.
///
/// Backend — `apps/web` dagi Next.js route'lari. Shartnoma va tuzoqlar:
/// docs/FLUTTER-MIGRATION.md
class ApiClient {
  ApiClient({AppConfig config = AppConfig.fromEnvironment, TokenStore? tokens, Dio? dio})
      : _tokens = tokens ?? TokenStore(),
        _dio = dio ?? Dio() {
    _dio.options
      ..baseUrl = config.apiBaseUrl
      ..connectTimeout = const Duration(seconds: 12)
      ..receiveTimeout = const Duration(seconds: 12)
      ..headers['Accept'] = 'application/json'
      // 4xx/5xx ni o'zimiz ishlaymiz — dio ularni istisnoga aylantirmasin.
      ..validateStatus = (_) => true;

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final access = await _tokens.readAccess();
          if (access != null && access.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $access';
          }
          handler.next(options);
        },
        onResponse: (response, handler) async {
          // Access JWT atigi 15 daqiqa yashaydi, refresh esa 30 kun.
          // 401 kelsa bir marta yangilab, so'rovni QAYTA yuboramiz.
          final alreadyRetried = response.requestOptions.extra['sb_retried'] == true;
          if (response.statusCode != 401 || alreadyRetried) {
            return handler.next(response);
          }
          final refreshed = await _refreshOnce();
          if (!refreshed) return handler.next(response);

          final opts = response.requestOptions;
          opts.extra['sb_retried'] = true;
          final access = await _tokens.readAccess();
          if (access != null) opts.headers['Authorization'] = 'Bearer $access';
          handler.resolve(await _dio.fetch<dynamic>(opts));
        },
      ),
    );
  }

  final Dio _dio;
  final TokenStore _tokens;

  /// Bir vaqtda ketayotgan yangilash. SINGLE-FLIGHT shart: bir nechta
  /// so'rov birvarakayiga 401 olsa, har biri alohida yangilashga urinsa
  /// refresh token rotatsiyasi poyga holatiga tushadi va sessiya uziladi.
  Future<bool>? _refreshing;

  Future<bool> _refreshOnce() {
    return _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);
  }

  Future<bool> _doRefresh() async {
    final refresh = await _tokens.readRefresh();
    if (refresh == null || refresh.isEmpty) return false;

    try {
      // Web cookie ishlatadi, mobil — body. Bitta route ikkalasini ham biladi.
      final res = await _dio.post<dynamic>(
        '/api/auth/refresh',
        data: {'refresh': refresh},
        options: Options(extra: {'sb_retried': true}),
      );
      if (res.statusCode == 401) {
        // Refresh ham yaroqsiz (30 kun o'tgan yoki bekor qilingan).
        await _tokens.clear();
        return false;
      }
      final body = res.data;
      if (body is! Map || body['success'] != true) return false;
      final tokens = (body['data'] as Map?)?['tokens'] as Map?;
      if (tokens == null) return false;

      await _tokens.save(
        access: tokens['access'] as String,
        refresh: tokens['refresh'] as String,
      );
      return true;
    } on DioException {
      // Tarmoq xatosi SESSIYANI TUGATMAYDI — metroda internet yo'qolgani
      // uchun foydalanuvchi tizimdan chiqib qolmasligi kerak.
      return false;
    }
  }

  /// `{ success, data }` javobini ochadi, xato bo'lsa [ApiException] uloqtiradi.
  T _unwrap<T>(Response<dynamic> res) {
    final body = res.data;
    if (body is Map && body['success'] == true) return body['data'] as T;

    final err = body is Map ? body['error'] as Map? : null;
    throw ApiException(
      code: err?['code'] as String? ?? 'UNKNOWN',
      message: err?['message'] as String? ?? 'Noma`lum xato',
      statusCode: res.statusCode,
    );
  }

  Future<T> get<T>(String path, {Map<String, dynamic>? query}) async =>
      _unwrap<T>(await _dio.get<dynamic>(path, queryParameters: query));

  Future<T> post<T>(String path, {Object? body, Map<String, String>? headers}) async =>
      _unwrap<T>(await _dio.post<dynamic>(path, data: body, options: Options(headers: headers)));

  Future<T> put<T>(String path, {Object? body}) async =>
      _unwrap<T>(await _dio.put<dynamic>(path, data: body));

  Future<T> delete<T>(String path, {Object? body}) async =>
      _unwrap<T>(await _dio.delete<dynamic>(path, data: body));

  /// Biznes qoidalari. Ilova ishga tushganda bir marta olinadi.
  Future<SellobayConfig> fetchConfig() async {
    // `/api/config` `{success,data}` ga o'ralmagan — to'g'ridan-to'g'ri JSON.
    final res = await _dio.get<dynamic>('/api/config');
    return SellobayConfig.fromJson(res.data as Map<String, dynamic>);
  }

  /// Buyurtma yaratish.
  ///
  /// [idempotencyKey] — tarmoq uzilib qayta urinilganda IKKINCHI buyurtma
  /// yaratilishining oldini oladi. Kalitni har so'rovda emas, foydalanuvchi
  /// savatni o'zgartirgandagina yangilang — aks holda ma'nosi yo'qoladi.
  Future<Map<String, dynamic>> createOrder(
    Map<String, dynamic> payload, {
    required String idempotencyKey,
  }) =>
      post<Map<String, dynamic>>(
        '/api/orders',
        body: payload,
        headers: {'Idempotency-Key': idempotencyKey},
      );

  /// Chiqish.
  ///
  /// Refresh tokenni SERVERDA bekor qiladi. Buni chaqirmasangiz token
  /// bazada 30 kun yaroqli qoladi va telefon boshqa qo'lga o'tsa undan
  /// yangi access olish mumkin — mahalliy nusxani o'chirish yetarli emas.
  ///
  /// Xato bo'lsa ham mahalliy tozalash BAJARILADI: tarmoq yo'qligi
  /// foydalanuvchini o'z telefonida ushlab qolish uchun sabab emas.
  Future<void> logout() async {
    final refresh = await _tokens.readRefresh();
    if (refresh != null && refresh.isNotEmpty) {
      try {
        await _dio.post<dynamic>(
          '/api/auth/logout',
          data: {'refresh': refresh},
          options: Options(
            extra: {'sb_retried': true},
            sendTimeout: const Duration(seconds: 4),
            receiveTimeout: const Duration(seconds: 4),
          ),
        );
      } on DioException {
        // jim o'tamiz
      }
    }
    await _tokens.clear();
  }
}
