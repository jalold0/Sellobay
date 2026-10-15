import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

/// Kuryerning joriy joylashuvi — topshirish jurnaliga (ADR 0017).
///
/// «Iloji bo'lsa» tamoyili: ruxsat berilmagan, GPS o'chiq yoki 6 soniyada
/// aniqlanmagan bo'lsa `null` — holat baribir yuboriladi. Joylashuv uchun
/// kuryerni kutdirish yoki topshiriqni to'xtatish noto'g'ri bo'lardi.
class CourierLocation {
  CourierLocation._();

  /// Testda almashtiriladi — widget testida platforma kanali yo'q.
  @visibleForTesting
  static Future<({double latitude, double longitude})?> Function() source = _fromDevice;

  static Future<({double latitude, double longitude})?> current() async {
    try {
      return await source();
    } catch (_) {
      return null;
    }
  }

  static Future<({double latitude, double longitude})?> _fromDevice() async {
    if (!await Geolocator.isLocationServiceEnabled()) return null;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
      return null;
    }
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 6),
      ),
    );
    return (latitude: position.latitude, longitude: position.longitude);
  }
}
