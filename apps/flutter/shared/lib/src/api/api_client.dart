import 'package:dio/dio.dart';

import '../auth/session_store.dart';
import '../config/app_config.dart';
import 'api_exception.dart';
import 'sellobay_config.dart';

/// Sellobay API klienti.
///
/// Backend — `apps/web` dagi Next.js route'lari. Shartnoma va tuzoqlar:
/// docs/FLUTTER-MIGRATION.md
class ApiClient {
  ApiClient({AppConfig config = AppConfig.fromEnvironment, SessionStore? session, Dio? dio})
      : session = session ?? SessionStore(),
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
          final access = await this.session.readAccess();
          if (access != null && access.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $access';
          }
          handler.next(options);
        },
        onResponse: (response, handler) async {
          // Access JWT atigi 15 daqiqa yashaydi, refresh esa 30 kun.
          // 401 kelsa bir marta yangilab, so'rovni QAYTA yuboramiz.
          final alreadyRetried = response.requestOptions.extra['sb_retried'] == true;
          final isAuthRoute = noRefreshPaths.contains(response.requestOptions.path);
          if (response.statusCode != 401 || alreadyRetried || isAuthRoute) {
            return handler.next(response);
          }
          final refreshed = await _refreshOnce();
          if (!refreshed) return handler.next(response);

          final opts = response.requestOptions;
          opts.extra['sb_retried'] = true;
          final access = await this.session.readAccess();
          if (access != null) opts.headers['Authorization'] = 'Bearer $access';
          handler.resolve(await _dio.fetch<dynamic>(opts));
        },
      ),
    );
  }

  final Dio _dio;

  /// Tokenlar va keshlangan foydalanuvchi. `AuthRepository` shu orqali yozadi.
  final SessionStore session;

  /// Backend manzili. Rasm manzillarini to'liq qilish uchun kerak
  /// (`resolveProductImageUrl`) — server nisbiy yo'l qaytaradi.
  String get baseUrl => _dio.options.baseUrl;

  /// Bu yo'llardagi 401 "token eskirgan" DEGANI EMAS — u "parol noto'g'ri",
  /// "kod noto'g'ri" yoki "refresh yaroqsiz" degani. Yangilab qayta urinish
  /// foydasiz bo'lishi ustiga, bekorga refresh rotatsiyasini sarflaydi:
  /// eski token bekor qilinib, amaldagi sessiya buzilardi.
  static const noRefreshPaths = <String>{
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/otp/send',
    '/api/auth/otp/verify',
  };

  /// Bir vaqtda ketayotgan yangilash. SINGLE-FLIGHT shart: bir nechta
  /// so'rov birvarakayiga 401 olsa, har biri alohida yangilashga urinsa
  /// refresh token rotatsiyasi poyga holatiga tushadi va sessiya uziladi.
  Future<bool>? _refreshing;

  Future<bool> _refreshOnce() {
    return _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);
  }

  Future<bool> _doRefresh() async {
    final refresh = await session.readRefresh();
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
        await session.clear();
        return false;
      }
      final body = res.data;
      if (body is! Map || body['success'] != true) return false;
      final tokens = (body['data'] as Map?)?['tokens'] as Map?;
      if (tokens == null) return false;

      await session.save(
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
    final message = err?['message'] as String?;

    // Javob bizning shaklimizda KELMAGAN bo'lsa (404 HTML sahifasi,
    // shlyuz xatosi, proxy javobi) — HTTP kodini matnga chiqaramiz.
    //
    // Ilgari bu yerda shunchaki «Noma'lum xato» turardi va u hech
    // narsa aytmasdi: route deploy qilinmagani ham, server yiqilgani
    // ham, internet orqadagi proxy'da uzilgani ham bir xil ko'rinardi.
    // Kodni ko'rsatish 404 ni 500 dan darhol ajratadi.
    if (message == null) {
      throw ApiException(
        code: 'UNEXPECTED_RESPONSE',
        message: 'common.unexpectedResponse',
        statusCode: res.statusCode,
        retryAfterSec: int.tryParse(res.headers.value('retry-after') ?? ''),
      );
    }

    throw ApiException(
      code: err?['code'] as String? ?? 'UNKNOWN',
      message: message,
      statusCode: res.statusCode,
      retryAfterSec: int.tryParse(res.headers.value('retry-after') ?? ''),
    );
  }

  /// Tarmoq uzilishini [NetworkException] ga aylantiradi.
  ///
  /// Dio turlari shu qatlamdan tashqariga CHIQMAYDI: ekranlar `dio` ni
  /// import qilishi shart emas, demak klientni almashtirish ularga tegmaydi.
  Future<Response<dynamic>> _send(Future<Response<dynamic>> Function() run) async {
    try {
      return await run();
    } on DioException catch (e) {
      throw NetworkException(e.message);
    }
  }

  Future<T> get<T>(String path, {Map<String, dynamic>? query}) async =>
      _unwrap<T>(await _send(() => _dio.get<dynamic>(path, queryParameters: query)));

  Future<T> post<T>(String path, {Object? body, Map<String, String>? headers}) async => _unwrap<T>(
        await _send(
          () => _dio.post<dynamic>(path, data: body, options: Options(headers: headers)),
        ),
      );

  Future<T> put<T>(String path, {Object? body}) async =>
      _unwrap<T>(await _send(() => _dio.put<dynamic>(path, data: body)));

  Future<T> patch<T>(String path, {Object? body}) async =>
      _unwrap<T>(await _send(() => _dio.patch<dynamic>(path, data: body)));

  Future<T> delete<T>(String path, {Object? body, Map<String, dynamic>? query}) async => _unwrap<T>(
        await _send(() => _dio.delete<dynamic>(path, data: body, queryParameters: query)),
      );

  /// Biznes qoidalari. Ilova ishga tushganda bir marta olinadi.
  Future<SellobayConfig> fetchConfig() async =>
      SellobayConfig.fromJson(await get<Map<String, dynamic>>('/api/config'));

  /// Rasmni yuklaydi va uning ichki YO'LINI qaytaradi.
  ///
  /// Rasmning o'zi javobda qaytmaydi: ikkala yuklash ham YOPIQ saqlanadi
  /// va ochiq havola berilmaydi. Yo'l keyingi so'rovga (buyurtma yoki
  /// yetkazish holati) biriktiriladi.
  ///
  /// `multipart/form-data` — route'lar `req.formData()` dan `file` ni
  /// o'qiydi, JSON'dan emas.
  Future<String> _uploadImage(
    String path, {
    required List<int> bytes,
    required String filename,
  }) async {
    final form = FormData.fromMap({
      'file': MultipartFile.fromBytes(bytes, filename: filename),
    });
    final data = _unwrap<Map<String, dynamic>>(
      await _send(() => _dio.post<dynamic>(path, data: form)),
    );
    return data['pathname'] as String;
  }

  /// To'lov cheki (mijoz ilovasi, checkout).
  Future<String> uploadReceipt({
    required List<int> bytes,
    required String filename,
  }) =>
      _uploadImage('/api/uploads/receipt', bytes: bytes, filename: filename);

  /// Yetkazib berish isboti surati (kuryer ilovasi).
  ///
  /// Chekdan farqli: bu endpoint mehmonga ochiq EMAS, `COURIER` roli
  /// talab qilinadi.
  Future<String> uploadDeliveryProof({
    required List<int> bytes,
    required String filename,
  }) =>
      _uploadImage('/api/uploads/delivery-proof', bytes: bytes, filename: filename);

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
    final refresh = await session.readRefresh();
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
    await session.clear();
  }
}
