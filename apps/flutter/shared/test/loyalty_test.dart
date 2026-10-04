import 'package:flutter_test/flutter_test.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:sellobay_shared/testing.dart';

void main() {
  group('LoyaltyRepository', () {
    test('balans o`qiladi', () async {
      final backend = FakeBackend(
        (options, body) => apiOk({
          'coins': 1250,
          'spentSom': 4300000,
          'history': <Map<String, dynamic>>[],
          'checkedInToday': true,
        }),
      );

      final summary = await LoyaltyRepository(buildClient(backend).api).fetchSummary();

      expect(backend.calls, ['/api/loyalty']);
      expect(summary.coins, 1250);
      expect(summary.spentSom, 4300000);
      expect(summary.checkedInToday, isTrue);
    });

    test('maydonlar yo`q bo`lsa — nol, taxmin EMAS', () async {
      final backend = FakeBackend((options, body) => apiOk(<String, dynamic>{}));
      final summary = await LoyaltyRepository(buildClient(backend).api).fetchSummary();

      expect(summary.coins, 0);
      expect(summary.spentSom, 0);
    });

    test('kirilmagan — 401', () async {
      final backend = FakeBackend(
        (options, body) => apiErr(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan'),
      );

      await expectLater(
        LoyaltyRepository(buildClient(backend).api).fetchSummary(),
        throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 401)),
      );
    });
  });
}
