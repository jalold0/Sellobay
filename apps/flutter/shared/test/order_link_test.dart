import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

const _id = 'aaaaaaaa-1111-4111-8111-111111111111';

void main() {
  group('parseOrderLink', () {
    test('sellobay://orders/<uuid>', () {
      expect(parseOrderLink(Uri.parse('sellobay://orders/$_id')), _id);
    });

    test('to`lovdan qaytish manzili — https://sellobay.uz/orders/success?order=', () {
      expect(parseOrderLink(Uri.parse('https://sellobay.uz/orders/success?order=$_id')), _id);
      expect(parseOrderLink(Uri.parse('https://www.sellobay.uz/orders/success?order=$_id')), _id);
    });

    test('til prefiksi bilan ham', () {
      expect(parseOrderLink(Uri.parse('https://sellobay.uz/uz/orders/success?order=$_id')), _id);
    });

    test('katta harf kichikka keltiriladi', () {
      expect(parseOrderLink(Uri.parse('sellobay://orders/${_id.toUpperCase()}')), _id);
    });

    test('UUID bo`lmagan identifikator rad etiladi', () {
      for (final bad in ['123', 'abc', '../../etc', 'aaaaaaaa-1111-4111-8111-11111111111', '$_id/x']) {
        expect(parseOrderLink(Uri.parse('sellobay://orders/$bad')), isNull, reason: bad);
      }
    });

    test('begona host yoki sxema rad etiladi', () {
      expect(parseOrderLink(Uri.parse('https://evil.example/orders/success?order=$_id')), isNull);
      expect(parseOrderLink(Uri.parse('http://sellobay.uz/orders/success?order=$_id')), isNull);
      expect(parseOrderLink(Uri.parse('other://orders/$_id')), isNull);
      expect(parseOrderLink(Uri.parse('sellobay://products/$_id')), isNull);
    });

    test('parametrsiz yoki noto`g`ri yo`l', () {
      expect(parseOrderLink(Uri.parse('https://sellobay.uz/orders/success')), isNull);
      expect(parseOrderLink(Uri.parse('https://sellobay.uz/orders?order=$_id')), isNull);
      expect(parseOrderLink(Uri.parse('sellobay://orders')), isNull);
    });
  });

  group('orderIdFromPushData', () {
    test('server yuboradigan shakl', () {
      expect(orderIdFromPushData({'type': 'order', 'orderId': _id, 'status': 'DELIVERED'}), _id);
    });

    test('boshqa tur, yo`q yoki yaroqsiz identifikator — null', () {
      expect(orderIdFromPushData({'type': 'promo', 'orderId': _id}), isNull);
      expect(orderIdFromPushData({'type': 'order'}), isNull);
      expect(orderIdFromPushData({'type': 'order', 'orderId': 42}), isNull);
      expect(orderIdFromPushData({'type': 'order', 'orderId': 'nope'}), isNull);
    });
  });
}
