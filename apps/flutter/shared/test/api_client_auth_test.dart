import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

void main() {
  group('401 ni qayta ishlash', () {
    test('/api/auth/login dagi 401 da YANGILASH urinilmaydi', () async {
      // Bu eng muhim tekshiruv. "Parol noto'g'ri" ham 401 qaytaradi. Agar
      // interceptor har 401 da yangilashga urinsa, noto'g'ri parol kiritgan
      // foydalanuvchining AMALDAGI sessiyasi rotatsiya qilinib, eski token
      // bekor bo'lardi — ya'ni xato parol odamni tizimdan chiqarib yuborardi.
      late FakeBackend backend;
      backend = FakeBackend((options, body) {
        if (options.path == '/api/auth/login') {
          return apiErr(401, 'INVALID_CREDENTIALS', "Email/telefon yoki parol noto'g'ri");
        }
        return apiErr(500, 'UNEXPECTED', 'kutilmagan yo`l: ${options.path}');
      });
      final c = buildClient(backend);
      await c.store.save(access: 'eski-access', refresh: 'amaldagi-refresh');

      await expectLater(
        c.repo.loginWithPassword(identifier: 'user@mail.uz', password: 'xato1234'),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'INVALID_CREDENTIALS')),
      );

      expect(backend.calls, ['/api/auth/login']);
      expect(backend.countOf('/api/auth/refresh'), 0);
      // Sessiya tegilmagan.
      expect(await c.store.readRefresh(), 'amaldagi-refresh');
    });

    test('himoyalangan yo`ldagi 401 — yangilanadi va so`rov qaytariladi', () async {
      var meCalls = 0;
      final backend = FakeBackend((options, body) {
        switch (options.path) {
          case '/api/auth/me':
            meCalls++;
            if (meCalls == 1) return apiErr(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
            return apiOk({'user': userJson(roles: ['CUSTOMER'])});
          case '/api/auth/refresh':
            return apiOk({'tokens': tokenPair('yangi')});
        }
        return apiErr(500, 'UNEXPECTED', options.path);
      });
      final c = buildClient(backend);
      await c.store.save(access: 'eskirgan', refresh: 'refresh-eski');

      final user = await c.repo.me();

      expect(user.hasRole(UserRoles.customer), isTrue);
      expect(backend.calls, ['/api/auth/me', '/api/auth/refresh', '/api/auth/me']);
      expect(await c.store.readAccess(), 'access-yangi');
      expect(await c.store.readRefresh(), 'refresh-yangi');
    });

    test('bir vaqtda ikkita 401 — yangilash FAQAT BIR MARTA', () async {
      // Single-flight bo'lmasa ikkinchi yangilash birinchisi chiqargan
      // tokenni bekor qilib, sessiyani butunlay buzardi.
      var meCalls = 0;
      final backend = FakeBackend((options, body) async {
        switch (options.path) {
          case '/api/auth/me':
            meCalls++;
            if (meCalls <= 2) return apiErr(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
            return apiOk({'user': userJson(roles: ['CUSTOMER'])});
          case '/api/auth/refresh':
            // Sekin javob — ikkinchi so'rov shu paytda kelib qoladi.
            await Future<void>.delayed(const Duration(milliseconds: 20));
            return apiOk({'tokens': tokenPair('yangi')});
        }
        return apiErr(500, 'UNEXPECTED', options.path);
      });
      final c = buildClient(backend);
      await c.store.save(access: 'eskirgan', refresh: 'refresh-eski');

      await Future.wait([c.repo.me(), c.repo.me()]);

      expect(backend.countOf('/api/auth/refresh'), 1);
      expect(backend.countOf('/api/auth/me'), 4); // 2 ta 401 + 2 ta qayta urinish
    });

    test('yaroqsiz refresh — saqlov tozalanadi', () async {
      final backend = FakeBackend((options, body) {
        switch (options.path) {
          case '/api/auth/me':
            return apiErr(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
          case '/api/auth/refresh':
            return apiErr(401, 'INVALID_REFRESH', "Sessiya muddati o'tgan");
        }
        return apiErr(500, 'UNEXPECTED', options.path);
      });
      final c = buildClient(backend);
      await c.store.save(access: 'eskirgan', refresh: 'bekor-qilingan');

      await expectLater(c.repo.me(), throwsA(isA<ApiException>()));
      expect(c.store.isEmpty, isTrue);
    });
  });

  group('xatolarni tarjima qilish', () {
    test('tarmoq uzilishi ApiException emas, NetworkException', () async {
      // Farqi muhim: tarmoq yo'qligida sessiyani tugatish MUMKIN EMAS.
      final backend = FakeBackend((options, body) => offline(options));
      final c = buildClient(backend);

      await expectLater(c.repo.me(), throwsA(isA<NetworkException>()));
    });

    test('429 javobidagi Retry-After o`qiladi', () async {
      final backend = FakeBackend(
        (options, body) => apiErr(429, 'RATE_LIMIT', 'Juda ko`p urinish', retryAfterSec: 42),
      );
      final c = buildClient(backend);

      await expectLater(
        c.repo.sendOtp('901234567'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.isRateLimited, 'isRateLimited', isTrue)
              .having((e) => e.retryAfterSec, 'retryAfterSec', 42),
        ),
      );
    });

    test('Retry-After bo`lmasa null — soxta raqam o`ylab topilmaydi', () async {
      // OTP route'idagi "telefon bo'yicha 60 soniya" tekshiruvi sarlavha
      // qo'ymaydi. Standart qiymatni ekran tanlaydi, klient emas.
      final backend = FakeBackend(
        (options, body) => apiErr(429, 'RATE_LIMIT', 'Iltimos, 60 sekunddan keyin urinib ko`ring'),
      );
      final c = buildClient(backend);

      await expectLater(
        c.repo.sendOtp('901234567'),
        throwsA(isA<ApiException>().having((e) => e.retryAfterSec, 'retryAfterSec', isNull)),
      );
    });
  });

  group('so`rov body`si', () {
    test('register null maydonlarni YUBORMAYDI', () async {
      // zod sxemasida maydonlar `.optional()` — yo'q bo'lishi mumkin,
      // lekin `null` bo'lishi mumkin emas. `{"email": null}` → 400.
      final backend = FakeBackend((options, body) {
        if (options.path == '/api/auth/register') {
          return apiOk({'user': userJson(), 'pendingApproval': false, 'tokens': tokenPair('a')});
        }
        return apiOk({'user': userJson(roles: ['CUSTOMER'])});
      });
      final c = buildClient(backend);

      await c.repo.register(password: 'parol123', phone: '90 123 45 67');

      final sent = backend.bodies.first!;
      expect(sent.containsKey('email'), isFalse);
      expect(sent.containsKey('firstName'), isFalse);
      expect(sent.containsKey('lastName'), isFalse);
      // Telefon E.164 ga keltirilgan (CLAUDE.md qoidasi).
      expect(sent['phone'], '+998901234567');
      expect(sent['role'], 'customer');
      expect(sent['locale'], 'uz');
    });

    test('bo`sh satr ham null kabi tashlab ketiladi', () async {
      final backend = FakeBackend((options, body) {
        if (options.path == '/api/auth/register') {
          return apiOk({'user': userJson(), 'tokens': tokenPair('a')});
        }
        return apiOk({'user': userJson(roles: ['CUSTOMER'])});
      });
      final c = buildClient(backend);

      await c.repo.register(password: 'parol123', email: 'a@b.uz', firstName: '   ');

      expect(backend.bodies.first!.containsKey('firstName'), isFalse);
      expect(backend.bodies.first!['email'], 'a@b.uz');
    });

    test('yaroqsiz telefon serverga umuman yuborilmaydi', () async {
      final backend = FakeBackend((options, body) => apiOk(const {}));
      final c = buildClient(backend);

      await expectLater(
        c.repo.sendOtp('12345'),
        throwsA(isA<ApiException>().having((e) => e.message, 'i18n kaliti', 'auth.phoneInvalid')),
      );
      expect(backend.calls, isEmpty);
    });
  });

  group('ro`yxatdan o`tish natijasi', () {
    test('sotuvchi arizasi — sessiya YO`Q', () async {
      // Server `tokens` ni umuman yubormaydi. Javobni ko'r-ko'rona
      // o'qigan kod shu yerda yiqilishi kerak, ekranda emas.
      final backend = FakeBackend(
        (options, body) => apiOk({'user': userJson(email: 's@mail.uz'), 'pendingApproval': true}),
      );
      final c = buildClient(backend);

      final outcome = await c.repo.register(
        password: 'parol123',
        email: 's@mail.uz',
        asSeller: true,
      );

      expect(outcome.pendingApproval, isTrue);
      expect(outcome.session, isNull);
      expect(backend.bodies.first!['role'], 'seller');
    });

    test('mijoz — sessiya bor', () async {
      final backend = FakeBackend(
        (options, body) => apiOk({
          'user': userJson(),
          'pendingApproval': false,
          'tokens': tokenPair('mijoz'),
        }),
      );
      final c = buildClient(backend);

      final outcome = await c.repo.register(password: 'parol123', phone: '901234567');

      expect(outcome.pendingApproval, isFalse);
      expect(outcome.session!.access, 'access-mijoz');
    });
  });

  group('chiqish', () {
    test('tokenni SERVERDA bekor qiladi, keyin mahalliy tozalaydi', () async {
      final backend = FakeBackend((options, body) => apiOk({'loggedOut': true}));
      final c = buildClient(backend);
      await c.store.save(access: 'a', refresh: 'bekor-qilinadigan');

      await c.repo.logout();

      expect(backend.calls, ['/api/auth/logout']);
      expect(backend.bodies.first!['refresh'], 'bekor-qilinadigan');
      expect(c.store.isEmpty, isTrue);
    });

    test('tarmoq yo`q bo`lsa ham mahalliy tozalash BAJARILADI', () async {
      // Aks holda internetsiz foydalanuvchi o'z telefonidan chiqa olmasdi.
      final backend = FakeBackend((options, body) => offline(options));
      final c = buildClient(backend);
      await c.store.save(access: 'a', refresh: 'r');

      await c.repo.logout();

      expect(c.store.isEmpty, isTrue);
    });
  });
}
