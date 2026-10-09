import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

const _id = 'aaaaaaaa-1111-4111-8111-111111111111';

Map<String, dynamic> _address({
  String id = _id,
  String? label = 'Uy',
  String type = 'HOME',
  bool isDefault = false,
}) =>
    {
      'id': id,
      'label': label,
      'type': type,
      'recipientName': 'Dilnoza Karimova',
      'phone': '+998901234567',
      'region': 'Toshkent',
      'city': 'Yunusobod',
      'street': 'Amir Temur 1',
      'apartment': '25-uy',
      'isDefault': isDefault,
    };

AddressInput _input({
  String? label = 'Uy',
  String? apartment = '25-uy',
  bool isDefault = false,
  double? latitude,
  double? longitude,
}) =>
    AddressInput(
      label: label,
      type: AddressType.work,
      recipientName: '  Dilnoza  ',
      phone: '901234567',
      region: 'Toshkent',
      city: 'Yunusobod',
      street: 'Amir Temur 1',
      apartment: apartment,
      latitude: latitude,
      longitude: longitude,
      isDefault: isDefault,
    );

void main() {
  group('AddressType', () {
    test('serverdagi enum bilan bir xil', () {
      expect(
        AddressType.values.map((t) => t.value).toSet(),
        {'HOME', 'WORK', 'PICKUP', 'OTHER'},
      );
    });

    test('noma`lum qiymat — HOME', () {
      // Sxemaga yangi tur qo'shilsa, ilova bo'sh joy emas, eng
      // ehtimolli turni ko'rsatadi.
      expect(AddressType.fromValue('KOSMOS'), AddressType.home);
      expect(AddressType.fromValue(null), AddressType.home);
    });
  });

  group('AddressInput', () {
    test('bo`sh matn `null` ga aylanadi', () {
      // Sxemada `label` `.nullable()`, lekin bo'sh SATR emas — uni
      // yuborsak 400 VALIDATION qaytardi.
      final json = _input(label: '  ', apartment: '').toJson();

      expect(json['label'], isNull);
      expect(json['apartment'], isNull);
    });

    test('maydonlar trim qilinadi', () {
      expect(_input().toJson()['recipientName'], 'Dilnoza');
    });

    test('tur satr sifatida yuboriladi', () {
      expect(_input().toJson()['type'], 'WORK');
    });
  });

  group('AddressRepository', () {
    test('ro`yxat o`qiladi', () async {
      final backend = FakeBackend(
        (options, body) => apiOk({
          'items': [_address(isDefault: true), _address(id: 'b2', label: null, type: 'WORK')],
        }),
      );
      final items = await AddressRepository(buildClient(backend).api).fetchAll();

      expect(backend.calls, ['/api/addresses']);
      expect(items, hasLength(2));
      expect(items.first.isDefault, isTrue);
      expect(items.first.oneLine, 'Toshkent, Yunusobod, Amir Temur 1, 25-uy');
      expect(items.last.type, AddressType.work);
      expect(items.last.label, isNull);
    });

    test('yaratish — POST va yangi yozuv', () async {
      final backend = FakeBackend((options, body) => apiOk({'address': _address()}));
      final repo = AddressRepository(buildClient(backend).api);

      final created = await repo.create(_input());

      expect(backend.calls, ['/api/addresses']);
      expect(backend.bodies.single!['city'], 'Yunusobod');
      expect(created.id, _id);
    });

    test('tahrirlash — PATCH', () async {
      final backend = FakeBackend((options, body) => apiOk({'address': _address(label: 'Ish')}));
      final repo = AddressRepository(buildClient(backend).api);

      final updated = await repo.update(_id, _input(label: 'Ish'));

      expect(backend.calls, ['/api/addresses/$_id']);
      expect(updated.label, 'Ish');
    });

    test('asosiy qilish — FAQAT `isDefault` yuboriladi', () async {
      // Boshqa maydonlarni ham yuborsak, ro'yxatdagi eski nusxa bilan
      // birga foydalanuvchi ko'rmagan o'zgarishni ham yozib yuborardik.
      final backend = FakeBackend(
        (options, body) => apiOk({'address': _address(isDefault: true)}),
      );
      final repo = AddressRepository(buildClient(backend).api);

      final updated = await repo.setDefault(_id);

      expect(backend.bodies.single, {'isDefault': true});
      expect(updated.isDefault, isTrue);
    });

    test('o`chirish — DELETE', () async {
      final backend = FakeBackend((options, body) => apiOk({'deleted': true}));
      final repo = AddressRepository(buildClient(backend).api);

      await repo.delete(_id);

      expect(backend.calls, ['/api/addresses/$_id']);
    });

    test('begona manzil — 403', () async {
      final backend = FakeBackend(
        (options, body) => apiErr(403, 'FORBIDDEN', 'Bu manzil sizniki emas'),
      );
      final repo = AddressRepository(buildClient(backend).api);

      await expectLater(
        repo.delete(_id),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 403)),
      );
    });

    test('kirilmagan — 401', () async {
      final backend = FakeBackend(
        (options, body) => apiErr(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan'),
      );

      await expectLater(
        AddressRepository(buildClient(backend).api).fetchAll(),
        throwsA(isA<ApiException>().having((e) => e.code, 'code', 'UNAUTHENTICATED')),
      );
    });
  });

  test('checkout ham AYNI manbadan o`qiydi', () async {
    // Ikki nusxa bo'lsa, biri yangilanib ikkinchisi eskirib qolardi.
    final backend = FakeBackend((options, body) => rawJson(json.encode({
          'success': true,
          'data': {
            'items': [_address()],
          },
        })));
    final items = await CheckoutRepository(buildClient(backend).api).fetchAddresses();

    expect(backend.calls, ['/api/addresses']);
    expect(items.single.recipientName, 'Dilnoza Karimova');
  });

  group('koordinata', () {
    test('tanlanmagan bo`lsa YUBORILMAYDI', () {
      // `null` yuborsak, tahrirlashda mavjud koordinata o'chib
      // ketardi: server `latitude: null` ni «tozalash» deb tushunadi.
      final json = _input().toJson();
      expect(json.containsKey('latitude'), isFalse);
      expect(json.containsKey('longitude'), isFalse);
    });

    test('tanlangan bo`lsa yuboriladi', () {
      final json = _input(latitude: 41.3111, longitude: 69.2797).toJson();
      expect(json['latitude'], 41.3111);
      expect(json['longitude'], 69.2797);
    });

    test('serverdan O`QILADI', () {
      // Ilgari model bu maydonlarni butunlay tashlab yuborardi —
      // server ularni ancha oldin qaytarardi, lekin ilova ko'rmasdi.
      final a = SavedAddress.fromJson({
        'id': 'a1',
        'type': 'HOME',
        'recipientName': 'Dilnoza',
        'phone': '+998901234567',
        'region': 'Toshkent',
        'city': 'Yunusobod',
        'street': 'Amir Temur 1',
        'apartment': null,
        'latitude': 41.3111,
        'longitude': 69.2797,
        'isDefault': true,
      });
      expect(a.latitude, 41.3111);
      expect(a.longitude, 69.2797);
    });

    test('koordinatasiz manzil ham o`qiladi', () {
      final a = SavedAddress.fromJson({
        'id': 'a1',
        'type': 'HOME',
        'recipientName': 'Dilnoza',
        'phone': '+998901234567',
        'region': 'Toshkent',
        'city': 'Yunusobod',
        'street': 'Amir Temur 1',
        'apartment': null,
        'isDefault': false,
      });
      expect(a.latitude, isNull);
      expect(a.longitude, isNull);
    });
  });
}
