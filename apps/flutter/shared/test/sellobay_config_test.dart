import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

/// Bu testlar `GET /api/config` ning HAQIQIY javobi ustida ishlaydi
/// (prod build'dan olingan). Server shaklni o'zgartirsa — shu yerda
/// yiqiladi, ilovada emas.
const _realResponse = '''
{
  "shipping": { "currency": "UZS", "standardFee": 20000, "expressFee": 50000, "freeThreshold": 500000 },
  "loyalty": {
    "coinPerSom": 0.001,
    "coinValueSom": 10,
    "tiers": [
      { "key": "bronze",   "min": 0,        "cashbackPct": 1, "icon": "\u{1F949}" },
      { "key": "silver",   "min": 1000000,  "cashbackPct": 2, "icon": "\u{1F948}" },
      { "key": "gold",     "min": 5000000,  "cashbackPct": 3, "icon": "\u{1F947}" },
      { "key": "platinum", "min": 20000000, "cashbackPct": 5, "icon": "\u{1F48E}" }
    ]
  },
  "returns": { "windowDays": 14 },
  "geo": { "tashkentCityBbox": { "latMin": 41.15, "latMax": 41.4, "lngMin": 69.1, "lngMax": 69.45 } },
  "locales": ["uz", "ru", "en"]
}
''';

void main() {
  late SellobayConfig config;

  setUp(() {
    config = SellobayConfig.fromJson(json.decode(_realResponse) as Map<String, dynamic>);
  });

  group('SellobayConfig', () {
    test('serverning haqiqiy javobini o`qiydi', () {
      expect(config.shipping.standardFee, 20000);
      expect(config.shipping.freeThreshold, 500000);
      expect(config.loyalty.coinValueSom, 10);
      expect(config.loyalty.tiers, hasLength(4));
      expect(config.returnWindowDays, 14);
      expect(config.locales, ['uz', 'ru', 'en']);
    });

    test('yetkazish bepul chegaradan yuqorida', () {
      expect(config.shippingFeeFor(499999), 20000);
      // Chegaraning O'ZIDA ham bepul bo'lishi kerak (>=, > emas).
      expect(config.shippingFeeFor(500000), 0);
      expect(config.shippingFeeFor(600000), 0);
    });

    test('ekspress bepul chegaradan qat`i nazar to`liq narx', () {
      expect(config.shippingFeeFor(600000, express: true), 50000);
    });
  });

  group('GeoBbox', () {
    test('Toshkent markazi ichkarida', () {
      expect(config.tashkentCityBbox.contains(41.31, 69.28), isTrue);
    });

    test('Samarqand tashqarida', () {
      expect(config.tashkentCityBbox.contains(39.65, 66.96), isFalse);
    });

    test('chegaraning o`zi ichkari hisoblanadi', () {
      final b = config.tashkentCityBbox;
      expect(b.contains(b.latMin, b.lngMin), isTrue);
      expect(b.contains(b.latMax, b.lngMax), isTrue);
    });
  });
}
