import Constants from 'expo-constants';
import * as React from 'react';
import { View, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import { useLocale } from '../store/locale';

import { type LatLng, type MapPoint } from './leaflet-map';

interface Props {
  center: LatLng;
  pin?: LatLng;
  onPick?: (p: LatLng) => void;
  points?: MapPoint[];
  zoom?: number;
  style?: ViewStyle;
}

/** app.json → extra.yandexMapsApiKey (JS API + Geocoder kaliti). Bo'sh bo'lsa AppMap Leaflet'ga tushadi. */
export const YANDEX_API_KEY =
  (Constants.expoConfig?.extra?.yandexMapsApiKey as string | undefined) ?? '';

// Yandex JS API 2.1 uz_UZ ni qo'llamaydi — uz/ru uchun ru_RU (UZ manzillari uchun to'liqroq), en uchun en_US.
function langOf(locale: string): string {
  return locale === 'en' ? 'en_US' : 'ru_RU';
}

function buildHtml({
  center,
  pin,
  zoom,
  interactive,
  apiKey,
  lang,
}: {
  center: LatLng;
  pin?: LatLng;
  zoom: number;
  interactive: boolean;
  apiKey: string;
  lang: string;
}): string {
  const pinJson = pin ? JSON.stringify(pin) : 'null';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style> html, body, #map { height: 100%; margin: 0; padding: 0; width: 100%; } </style>
  <script src="https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=${lang}" type="text/javascript"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    var C = ${JSON.stringify(center)};
    var Z = ${zoom};
    var INTERACTIVE = ${interactive};
    var PIN = ${pinJson};
    var pinPm = null;
    var pointPms = [];

    function post(lat, lng) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pick', lat: lat, lng: lng }));
      }
    }

    function init() {
      var map = new ymaps.Map('map', {
        center: [C.lat, C.lng],
        zoom: Z,
        controls: ['zoomControl', 'geolocationControl'],
      });

      if (INTERACTIVE) {
        var start = PIN || C;
        pinPm = new ymaps.Placemark([start.lat, start.lng], {}, { draggable: true });
        map.geoObjects.add(pinPm);
        pinPm.events.add('dragend', function () {
          var c = pinPm.geometry.getCoordinates();
          post(c[0], c[1]);
        });
        map.events.add('click', function (e) {
          var c = e.get('coords');
          pinPm.geometry.setCoordinates(c);
          post(c[0], c[1]);
        });
      }

      // RN'dan ko'rsatiladigan nuqtalarni yangilash (o'z markerlarimiz — punktlar)
      window.__setPoints = function (pts) {
        pointPms.forEach(function (p) { map.geoObjects.remove(p); });
        pointPms = [];
        (pts || []).forEach(function (pt) {
          var pm = new ymaps.Placemark([pt.lat, pt.lng], { balloonContent: pt.label || '' });
          pointPms.push(pm);
          map.geoObjects.add(pm);
        });
      };
      window.__setPin = function (lat, lng) {
        if (pinPm) pinPm.geometry.setCoordinates([lat, lng]);
      };
      window.__recenter = function (lat, lng) {
        map.setCenter([lat, lng], Z);
        if (pinPm) pinPm.geometry.setCoordinates([lat, lng]);
      };

      window.__setPoints([]); // boshlang'ich nuqtalar RN effekti (__setPoints) orqali keladi
    }

    if (window.ymaps) { ymaps.ready(init); }
  </script>
</body>
</html>`;
}

export function YandexMap({ center, pin, onPick, points = [], zoom = 13, style }: Props) {
  const webRef = React.useRef<WebView>(null);
  const interactive = Boolean(onPick);
  const locale = useLocale((s) => s.locale);

  // HTML bir marta quriladi (remount bo'lmasin); center/points/pin injectJavaScript orqali
  const html = React.useMemo(
    () =>
      buildHtml({ center, pin, zoom, interactive, apiKey: YANDEX_API_KEY, lang: langOf(locale) }),
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
