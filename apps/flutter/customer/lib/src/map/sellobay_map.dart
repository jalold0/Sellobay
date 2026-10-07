import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:sellobay_shared/sellobay_shared.dart';
import 'package:vector_map_tiles/vector_map_tiles.dart';
import 'package:vector_map_tiles_pmtiles/vector_map_tiles_pmtiles.dart';

/// Xarita — Protomaps vektor plitkalari (pmtiles).
///
/// NEGA RASTR EMAS: OpenStreetMap'ning ommaviy rastr serveri tijorat
/// ilovalarida ishlatishni taqiqlaydi, o'z rastr serverimiz esa alohida
/// xarajat. pmtiles — BITTA fayl, undan kerakli bo'lak HTTP Range
/// so'rovi bilan olinadi: server kerak emas, fayl o'z bucket'imizda.
///
/// Expo ilovasi ham aynan shu manbadan o'qiydi (`app.json` dagi
/// `pmtilesUrl`), ya'ni ikkala ilova bir xil xaritani ko'rsatadi.
///
/// Temani `vector_map_tiles_pmtiles` paketi o'zi olib yuradi. Uslubni
/// qo'lda nusxalab olib yurish ham mumkin edi, lekin shunda Protomaps
/// uslubi yangilanganda biz qo'lda yangilashimiz kerak bo'lardi.
class SellobayMap extends StatefulWidget {
  const SellobayMap({
    super.key,
    required this.center,
    this.pin,
    this.onPick,
    this.points = const [],
    this.zoom = 15,
    this.interactive = true,
  });

  final LatLng center;

  /// Tanlangan nuqta — ko'rsatiladi va [onPick] bilan siljiydi.
  final LatLng? pin;

  /// Xaritaga bosilganda chaqiriladi. `null` — xarita faqat ko'rsatish
  /// uchun (masalan punktlar ro'yxatida).
  final ValueChanged<LatLng>? onPick;

  /// Qo'shimcha belgilar (topshirish punktlari).
  final List<MapMarker> points;

  final double zoom;
  final bool interactive;

  /// Plitkalarni tarmoqdan olishni o'chiradi — FAQAT testda.
  @visibleForTesting
  static bool tilesEnabled = true;

  @override
  State<SellobayMap> createState() => _SellobayMapState();
}

/// Xaritadagi belgi.
class MapMarker {
  const MapMarker({required this.point, required this.label, this.onTap});

  final LatLng point;
  final String label;
  final VoidCallback? onTap;
}

class _SellobayMapState extends State<SellobayMap> {
  /// Plitka provayderi BIR MARTA ochiladi va keshlanadi.
  ///
  /// `fromSource` pmtiles arxivining sarlavhasini o'qiydi (tarmoq
  /// so'rovi). Har qayta qurishda qaytadan ochsak, xarita har
  /// `setState` da miltillardi.
  static Future<PmTilesVectorTileProvider>? _provider;

  late final MapController _controller = MapController();

  @override
  void initState() {
    super.initState();
    if (SellobayMap.tilesEnabled) {
      _provider ??= PmTilesVectorTileProvider.fromSource(AppConfig.pmtilesUrl);
    }
  }

  /// `FlutterMap` kamida bir marta chizilganmi.
  ///
  /// `MapController` chizilmagan xaritada ISTISNO otadi:
  ///   «You need to have the FlutterMap widget rendered at least once
  ///    before using the MapController»
  ///
  /// Bu haqiqiy yiqilish yo'li edi: plitkalar hali yuklanayotganda
  /// (yoki umuman yuklanmaganda) markaz tashqaridan o'zgarsa —
  /// masalan «mening joylashuvim» bosilsa — ekran qulardi.
  bool _ready = false;

  @override
  void didUpdateWidget(SellobayMap old) {
    super.didUpdateWidget(old);
    // Markaz tashqaridan o'zgarsa, xaritani o'sha yerga suramiz —
    // lekin FAQAT xarita tayyor bo'lsa.
    if (_ready && widget.center != old.center) {
      _controller.move(widget.center, _controller.camera.zoom);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Widget testida tarmoq yo'q: plitkalar so'ralsa, so'rov hech
    // qachon tugamaydi va STATIK kesh keyingi testlarga ham o'tib
    // ketadi — testlar bir-biriga ta'sir qiladi. Shuning uchun
    // o'chirib qo'yish mumkin: ekranning qolgan qismi (ro'yxat,
    // filtr, tanlash) baribir tekshiriladi.
    if (!SellobayMap.tilesEnabled) {
      _ready = false;
      return _fallback(context, context.t('map.unavailable'));
    }

    return FutureBuilder<PmTilesVectorTileProvider>(
      future: _provider,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          // Xarita yuklanmasa ham ekran ISHLASHDA DAVOM ETADI: manzilni
          // qo'lda kiritish mumkin. Bo'sh oq joy o'rniga sabab yoziladi.
          return _fallback(context, context.t('map.unavailable'));
        }
        final provider = snapshot.data;
        if (provider == null) {
          return const Center(
            child: SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2.5, color: SellobayColors.primary),
            ),
          );
        }

        return FlutterMap(
          mapController: _controller,
          options: MapOptions(
            initialCenter: widget.center,
            initialZoom: widget.zoom,
            // Zumni arxiv qo'llab-quvvatlaydigan darajadan oshirmaymiz —
            // aks holda bo'sh plitka chiqadi.
            maxZoom: provider.maximumZoom.toDouble(),
            minZoom: provider.minimumZoom.toDouble(),
            interactionOptions: InteractionOptions(
              flags: widget.interactive ? InteractiveFlag.all : InteractiveFlag.none,
            ),
            onMapReady: () => _ready = true,
            onTap: widget.onPick == null ? null : (_, point) => widget.onPick!(point),
          ),
          children: [
            VectorTileLayer(
              theme: ProtomapsThemes.lightV4(),
              tileProviders: TileProviders({'protomaps': provider}),
              // Vektor plitkalar har kadrda qayta chizilmasin — telefonda
              // bu batareyani tez yeydi.
              layerMode: VectorTileLayerMode.vector,
            ),
            if (widget.points.isNotEmpty)
              MarkerLayer(
                markers: [
                  for (final p in widget.points)
                    Marker(
                      point: p.point,
                      width: 40,
                      height: 40,
                      child: GestureDetector(
                        onTap: p.onTap,
                        child: const Icon(
                          Icons.store_mall_directory,
                          size: 30,
                          color: SellobayColors.primary,
                        ),
                      ),
                    ),
                ],
              ),
            if (widget.pin != null)
              MarkerLayer(
                markers: [
                  Marker(
                    point: widget.pin!,
                    width: 44,
                    height: 44,
                    // Belgining uchi nuqtaga tegsin, markazi emas.
                    alignment: Alignment.topCenter,
                    child: const Icon(
                      Icons.location_on,
                      size: 42,
                      color: SellobayColors.destructive,
                    ),
                  ),
                ],
              ),
          ],
        );
      },
    );
  }

  Widget _fallback(BuildContext context, String text) => ColoredBox(
        color: SellobayColors.soft,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.map_outlined, size: 36, color: SellobayColors.mutedText),
                const SizedBox(height: 10),
                Text(
                  text,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, color: SellobayColors.mutedText),
                ),
              ],
            ),
          ),
        ),
      );
}
