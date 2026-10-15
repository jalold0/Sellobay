'use client';

// Sellobay xaritasi (web) — mobil ilovadagi bilan BIR XIL manba: Protomaps
// vektor plitkalari, bitta pmtiles arxivi (O'zbekiston), API kalitsiz.
// Qarang: apps/flutter/shared/lib/src/config/app_config.dart (pmtilesUrl).
//
// Ikki rejim:
//   • pin — bosilgan/surilgan nuqta [onPick] bilan qaytadi (uy manzili);
//   • markerlar — filiallar, bosilsa [onMarkerClick].
//
// maplibre faqat brauzerda yuklanadi (dinamik import) — server render va
// bosh sahifa bundle'iga tushmaydi.

import 'maplibre-gl/dist/maplibre-gl.css';

import * as React from 'react';

import type * as MapLibre from 'maplibre-gl';

export const PMTILES_URL =
  process.env.NEXT_PUBLIC_PMTILES_URL ??
  'https://pub-a8adf525367442ce88806dc6dd797272.r2.dev/uzbekistan.pmtiles';

/** Toshkent markazi — standart ko'rinish. */
export const TASHKENT_CENTER = { lat: 41.2995, lng: 69.2401 };

export interface MapPoint {
  lat: number;
  lng: number;
}

export interface MapMarker extends MapPoint {
  id: string;
  label: string;
  selected?: boolean;
}

interface Props {
  center?: MapPoint;
  zoom?: number;
  pin?: MapPoint | null;
  onPick?: (p: MapPoint) => void;
  markers?: MapMarker[];
  onMarkerClick?: (id: string) => void;
  className?: string;
  /** Xarita yuklanmasa (eski brauzer, WebGL yo'q) — chaqiriladi. */
  onError?: () => void;
  ariaLabel: string;
}

let protocolReady = false;

export function SellobayMap({
  center = TASHKENT_CENTER,
  zoom = 12,
  pin,
  onPick,
  markers,
  onMarkerClick,
  className,
  onError,
  ariaLabel,
}: Props) {
  const box = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<MapLibre.Map | null>(null);
  const pinRef = React.useRef<MapLibre.Marker | null>(null);
  const markerRefs = React.useRef<MapLibre.Marker[]>([]);
  const libRef = React.useRef<typeof MapLibre | null>(null);
  const [ready, setReady] = React.useState(false);

  // Callback'lar o'zgarsa xarita qayta yaratilmasin.
  const onPickRef = React.useRef(onPick);
  const onMarkerRef = React.useRef(onMarkerClick);
  onPickRef.current = onPick;
  onMarkerRef.current = onMarkerClick;

  React.useEffect(() => {
    let cancelled = false;
    let map: MapLibre.Map | null = null;
    void (async () => {
      try {
        const [maplibre, pmtiles, basemaps] = await Promise.all([
          import('maplibre-gl'),
          import('pmtiles'),
          import('@protomaps/basemaps'),
        ]);
        if (cancelled || !box.current) return;
        if (!protocolReady) {
          // Worker sayt domenidan (public/vendor — scripts/copy-maplibre-worker.mjs).
          maplibre.setWorkerUrl(`/vendor/maplibre/${maplibre.getVersion()}/maplibre-gl-worker.mjs`);
          const protocol = new pmtiles.Protocol();
          maplibre.addProtocol('pmtiles', protocol.tile);
          protocolReady = true;
        }
        libRef.current = maplibre;
        map = new maplibre.Map({
          container: box.current,
          center: [center.lng, center.lat],
          zoom,
          maxZoom: 18,
          attributionControl: { compact: true },
          style: {
            version: 8,
            glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
            sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/light',
            sources: {
              protomaps: {
                type: 'vector',
                url: `pmtiles://${PMTILES_URL}`,
                attribution: '© OpenStreetMap',
              },
            },
            layers: basemaps.layers('protomaps', basemaps.namedFlavor('light'), { lang: 'en' }),
          },
        });
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
        map.on('click', (e) => onPickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
        map.on('load', () => !cancelled && setReady(true));
        mapRef.current = map;
      } catch (err) {
        console.error('[map] yuklanmadi', err);
        if (!cancelled) onError?.();
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // Xarita bir marta yaratiladi; markaz va pin pastdagi effektlarda yangilanadi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pin (uy nuqtasi) — suriladi.
  React.useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib) return;
    if (!pin) {
      pinRef.current?.remove();
      pinRef.current = null;
      return;
    }
    if (!pinRef.current) {
      const marker = new lib.Marker({ color: '#531625', draggable: Boolean(onPickRef.current) })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLngLat();
        onPickRef.current?.({ lat: p.lat, lng: p.lng });
      });
      pinRef.current = marker;
    } else {
      pinRef.current.setLngLat([pin.lng, pin.lat]);
    }
  }, [ready, pin]);

  // Filial markerlari.
  React.useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib) return;
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = (markers ?? []).map((m) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', m.label);
      el.className = m.selected
        ? 'h-5 w-5 rounded-full border-[3px] border-white bg-[#531625] shadow-md ring-2 ring-[#531625]'
        : 'h-4 w-4 rounded-full border-2 border-white bg-[#531625]/70 shadow';
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        onMarkerRef.current?.(m.id);
      });
      return new lib.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map);
    });
    // Hamma marker ko'rinsin.
    if (markers && markers.length > 1) {
      const bounds = new lib.LngLatBounds();
      markers.forEach((m) => bounds.extend([m.lng, m.lat]));
      map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
    } else if (markers?.length === 1) {
      map.jumpTo({ center: [markers[0]!.lng, markers[0]!.lat], zoom: 14 });
    }
  }, [ready, markers]);

  // Tashqaridan markaz o'zgarsa (masalan «Mening joylashuvim»).
  React.useEffect(() => {
    if (ready) mapRef.current?.easeTo({ center: [center.lng, center.lat], duration: 400 });
  }, [ready, center.lat, center.lng]);

  return (
    <div
      ref={box}
      role="application"
      aria-label={ariaLabel}
      className={className ?? 'h-72 w-full overflow-hidden rounded-xl'}
    />
  );
}
