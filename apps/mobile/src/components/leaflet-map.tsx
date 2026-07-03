import * as React from 'react';
import { View, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import {
  LEAFLET_CSS,
  LEAFLET_JS,
  MARKER_ICON,
  MARKER_ICON_2X,
  MARKER_SHADOW,
} from './leaflet-assets';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapPoint extends LatLng {
  label?: string;
}

interface Props {
  /** Xarita markazi (boshlang'ich) */
  center: LatLng;
  /** Suriladigan pin (picker rejimi). onPick bilan birga ishlaydi. */
  pin?: LatLng;
  /** Pin surilganda/bosilganda chaqiriladi (picker rejimi) */
  onPick?: (p: LatLng) => void;
  /** Faqat ko'rsatish uchun nuqtalar (masalan, topshirish punktlari) */
  points?: MapPoint[];
  zoom?: number;
  style?: ViewStyle;
}

// Toshkent markazi — default
export const TASHKENT: LatLng = { lat: 41.2995, lng: 69.2401 };

// Bu komponent — OSM raster fallback (pmtilesUrl bo'lmasa AppMap shuni tanlaydi).
// Protomaps vektor xarita endi MapLibre'da (maplibre-map.tsx).

function buildHtml({
  center,
  pin,
  zoom,
  interactive,
}: {
  center: LatLng;
  pin?: LatLng;
  zoom: number;
  interactive: boolean;
}): string {
  const pinJson = pin ? JSON.stringify(pin) : 'null';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>${LEAFLET_CSS}</style>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    #map { width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>${LEAFLET_JS}</script>
  <script>
    // Default marker ikonkalari — base64 data URI (nisbiy images/ yo'liga bog'liq EMAS,
    // shuning uchun inline/offline holatda ham markerlar to'g'ri ko'rinadi).
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '${MARKER_ICON_2X}',
      iconUrl: '${MARKER_ICON}',
      shadowUrl: '${MARKER_SHADOW}',
    });

    var center = ${JSON.stringify(center)};
    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([center.lat, center.lng], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    var interactive = ${interactive};
    var pin = ${pinJson};
    var marker = null;
    var pointMarkers = [];

    function post(lat, lng) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pick', lat: lat, lng: lng }));
      }
    }

    if (interactive) {
      var start = pin || center;
      marker = L.marker([start.lat, start.lng], { draggable: true }).addTo(map);
      marker.on('dragend', function (e) {
        var p = e.target.getLatLng();
        post(p.lat, p.lng);
      });
      map.on('click', function (e) {
        marker.setLatLng(e.latlng);
        post(e.latlng.lat, e.latlng.lng);
      });
    }

    // RN'dan ko'rsatiladigan nuqtalarni yangilash (eski markerlarni tozalab qayta chizadi).
    // Muhim: nuqtalar async kelsa ham (masalan topshirish punktlari) xaritada paydo bo'ladi.
    window.__setPoints = function (pts) {
      pointMarkers.forEach(function (m) { map.removeLayer(m); });
      pointMarkers = [];
      (pts || []).forEach(function (pt) {
        var m = L.marker([pt.lat, pt.lng]).addTo(map);
        if (pt.label) m.bindPopup(pt.label);
        pointMarkers.push(m);
      });
    };

    // RN'dan pinni siljitish (picker rejimi)
    window.__setPin = function (lat, lng) {
      if (marker) marker.setLatLng([lat, lng]);
    };

    // RN'dan recenter (injectJavaScript)
    window.__recenter = function (lat, lng) {
      map.setView([lat, lng], ${zoom});
      if (marker) { marker.setLatLng([lat, lng]); }
    };
  </script>
</body>
</html>`;
}

export function LeafletMap({ center, pin, onPick, points = [], zoom = 13, style }: Props) {
  const webRef = React.useRef<WebView>(null);
  const interactive = Boolean(onPick);

  // HTML faqat bir marta quriladi (remount bo'lmasin). points/pin/center — injectJavaScript orqali.
  const html = React.useMemo(
    () => buildHtml({ center, pin, zoom, interactive }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Barqaror kalit — points har renderda yangi massiv bo'lsa ham ortiqcha inject bo'lmasin
  const pointsKey = React.useMemo(() => JSON.stringify(points), [points]);

  // WebView yuklanib bo'lgach hozirgi overlay'larni sinxronlaymiz (mount race'dan himoya)
  const syncOverlays = React.useCallback(() => {
    const js =
      `window.__setPoints && window.__setPoints(${pointsKey});` +
      (pin ? `window.__setPin && window.__setPin(${pin.lat}, ${pin.lng});` : '') +
      ' true;';
    webRef.current?.injectJavaScript(js);
  }, [pointsKey, pin?.lat, pin?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nuqtalar/pin o'zgarsa qayta chizamiz
  React.useEffect(() => {
    syncOverlays();
  }, [syncOverlays]);

  // Markaz tashqaridan o'zgarsa (masalan "mening joylashuvim") — xaritani siljitamiz
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
