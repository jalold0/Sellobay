// Xarita adapteri — provayderни tanlaydi. Ekranlar shu 'map' modulini import qiladi.
// Tartib: Yandex key bo'lsa Yandex; pmtilesUrl bo'lsa Protomaps (MapLibre GL);
// aks holda OSM raster (Leaflet fallback). Geocoding bunda EMAS — expo-location'da.

import { LeafletMap, TASHKENT, type LatLng, type MapPoint } from './leaflet-map';
import { MapLibreMap, PMTILES_URL } from './maplibre-map';
import { YandexMap, YANDEX_API_KEY } from './yandex-map';

import type { ViewStyle } from 'react-native';

export { TASHKENT };
export type { LatLng, MapPoint };

interface MapProps {
  center: LatLng;
  pin?: LatLng;
  onPick?: (p: LatLng) => void;
  points?: MapPoint[];
  zoom?: number;
  style?: ViewStyle;
}

const useYandex = YANDEX_API_KEY.length > 0;
const usePmtiles = PMTILES_URL.length > 0;

export function AppMap(props: MapProps) {
  if (useYandex) return <YandexMap {...props} />;
  if (usePmtiles) return <MapLibreMap {...props} />;
  return <LeafletMap {...props} />;
}
