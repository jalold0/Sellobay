import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

const _token = 'fcm-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaa';

class _FakeSource implements PushTokenSource {
  _FakeSource({this.granted = true});

  bool granted;
  final String token = _token;
  final refresh = StreamController<String>.broadcast();
  int permissionAsks = 0;

  @override
  String get platform => 'android';

  @override
  Future<bool> requestPermission() async {
    permissionAsks++;
    return granted;
  }

  @override
  Future<String?> getToken() async => token;

  @override
  Stream<String> get onTokenRefresh => refresh.stream;
}

FakeBackend _backend({bool failPush = false}) => FakeBackend((options, body) {
      if (options.path == '/api/auth/me') {
        return apiOk({
          'user': userJson(roles: ['CUSTOMER']),
        });
      }
      if (options.path == '/api/auth/login') {
        return apiOk({'user': userJson(), 'tokens': tokenPair('1')});
      }
      if (options.path == '/api/auth/logout') return apiOk({'ok': true});
      if (options.path == '/api/push/token') {
        return failPush ? apiErr(500, 'SERVER', 'Ichki xato') : apiOk({'ok': true});
      }
      return apiErr(500, 'UNEXPECTED', options.path);
    });

Future<void> _settle() async {
  for (var i = 0; i < 5; i++) {
    await Future<void>.delayed(Duration.zero);
  }
}

({AuthController auth, PushRegistrar registrar}) _build(FakeBackend backend, _FakeSource source) {
  final client = buildClient(backend);
  final auth = AuthController(repository: client.repo);
  final registrar = PushRegistrar(
    auth: auth,
    repository: PushRepository(client.api),
    source: source,
    appName: 'customer',
  )..start();
  addTearDown(registrar.dispose);
  return (auth: auth, registrar: registrar);
}

Future<void> _signIn(AuthController auth) =>
    auth.signInWithPassword(identifier: '+998901234567', password: 'parol1234');

void main() {
  group('PushRepository', () {
    test('ro`yxatdan o`tkazish — token, platforma va ilova nomi', () async {
      final backend = _backend();
      await PushRepository(buildClient(backend).api)
          .register(token: _token, platform: 'android', appName: 'courier');

      expect(backend.calls, ['/api/push/token']);
      expect(backend.bodies.single, {'token': _token, 'platform': 'android', 'appName': 'courier'});
    });
  });

  group('PushRegistrar', () {
    test('kirganda token yuboriladi', () async {
      final backend = _backend();
      final w = _build(backend, _FakeSource());

      await _signIn(w.auth);
      await _settle();

      expect(backend.countOf('/api/push/token'), 1);
      expect(backend.bodies.last, {'token': _token, 'platform': 'android', 'appName': 'customer'});
    });

    test('kirmaguncha ruxsat ham, token ham so`ralmaydi', () async {
      final backend = _backend();
      final source = _FakeSource();
      _build(backend, source);
      await _settle();

      expect(source.permissionAsks, 0);
      expect(backend.countOf('/api/push/token'), 0);
    });

    test('ruxsat rad etilsa — tarmoqqa hech narsa ketmaydi, kirish ishlaydi', () async {
      final backend = _backend();
      final w = _build(backend, _FakeSource(granted: false));

      await _signIn(w.auth);
      await _settle();

      expect(w.auth.status, AuthStatus.signedIn);
      expect(backend.countOf('/api/push/token'), 0);
    });

    test('token yangilansa qayta yuboriladi', () async {
      final backend = _backend();
      final source = _FakeSource();
      final w = _build(backend, source);
      await _signIn(w.auth);
      await _settle();

      source.refresh.add('fcm-token-yangi-bbbbbbbbbbbbbbbbbbbb');
      await _settle();

      expect(backend.countOf('/api/push/token'), 2);
      expect(backend.bodies.last!['token'], 'fcm-token-yangi-bbbbbbbbbbbbbbbbbbbb');
    });

    test('chiqishdan OLDIN token serverdan o`chiriladi', () async {
      final backend = _backend();
      final w = _build(backend, _FakeSource());
      await _signIn(w.auth);
      await _settle();

      await w.auth.signOut();

      // O'chirish logout'dan oldin — keyin so'rov 401 olardi.
      final delete = backend.calls.lastIndexOf('/api/push/token');
      expect(delete, lessThan(backend.calls.indexOf('/api/auth/logout')));
      expect(backend.bodies[delete], {'token': _token});
    });

    test('server push so`rovida yiqilsa ham kirish va chiqish ishlaydi', () async {
      final backend = _backend(failPush: true);
      final w = _build(backend, _FakeSource());

      await _signIn(w.auth);
      await _settle();
      expect(w.auth.status, AuthStatus.signedIn);

      await w.auth.signOut();
      expect(w.auth.status, AuthStatus.signedOut);
    });
  });
}
