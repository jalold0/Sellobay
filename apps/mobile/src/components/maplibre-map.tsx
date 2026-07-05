import Constants from 'expo-constants';
import * as React from 'react';
import { View, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import { type LatLng, type MapPoint } from './leaflet-map';
import { PROTOMAPS_LAYERS, GLYPHS_URL, SPRITE_URL } from './protomaps-style';

interface Props {
  center: LatLng;
  pin?: LatLng;
  onPick?: (p: LatLng) => void;
  points?: MapPoint[];
  zoom?: number;
  style?: ViewStyle;
}

/** app.json → extra.pmtilesUrl. Berilsa AppMap shu (MapLibre) render'ni tanlaydi. */
export const PMTILES_URL = (Constants.expoConfig?.extra?.pmtilesUrl as string | undefined) ?? '';

const MAPLIBRE_VER = '5.24.0';
const PMTILES_VER = '4.4.1';

// app.json → extra.mapAssetsBaseUrl berilsa lib/shrift/sprite ham R2'dan (to'liq
// self-hosted, tashqi CDN'siz). Bo'sh bo'lsa jsdelivr + protomaps CDN (default).
const ASSET_BASE = (
  (Constants.expoConfig?.extra?.mapAssetsBaseUrl as string | undefined) ?? ''
).replace(/\/+$/, '');
const MLJS_URL = ASSET_BASE
  ? `${ASSET_BASE}/maplibre/maplibre-gl.js`
  : `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VER}/dist/maplibre-gl.js`;
const MLCSS_URL = ASSET_BASE
  ? `${ASSET_BASE}/maplibre/maplibre-gl.css`
  : `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VER}/dist/maplibre-gl.css`;
const PMJS_URL = ASSET_BASE
  ? `${ASSET_BASE}/maplibre/pmtiles.js`
  : `https://cdn.jsdelivr.net/npm/pmtiles@${PMTILES_VER}/dist/pmtiles.js`;
const GLYPHS = ASSET_BASE ? `${ASSET_BASE}/fonts/{fontstack}/{range}.pbf` : GLYPHS_URL;
const SPRITE = ASSET_BASE ? `${ASSET_BASE}/sprites/light` : SPRITE_URL;

function buildHtml({
  center,
  pin,
  zoom,
  interactive,
  pmtilesUrl,
}: {
  center: LatLng;
  pin?: LatLng;
  zoom: number;
  interactive: boolean;
  pmtilesUrl: string;
}): string {
  const style = {
    version: 8,
    glyphs: GLYPHS,
    sprite: SPRITE,
    sources: {
      protomaps: {
        type: 'vector',
        url: 'pmtiles://' + pmtilesUrl,
        attribution: '© OpenStreetMap · Protomaps',
      },
    },
    layers: PROTOMAPS_LAYERS,
  };
  const styleJson = JSON.stringify(style);
  const pinJson = pin ? JSON.stringify(pin) : 'null';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link href="${MLCSS_URL}" rel="stylesheet" />
  <script src="${MLJS_URL}"></script>
  <script src="${PMJS_URL}"></script>
  <style> html, body, #map { height: 100%; margin: 0; padding: 0; width: 100%; } </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var C = ${JSON.stringify(center)};
    var Z = ${zoom};
    var INTERACTIVE = ${interactive};
    var PIN = ${pinJson};
    var marker = null;
    var pointMarkers = [];

    function post(lat, lng) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pick', lat: lat, lng: lng }));
      }
    }

    // pmtiles protokolini ro'yxatga olamiz (R2'dagi .pmtiles ni range-request bilan o'qiydi)
    var protocol = new pmtiles.Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    // MapLibre koordinatasi [lng, lat] tartibida (Leaflet'dan teskari!)
    var map = new maplibregl.Map({
      container: 'map',
      style: ${styleJson},
      center: [C.lng, C.lat],
      zoom: Z,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

    // RN'dan ko'rsatiladigan nuqtalar (o'z markerlarimiz)
    window.__setPoints = function (pts) {
      pointMarkers.forEach(function (m) { m.remove(); });
      pointMarkers = [];
      (pts || []).forEach(function (pt) {
        var m = new maplibregl.Marker().setLngLat([pt.lng, pt.lat]);
        if (pt.label) m.setPopup(new maplibregl.Popup({ offset: 24 }).setText(pt.label));
        m.addTo(map);
        pointMarkers.push(m);
      });
    };
    window.__setPin = function (lat, lng) {
      if (marker) marker.setLngLat([lng, lat]);
    };
    window.__recenter = function (lat, lng) {
      map.setCenter([lng, lat]);
      if (marker) marker.setLngLat([lng, lat]);
    };

    map.on('load', function () {
      if (INTERACTIVE) {
        var start = PIN || { lat: C.lat, lng: C.lng };
        marker = new maplibregl.Marker({ draggable: true, color: '#531625' })
          .setLngLat([start.lng, start.lat])
          .addTo(map);
        marker.on('dragend', function () {
          var l = marker.getLngLat();
          post(l.lat, l.lng);
        });
        map.on('click', function (e) {
          marker.setLngLat(e.lngLat);
          post(e.lngLat.lat, e.lngLat.lng);
        });
      }
    });
  </script>
</body>
</html>`;
}

export function MapLibreMap({ center, pin, onPick, points = [], zoom = 13, style }: Props) {
  const webRef = React.useRef<WebView>(null);
  const interactive = Boolean(onPick);

  const html = React.useMemo(
    () => buildHtml({ center, pin, zoom, interactive, pmtilesUrl: PMTILES_URL }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const pointsKey = React.useMemo(() => JSON.stringify(points), [points]);

  const syncOverlays = React.useCallback(() => {
    const js =
      `window.__setPoints && window.__setPoints(${pointsKey});` +
      (pin ? `window.__setPin && window.__setPin(${pin.lat}, ${pin.lng});` : '') +
      ' true;';
    webRef.current?.injectJavaScript(js);
  }, [pointsKey, pin?.lat, pin?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    syncOverlays();
  }, [syncOverlays]);

  React.useEffect(() => {
    webRef.current?.injectJavaScript(
      `window.__recenter && window.__recenter(${center.lat}, ${center.lng}); true;`,
    );
  }, [center.lat, center.lng]);

  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://localhost' }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        onLoadEnd={syncOverlays}
        onMessage={(e) => {
          if (!onPick) return;
          try {
            const data = JSON.parse(e.nativeEvent.data) as {
              type: string;
              lat: number;
              lng: number;
            };
            if (data.type === 'pick') onPick({ lat: data.lat, lng: data.lng });
          } catch {
            // e'tibor bermaymiz
          }
        }}
      />
    </View>
  );
}
