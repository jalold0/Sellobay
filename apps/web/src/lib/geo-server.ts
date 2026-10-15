// Koordinatadan manzil matni (teskari geokodlash) — web xarita uchun.
//
// Mobil ilova telefonning o'z geokoderidan foydalanadi; brauzerda bunday
// xizmat yo'q. Manba — OpenStreetMap Nominatim (bepul, kalitsiz). Uning
// qoidasi: ilovani tanituvchi User-Agent, sekundiga 1 so'rovdan oshmaslik
// va natijani keshlash. Shuning uchun so'rov SERVER orqali o'tadi (brauzer
// to'g'ridan-to'g'ri urmaydi), natija keshlanadi va route rate-limit bilan.
//
// Ko'p yuklamada o'z Nominatim/Photon nusxasi yoki pullik xizmatga
// o'tiladi — interfeys (`ReverseGeocodeResult`) shu bo'lib qoladi.

import { isInTashkentCity, regionSlugFromText, type UzRegionSlug } from '@ecom/core-domain';
import { unstable_cache } from 'next/cache';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'Sellobay/1.0 (+https://www.sellobay.uz)';

export interface ReverseGeocodeResult {
  /** Bazaga yoziladigan hudud nomi (masalan «Toshkent shahri»). */
  region: string;
  regionSlug: UzRegionSlug | null;
  city: string;
  district: string;
  street: string;
  house: string;
  /** Bir qatorda ko'rsatish uchun. */
  label: string;
  /** Uygacha yetkazish hududi ichidami (koordinata bo'yicha, server qoidasi bilan bir xil). */
  inTashkentCity: boolean;
}

interface NominatimAddress {
  state?: string;
  region?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  district?: string;
  city_district?: string;
  suburb?: string;
  quarter?: string;
  neighbourhood?: string;
  road?: string;
  pedestrian?: string;
  house_number?: string;
}

/** Nominatim javobini bizning shaklga o'giradi (sof funksiya — testlanadi). */
export function parseNominatim(
  lat: number,
  lng: number,
  json: { address?: NominatimAddress } | null,
): ReverseGeocodeResult {
  const a = json?.address ?? {};
  const inTashkentCity = isInTashkentCity(lat, lng);
  const rawCity = a.city ?? a.town ?? a.village ?? a.county ?? '';
  // Toshkent ichida nom bir xil yoziladi («Tashkent»/«Ташкент» emas).
  const city = inTashkentCity ? 'Toshkent' : rawCity;
  const state = a.state ?? a.region ?? '';
  const regionSlug = inTashkentCity ? 'toshkent-shahri' : regionSlugFromText(state, rawCity);
  const district = a.city_district ?? a.district ?? a.suburb ?? a.quarter ?? '';
  const street = a.road ?? a.pedestrian ?? a.neighbourhood ?? '';
  const house = a.house_number ?? '';
  const label = [street && house ? `${street}, ${house}` : street, district, city]
    .filter(Boolean)
    .join(', ');
  return {
    region: inTashkentCity ? 'Toshkent shahri' : state,
    regionSlug,
    city,
    district,
    street,
    house,
    label,
    inTashkentCity,
  };
}

/**
 * 4 kasrgacha yaxlitlangan nuqta bo'yicha keshlanadi (~11 m): bir uy
 * atrofida pinni surish Nominatim'ga qayta-qayta urmaydi.
 */
const cachedReverse = unstable_cache(
  async (lat4: number, lng4: number, lang: string): Promise<ReverseGeocodeResult> => {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat4));
    url.searchParams.set('lon', String(lng4));
    url.searchParams.set('zoom', '18');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', lang);
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    return parseNominatim(lat4, lng4, (await res.json()) as { address?: NominatimAddress });
  },
  ['geo-reverse-v1'],
  { revalidate: 60 * 60 * 24 * 30 },
);

export async function reverseGeocode(
  lat: number,
  lng: number,
  lang: 'uz' | 'ru' | 'en',
): Promise<ReverseGeocodeResult> {
  const round = (n: number) => Math.round(n * 1e4) / 1e4;
  try {
    return await cachedReverse(round(lat), round(lng), lang);
  } catch (err) {
    // Xizmat javob bermasa ham pin baribir ishlaydi: hudud koordinatadan,
    // ko'cha nomini mijoz o'zi yozadi.
    console.error('[geo] reverse xato:', err);
    return parseNominatim(lat, lng, null);
  }
}
