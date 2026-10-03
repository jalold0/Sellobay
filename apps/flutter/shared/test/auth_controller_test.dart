import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

void main() {
  group('sessiyani tiklash', () {
    test('saqlangan sessiya yo`q — darhol signedOut', () async {
      final backend = FakeBackend((options, body) => apiOk(const {}));
      final c = buildClient(backend);
      final auth = AuthController(repository: c.repo);

      await auth.restore();

      expect(auth.status, AuthStatus.signedOut);
      expect(backend.calls, isEmpty); // bekorga tarmoqqa chiqilmaydi
    });

    test('tarmoq yo`q — KESHDAGI sessiya saqlanadi', () async {
      // Internet yo'qligi tizimdan chiqarib yuborish uchun sabab emas.
      final backend = FakeBackend((options, body) => offline(options));
      final c = buildClient(backend);
      await c.store.save(access: 'a', refresh: 'r');
      await c.store.saveUser(AuthUser.fromJson(userJson(roles: ['CUSTOMER'])));
      final auth = AuthController(repository: c.repo);

      await auth.restore();

      expect(auth.status, AuthStatus.signedIn);
      expect(auth.user!.phone, '+998901234567');
      expect(c.store.isEmpty, isFalse);
    });

    test('server 401 — sessiya tugatiladi va saqlov tozalanadi', () async {
      final backend = FakeBackend((options, body) {
        if (options.path == '/api/auth/refresh') {
          return apiErr(401, 'INVALID_REFRESH', "Sessiya muddati o'tgan");
        }
        return apiErr(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
      });
      final c = buildClient(backend);
      await c.store.save(access: 'a', refresh: 'r');
      await c.store.saveUser(AuthUser.fromJson(userJson(roles: ['CUSTOMER'])));
      final auth = AuthController(repository: c.repo);

      await auth.restore();

      expect(auth.status, AuthStatus.signedOut);
      expect(c.store.isEmpty, isTrue);
    });

    test('kesh bor, keyin serverdagi yangi ma`lumot qo`llanadi', () async {
      final backend = FakeBackend(
        (options, body) => apiOk({
          'user': userJson(roles: ['CUSTOMER'], email: 'yangi@mail.uz'),
        }),
      );
      final c = buildClient(backend);
      await c.store.save(access: 'a', refresh: 'r');
      await c.store.saveUser(AuthUser.fromJson(userJson(roles: ['CUSTOMER'])));
      final auth = AuthController(repository: c.repo);

      await auth.restore();

      expect(auth.status, AuthStatus.signedIn);
      expect(auth.user!.email, 'yangi@mail.uz');
      expect((await c.store.readUser())!.email, 'yangi@mail.uz');
    });
  });

  group('kirish', () {
    test('kirish me() bilan tugaydi — ROLLAR shu yerdan keladi', () async {
      // `login` javobidagi user ROLSIZ. Rolga qarab qaror qabul qiladigan
      // har qanday ekran uchun bu farq hal qiluvchi.
      final backend = FakeBackend((options, body) {
        if (options.path == '/api/auth/login') {
          return apiOk({'user': userJson(), 'tokens': tokenPair('yangi')});
        }
        return apiOk({
          'user': userJson(roles: ['CUSTOMER', 'SELLER']),
        });
      });
      final c = buildClient(backend);
      final auth = AuthController(repository: c.repo);

      await auth.signInWithPassword(identifier: '901234567', password: 'parol123');

      expect(auth.status, AuthStatus.signedIn);
      expect(auth.user!.roles, ['CUSTOMER', 'SELLER']);
      expect(await c.store.readAccess(), 'access-yangi');
    });

    test('me() yiqilsa kirish ham yiqiladi — yarim holat qolmaydi', () async {
      final backend = FakeBackend((options, body) {
        if (options.path == '/api/auth/login') {
          return apiOk({'user': userJson(), 'tokens': tokenPair('yangi')});
        }
        return apiErr(500, 'SERVER', 'Ichki xato');
      });
      final c = buildClient(backend);
      final auth = AuthController(repository: c.repo);

      await expectLater(
        auth.signInWithPassword(identifier: '901234567', password: 'parol123'),
        throwsA(isA<ApiException>()),
      );

      expect(auth.status, AuthStatus.signedOut);
      expect(c.store.isEmpty, isTrue);
    });

    test('OTP bilan kirish', () async {
      final backend = FakeBackend((options, body) {
        if (options.path == '/api/auth/otp/verify') {
          return apiOk({'user': userJson(), 'tokens': tokenPair('otp')});
        }
        return apiOk({
          'user': userJson(roles: ['CUSTOMER']),
        });
      });
      final c = buildClient(backend);
      final auth = AuthController(repository: c.repo);

      await auth.signInWithOtp(phone: '90 123 45 67', code: '123456');

      expect(auth.status, AuthStatus.signedIn);
      // Tasdiqlashga normallashgan raqam ketdi.
      expect(backend.bodies.first!['phone'], '+998901234567');
    });

    test('sotuvchi arizasi — sessiya ochilmaydi', () async {
      final backend = FakeBackend(
        (options, body) => apiOk({'user': userJson(email: 's@mail.uz'), 'pendingApproval': true}),
      );
      final c = buildClient(backend);
      final auth = AuthController(repository: c.repo);

      final outcome = await auth.register(
        email: 's@mail.uz',
        password: 'parol123',
        asSeller: true,
      );

      expect(outcome.pendingApproval, isTrue);
      expect(auth.status, AuthStatus.unknown); // kirilmadi
      expect(c.store.isEmpty, isTrue);
    });
  });

  group('rol darvozasi (kuryer ilovasi)', () {
    test('kuryer bo`lmagan hisob kiritilmaydi va SERVERDA bekor qilinadi', () async {
      // Faqat mahalliy tozalash yetarli emas: bazada 30 kunlik yaroqli
      // refresh token qolib ketardi.
      final backend = FakeBackend((options, body) {
        switch (options.path) {
          case '/api/auth/login':
            return apiOk({'user': userJson(), 'tokens': tokenPair('mijoz')});
          case '/api/auth/me':
            return apiOk({
              'user': userJson(roles: ['CUSTOMER']),
            });
          case '/api/auth/logout':
            return apiOk({'loggedOut': true});
        }
        return apiErr(500, 'UNEXPECTED', options.path);
      });
      final c = buildClient(backend);
      final auth = AuthController(repository: c.repo, requiredRole: UserRoles.courier);

      await auth.signInWithPassword(identifier: '901234567', password: 'parol123');

      expect(auth.status, AuthStatus.signedOut);
      expect(auth.roleErrorKey, 'courier.roleRequired');
      expect(backend.countOf('/api/auth/logout'), 1);
      expect(backend.bodies.last!['refresh'], 'refresh-mijoz');
      expect(c.store.isEmpty, isTrue);
    });

    test('kuryer kiradi', () async {
      final backend = FakeBackend((options, body) {
        if (options.path == '/api/auth/login') {
          return apiOk({'user': userJson(), 'tokens': tokenPair('kuryer')});
        }
        return apiOk({
          'user': userJson(roles: ['CUSTOMER', 'COURIER']),
        });
      });
      final c = buildClient(backend);
      final auth = AuthController(repository: c.repo, requiredRole: UserRoles.courier);

      await auth.signInWithPassword(identifier: '901234567', password: 'parol123');

      expect(auth.status, AuthStatus.signedIn);
      expect(auth.roleErrorKey, isNull);
    });

    test('rol olib qo`yilsa, keyingi tiklashda chiqariladi', () async {
      final backend = FakeBackend((options, body) {
        if (options.path == '/api/auth/logout') return apiOk({'loggedOut': true});
        return apiOk({
          'user': userJson(roles: ['CUSTOMER']),
        });
      });
      final c = buildClient(backend);
      await c.store.save(access: 'a', refresh: 'r');
      await c.store.saveUser(AuthUser.fromJson(userJson(roles: ['CUSTOMER', 'COURIER'])));
      final auth = AuthController(repository: c.repo, requiredRole: UserRoles.courier);

      await auth.restore();

      expect(auth.status, AuthStatus.signedOut);
      expect(c.store.isEmpty, isTrue);
    });
  });

  test('chiqish holatni tozalaydi', () async {
    final backend = FakeBackend((options, body) {
      if (options.path == '/api/auth/logout') return apiOk({'loggedOut': true});
      return apiOk({
        'user': userJson(roles: ['CUSTOMER']),
      });
    });
    final c = buildClient(backend);
    await c.store.save(access: 'a', refresh: 'r');
    final auth = AuthController(repository: c.repo);
    await auth.restore();
    expect(auth.status, AuthStatus.signedIn);

    await auth.signOut();

    expect(auth.status, AuthStatus.signedOut);
    expect(auth.user, isNull);
    expect(c.store.isEmpty, isTrue);
  });
}
