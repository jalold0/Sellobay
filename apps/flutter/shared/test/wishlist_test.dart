import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

const _p1 = '11111111-1111-4111-8111-111111111111';
const _p2 = '22222222-2222-4222-8222-222222222222';

({WishlistStore store, AuthController auth}) build(
  FakeBackend backend, {
  List<String> ids = const [],
}) {
  final client = buildClient(backend);
  final auth = AuthController(repository: client.repo);
  return (
    store: WishlistStore(repository: WishlistRepository(client.api), auth: auth),
    auth: auth,
  );
}

FakeBackend backendWith({
  List<String> ids = const [],
  ResponseBody Function(String method)? onWrite,
}) =>
    FakeBackend((options, body) {
      if (options.method == 'GET') return apiOk({'productIds': ids});
      return onWrite?.call(options.method) ?? apiOk({'ok': true});
    });

void main() {
  group('WishlistRepository', () {
    test('ro`yxat — faqat ID`lar', () async {
      final backend = backendWith(ids: [_p1, _p2]);
      final ids = await WishlistRepository(buildClient(backend).api).fetchIds();

      expect(backend.calls, ['/api/wishlist']);
      expect(ids, [_p1, _p2]);
    });

    test('qo`shish — POST body`da `productId`', () async {
      final backend = backendWith();
      await WishlistRepository(buildClient(backend).api).add(_p1);

      expect(backend.bodies.single, {'productId': _p1});
    });

    test('o`chirish — `productId` SO`ROV PARAMETRIDA', () async {
      // Route uni `searchParams` dan o'qiydi; body'da yuborsak
      // «productId kerak» xatosi qaytardi.
      final backend = backendWith();
      await WishlistRepository(buildClient(backend).api).remove(_p1);

      expect(backend.calls.single, '/api/wishlist');
      expect(backend.queries.single, {'productId': _p1});
      expect(backend.bodies.single, isNull);
    });
  });

  group('WishlistStore', () {
    test('kirilmagan bo`lsa so`rov YUBORILMAYDI', () async {
      final backend = backendWith(ids: [_p1]);
      final w = build(backend);

      await Future<void>.delayed(Duration.zero);

      expect(backend.calls, isEmpty);
      expect(w.store.count, 0);
    });

    test('yuklangach belgilar to`g`ri', () async {
      final backend = backendWith(ids: [_p1]);
      final w = build(backend);

      await w.store.load();

      expect(w.store.contains(_p1), isTrue);
      expect(w.store.contains(_p2), isFalse);
      expect(w.store.isLoaded, isTrue);
    });

    test('qo`shish — belgi DARHOL o`zgaradi', () async {
      final backend = backendWith();
      final w = build(backend);
      var notified = 0;
      w.store.addListener(() => notified++);

      final future = w.store.toggle(_p1);

      // So'rov hali tugamagan, belgi esa allaqachon yonib turibdi.
      expect(w.store.contains(_p1), isTrue);
      expect(notified, greaterThan(0));
      await future;
      expect(backend.calls.single, '/api/wishlist');
    });

    test('xato bo`lsa belgi ORQAGA qaytadi', () async {
      // Aks holda foydalanuvchi saqlanmagan narsani saqlangan deb
      // o'ylardi.
      final backend = backendWith(onWrite: (_) => apiErr(500, 'SERVER', 'Ichki xato'));
      final w = build(backend);

      await expectLater(w.store.toggle(_p1), throwsA(isA<ApiException>()));
      expect(w.store.contains(_p1), isFalse);
    });

    test('o`chirishdagi xato ham qaytariladi', () async {
      var fail = false;
      final backend = FakeBackend((options, body) {
        if (options.method == 'GET') return apiOk({'productIds': [_p1]});
        if (fail) return apiErr(500, 'SERVER', 'Ichki xato');
        return apiOk({'ok': true});
      });
      final w = build(backend);
      await w.store.load();
      expect(w.store.contains(_p1), isTrue);

      fail = true;
      await expectLater(w.store.toggle(_p1), throwsA(isA<ApiException>()));
      // Qaytarildi — mahsulot ro'yxatda qoladi.
      expect(w.store.contains(_p1), isTrue);
    });

    test('tizimdan chiqilganda ro`yxat TOZALANADI', () async {
      // Keyingi foydalanuvchi birovning sevimlilarini ko'rib qolmasin.
      final backend = FakeBackend((options, body) {
        if (options.path == '/api/auth/me') {
          return apiOk({
            'user': userJson(roles: ['CUSTOMER']),
          });
        }
        if (options.path == '/api/auth/login') {
          return apiOk({'user': userJson(), 'tokens': tokenPair('1')});
        }
        if (options.path == '/api/auth/logout') return apiOk({'ok': true});
        return apiOk({'productIds': [_p1]});
      });
      final w = build(backend);

      await w.auth.signInWithPassword(identifier: '+998901234567', password: 'parol1234');
      // Kirish `WishlistStore` ni o'zi yuklashga undaydi.
      await Future<void>.delayed(Duration.zero);
      await w.store.load();
      expect(w.store.count, 1);

      await w.auth.signOut();

      expect(w.store.count, 0);
      expect(w.store.isLoaded, isFalse);
    });
  });
}
