// Geo yordamchilari — yetkazib berish hududini koordinatadan aniqlash.
// Uygacha yetkazish FAQAT Toshkent shahar uchun amal qiladi; qolgan hamma
// joy uchun olib ketish punkti ishlatiladi.

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Toshkent shahar chegarasi (taxminiy bounding box).
 * Shahar markazi ~41.30, 69.24. Chekka tumanlarni qamrash uchun ozgina marja.
 * Eslatma: bu bbox — viloyat EMAS, faqat shahar. Chegara yaqinida ~1-2km xato bo'lishi mumkin.
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

/**
 * Koordinata bo'lmaganda (web forma) matndan Toshkent shaharni taxmin qilish.
 * Heuristika: region/city ichida "toshkent/tashkent/ташкент" uchrasa — shahar deb
 * qabul qilinadi (viloyat markazlari chekka holat — kuryer ops hal qiladi).
 * Klient (checkout) va server (/api/orders) BIR XIL qoidani ishlatishi shart.
 */
export function looksLikeTashkentCityText(region: string, city: string): boolean {
  const text = `${region} ${city}`.toLowerCase();
  return text.includes('toshkent') || text.includes('tashkent') || text.includes('ташкент');
}
