import * as React from 'react';
import { View, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

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

function buildHtml({
  center,
  pin,
  points,
  zoom,
  interactive,
}: {
  center: LatLng;
  pin?: LatLng;
  points: MapPoint[];
  zoom: number;
  interactive: boolean;
}): string {
  const pinJson = pin ? JSON.stringify(pin) : 'null';
  const pointsJson = JSON.stringify(points);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    #map { width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var center = ${JSON.stringify(center)};
    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([center.lat, center.lng], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    var interactive = ${interactive};
    var pin = ${pinJson};
    var marker = null;

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

    // Faqat ko'rsatiladigan nuqtalar
    var points = ${pointsJson};
    points.forEach(function (pt) {
      var m = L.marker([pt.lat, pt.lng]).addTo(map);
      if (pt.label) m.bindPopup(pt.label);
    });

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

  // HTML faqat bir marta quriladi (remount bo'lmasin) — recenter injectJavaScript orqali
  const html = React.useMemo(
    () => buildHtml({ center, pin, points, zoom, interactive }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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
        source={{ html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
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
