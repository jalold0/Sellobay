// Joylashuv (GPS) + reverse geocoding — expo-location orqali (bepul, OS xizmati).
import * as Location from 'expo-location';

export interface GeoAddress {
  region?: string;
  city?: string;
  street?: string;
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
