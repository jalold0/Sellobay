// Saqlangan manzil javobi — koordinatalar SON bo'lib qaytadi.
//
// `UserAddress.latitude/longitude` bazada `Decimal`; JSON'da u satr
// ("41.3111000") bo'lib ketardi. Mobil ilova (`SavedAddress.fromJson`)
// son kutadi va satr kelganda butun ro'yxat o'qilmay qolardi — koordinatali
// birinchi manzil saqlanishi bilan checkout'dagi manzillar yo'qolardi.

type WithCoords = {
  latitude: { toString(): string } | null;
  longitude: { toString(): string } | null;
};

export function serializeAddress<T extends WithCoords>(
  a: T,
): Omit<T, 'latitude' | 'longitude'> & { latitude: number | null; longitude: number | null } {
  return {
    ...a,
    latitude: a.latitude === null ? null : Number(a.latitude.toString()),
    longitude: a.longitude === null ? null : Number(a.longitude.toString()),
  };
}
