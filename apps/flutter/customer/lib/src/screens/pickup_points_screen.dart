import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:sellobay_shared/sellobay_shared.dart';

import '../map/pickup_marker.dart';
import '../map/sellobay_map.dart';

/// Olib ketish punktlari — xarita va ro'yxat.
///
/// NEGA ALOHIDA EKRAN: checkout'da punktlar oddiy `DropdownButton` da
/// edi. Ro'yxatda 8 ta shahar bo'ylab 12 ta punkt bor va ularning
/// manzili, ish vaqti, mo'ljali muhim — ochiluvchi ro'yxatda bu
/// ma'lumot sig'maydi va mijoz qaysi punkt o'ziga yaqinligini
/// tushunmaydi.
///
/// [selectable] — checkout'dan ochilganda `true`: punkt tanlanadi va
/// `Navigator.pop` bilan qaytariladi. Profildan ochilganda `false`:
/// faqat ko'rish uchun.
class PickupPointsScreen extends StatefulWidget {
  const PickupPointsScreen({super.key, this.selectable = false, this.initialCity});

  final bool selectable;

  /// Mijozning manzilidagi shahar — shu shahar oldindan tanlanadi.
  final String? initialCity;

  @override
  State<PickupPointsScreen> createState() => _PickupPointsScreenState();
}

class _PickupPointsScreenState extends State<PickupPointsScreen> {
  /// Toshkent markazi — punktlar hali yuklanmaganda.
  static const _tashkent = LatLng(41.2995, 69.2401);

  List<PickupPoint> _all = const [];
  late String? _city = widget.initialCity;
  PickupPoint? _focused;

  bool _loading = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final points = await SellobayRuntimeScope.of(context).checkout.fetchPickupPoints();
      if (!mounted) return;
      setState(() {
        _all = points;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e;
      });
    }
  }

  List<PickupPoint> get _visible =>
      _city == null ? _all : _all.where((p) => p.city == _city).toList();

  List<String> get _cities => (_all.map((p) => p.city).toSet().toList()..sort());

  LatLng get _center {
    final focused = _focused;
    if (focused != null && focused.hasCoordinates) {
      return LatLng(focused.latitude!, focused.longitude!);
    }
    final withCoords = _visible.where((p) => p.hasCoordinates).toList();
    if (withCoords.isEmpty) return _tashkent;
    // Ko'rinadigan punktlarning o'rtasi — shunda hammasi kadrga
    // tushishga yaqin bo'ladi.
    final lat = withCoords.map((p) => p.latitude!).reduce((a, b) => a + b) / withCoords.length;
    final lng = withCoords.map((p) => p.longitude!).reduce((a, b) => a + b) / withCoords.length;
    return LatLng(lat, lng);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.t('pickupPoints.title'))),
      body: _body(context),
    );
  }

  Widget _body(BuildContext context) {
    if (_loading) {
      return const Center(
        child: SizedBox(
          width: 26,
          height: 26,
          child: CircularProgressIndicator(strokeWidth: 2.5, color: SellobayColors.primary),
        ),
      );
    }

    if (_error != null) {
      return ListView(
        padding: const EdgeInsets.all(32),
        children: [
          SizedBox(height: MediaQuery.sizeOf(context).height * 0.15),
          const Icon(Icons.cloud_off, size: 42, color: SellobayColors.mutedText),
          const SizedBox(height: 14),
          Text(
            context.errorText(_error!),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 18),
          Center(child: FilledButton(onPressed: _load, child: Text(context.t('common.retry')))),
        ],
      );
    }

    if (_all.isEmpty) {
      // To'qima punkt KO'RSATILMAYDI.
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text(
            context.t('pickupPoints.empty'),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14, color: SellobayColors.mutedText),
          ),
        ),
      );
    }

    final locale = SellobayRuntimeScope.of(context).locale.locale;
    final visible = _visible;

    return Column(
      children: [
        SizedBox(
          height: 240,
          child: SellobayMap(
            center: _center,
            zoom: _city == null ? 5.5 : 12,
            points: [
              for (final p in visible)
                if (p.hasCoordinates)
                  MapMarker(
                    point: LatLng(p.latitude!, p.longitude!),
                    child: PickupMarker(
                      code: p.code,
                      selected: p.id == _focused?.id,
                    ),
                    onTap: () => setState(() => _focused = p),
                  ),
            ],
          ),
        ),
        if (_cities.length > 1)
          SizedBox(
            height: 46,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              children: [
                Padding(
                  key: const ValueKey('city-all'),
                  padding: const EdgeInsets.only(right: 7),
                  child: ChoiceChip(
                    label: Text(context.t('pickupPoints.allCities')),
                    selected: _city == null,
                    onSelected: (_) => setState(() {
                      _city = null;
                      _focused = null;
                    }),
                  ),
                ),
                for (final city in _cities)
                  Padding(
                    key: ValueKey('city-$city'),
                    padding: const EdgeInsets.only(right: 7),
                    child: ChoiceChip(
                      label: Text(city),
                      selected: _city == city,
                      onSelected: (_) => setState(() {
                        _city = city;
                        _focused = null;
                      }),
                    ),
                  ),
              ],
            ),
          ),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
            itemCount: visible.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (context, i) => KeyedSubtree(
              key: ValueKey(visible[i].id),
              child: _card(context, visible[i], locale),
            ),
          ),
        ),
      ],
    );
  }

  Widget _card(BuildContext context, PickupPoint p, String locale) {
    final focused = identical(p, _focused) || p.id == _focused?.id;
    return InkWell(
      onTap: () => setState(() => _focused = p),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          border: Border.all(
            color: focused ? SellobayColors.primary : SellobayColors.border,
            width: focused ? 1.6 : 1,
          ),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    p.name.pick(locale),
                    style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: SellobayColors.ink,
                    ),
                  ),
                ),
                if (p.type != 'PVZ')
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: SellobayColors.soft,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      p.type,
                      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 5),
            Text(
              p.address,
              style: const TextStyle(fontSize: 13, height: 1.4, color: SellobayColors.mutedText),
            ),
            if (p.landmark != null && p.landmark!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 3),
                child: Text(
                  '${context.t('pickupPoints.landmark')}: ${p.landmark}',
                  style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
                ),
              ),
            if (p.workingHours != null && p.workingHours!.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 3),
                child: Row(
                  children: [
                    const Icon(Icons.schedule, size: 14, color: SellobayColors.mutedText),
                    const SizedBox(width: 5),
                    Expanded(
                      child: Text(
                        p.workingHours!,
                        style: const TextStyle(fontSize: 12.5, color: SellobayColors.mutedText),
                      ),
                    ),
                  ],
                ),
              ),
            if (widget.selectable) ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.of(context).pop(p),
                  child: Text(context.t('pickupPoints.select')),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
