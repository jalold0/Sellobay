import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geocoding/geocoding.dart' as geo;
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import 'sellobay_map.dart';

/// Xaritadan tanlangan manzil.
class PickedLocation {
  const PickedLocation({
    required this.latitude,
    required this.longitude,
    this.region,
    this.city,
    this.street,
    this.building,
  });

  final double latitude;
  final double longitude;

  /// Teskari geokodlashdan kelgan qismlar — TAXMIN, mijoz ularni
  /// formada tahrirlashi mumkin.
  final String? region;
  final String? city;
  final String? street;
  final String? building;
}

/// Manzilni xaritadan tanlash.
///
/// NEGA KERAK: ilgari mijoz manzilni faqat matn sifatida kiritardi va
/// koordinata bo'sh qolardi. Natijada kuryer «Yunusobod, Amir Temur
/// ko'chasi» ni o'zi topishi kerak edi, yetkazish hududini tekshirish
/// (`isInTashkentCity`) esa umuman ishlamasdi. Bazada 54 ta manzildan
/// atigi 5 tasida koordinata bor — qolgani shu ekran yo'qligi sababli.
///
/// Geokodlash QURILMANING o'z xizmati orqali (`geocoding` paketi) —
/// tashqi API kaliti ham, so'rov limiti ham yo'q. Expo tarafida ham
/// shunday (`expo-location`).
class LocationPickerScreen extends StatefulWidget {
  const LocationPickerScreen({super.key, this.initial});

  /// Tahrirlashda — mavjud koordinata.
  final LatLng? initial;

  @override
  State<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

class _LocationPickerScreenState extends State<LocationPickerScreen> {
  /// Toshkent markazi — boshlang'ich ko'rinish.
  static const _tashkent = LatLng(41.2995, 69.2401);

  late LatLng _center = widget.initial ?? _tashkent;
  late LatLng _picked = widget.initial ?? _tashkent;

  String? _addressLine;
  bool _locating = false;
  bool _geocoding = false;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _scheduleGeocode();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  /// Teskari geokodlash — KECHIKTIRILIB.
  ///
  /// Har pin siljiganda so'rasak, qurilma xizmati surish davomida
  /// o'nlab marta chaqirilardi va javoblar tartibsiz kelib, ekranda
  /// eski manzil qolib ketishi mumkin edi.
  void _scheduleGeocode() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 600), _geocode);
  }

  Future<void> _geocode() async {
    final target = _picked;
    setState(() => _geocoding = true);
    try {
      final places = await geo.Geocoding().placemarkFromCoordinates(
        target.latitude,
        target.longitude,
      );
      if (!mounted || target != _picked) return;
      final p = places.isEmpty ? null : places.first;
      setState(() {
        _geocoding = false;
        _addressLine = p == null
            ? null
            : <String?>[p.administrativeArea, p.locality, p.street]
                .map((s) => s?.trim())
                .whereType<String>()
                .where((s) => s.isNotEmpty)
                .join(', ');
      });
    } catch (_) {
      // Geokodlash ishlamasa ham KOORDINATA olinadi — asosiy maqsad
      // shu. Manzil matnini mijoz formada o'zi yozadi.
      if (mounted) setState(() => _geocoding = false);
    }
  }

  Future<void> _useMyLocation() async {
    setState(() => _locating = true);
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        if (mounted) {
          setState(() => _locating = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(context.t('map.locationDenied'))),
          );
        }
        return;
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      if (!mounted) return;
      final here = LatLng(pos.latitude, pos.longitude);
      setState(() {
        _locating = false;
        _center = here;
        _picked = here;
      });
      _scheduleGeocode();
    } catch (_) {
      if (mounted) setState(() => _locating = false);
    }
  }

  void _onPick(LatLng point) {
    setState(() => _picked = point);
    _scheduleGeocode();
  }

  @override
  Widget build(BuildContext context) {
    // Hudud chegarasi SERVERDAN keladi (`/api/config`) — klientda
    // takrorlasak, qoida o'zgarganda ikkisi ajralib ketardi.
    final bbox = SellobayRuntimeScope.of(context).config.value?.tashkentCityBbox;
    final outside = bbox != null && !bbox.contains(_picked.latitude, _picked.longitude);

    return Scaffold(
      appBar: AppBar(title: Text(context.t('map.pickTitle'))),
      body: Column(
        children: [
          Expanded(
            child: Stack(
              children: [
                SellobayMap(
                  center: _center,
                  pin: _picked,
                  onPick: _onPick,
                ),
                Positioned(
                  right: 14,
                  bottom: 14,
                  child: FloatingActionButton.small(
                    heroTag: 'my-location',
                    onPressed: _locating ? null : _useMyLocation,
                    backgroundColor: Colors.white,
                    foregroundColor: SellobayColors.primary,
                    tooltip: context.t('map.myLocation'),
                    child: _locating
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2.2),
                          )
                        : const Icon(Icons.my_location, size: 20),
                  ),
                ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.place_outlined, size: 18, color: SellobayColors.mutedText),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _addressLine ?? context.t('map.dragHint'),
                          maxLines: 2,
                          style: TextStyle(
                            fontSize: 13.5,
                            height: 1.35,
                            fontWeight: _addressLine == null ? FontWeight.w400 : FontWeight.w600,
                            color: _addressLine == null
                                ? SellobayColors.mutedText
                                : SellobayColors.ink,
                          ),
                        ),
                      ),
                      if (_geocoding)
                        const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                    ],
                  ),
                  if (outside) ...[
                    const SizedBox(height: 10),
                    // To'siq EMAS, ogohlantirish: viloyatga yetkazish
                    // ham bo'lishi mumkin va qoidani server hal qiladi.
                    Row(
                      children: [
                        const Icon(
                          Icons.info_outline,
                          size: 15,
                          color: SellobayColors.destructive,
                        ),
                        const SizedBox(width: 7),
                        Expanded(
                          child: Text(
                            context.t('map.outsideCity'),
                            style: const TextStyle(
                              fontSize: 12,
                              color: SellobayColors.destructive,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => Navigator.of(context).pop(_result()),
                      child: Text(context.t('map.confirm')),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  PickedLocation _result() {
    final parts = (_addressLine ?? '').split(',').map((s) => s.trim()).toList();
    return PickedLocation(
      latitude: _picked.latitude,
      longitude: _picked.longitude,
      region: parts.isNotEmpty && parts[0].isNotEmpty ? parts[0] : null,
      city: parts.length > 1 ? parts[1] : null,
      street: parts.length > 2 ? parts[2] : null,
    );
  }
}
