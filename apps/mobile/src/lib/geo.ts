// Joylashuv (GPS) + reverse geocoding — expo-location orqali (bepul, OS xizmati).
import * as Location from 'expo-location';

export interface GeoAddress {
  region?: string;
  city?: string;
  street?: string;
}

/**
 * Toshkent shahar chegarasi (taxminiy bounding box). Uygacha yetkazish FAQAT
 * shu chegara ichida amal qiladi; tashqarisi uchun olib ketish punkti.
 * (web bilan bir xil qiymat — @ecom/utils/geo.)
 */
export const TASHKENT_CITY_BBOX = {
  latMin: 41.15,
  latMax: 41.4,
  lngMin: 69.1,
  lngMax: 69.45,
} as const;

/** Berilgan koordinata Toshkent shahar chegarasi ichidami? */
export function isInTashkentCity(lat: number, lng: number): boolean {
  return (
    lat >= TASHKENT_CITY_BBOX.latMin &&
    lat <= TASHKENT_CITY_BBOX.latMax &&
    lng >= TASHKENT_CITY_BBOX.lngMin &&
    lng <= TASHKENT_CITY_BBOX.lngMax
  );
}

/** Foydalanuvchidan ruxsat so'rab, joriy GPS koordinatasini qaytaradi. null = rad etildi/xato. */
export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/** Koordinatadan manzil (shahar/ko'cha). Xato bo'lsa bo'sh obyekt. */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoAddress> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const r = results[0];
    if (!r) return {};
    const region = r.region ?? r.subregion ?? undefined;
    const city = r.city ?? r.subregion ?? r.district ?? undefined;
    const street = [r.street, r.name].filter(Boolean).join(' ').trim() || undefined;
    return { region: region ?? undefined, city: city ?? undefined, street };
  } catch {
    return {};
  }
}
