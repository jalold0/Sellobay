import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));

const { parseNominatim } = await import('./geo-server');

describe('parseNominatim', () => {
  it('Toshkent ichidagi nuqta — hudud koordinatadan, shahar nomi bir xil', () => {
    const r = parseNominatim(41.3111, 69.2797, {
      address: {
        state: 'Tashkent',
        city: 'Tashkent',
        city_district: 'Yunusobod tumani',
        road: 'Amir Temur shoh ko‘chasi',
        house_number: '108',
      },
    });
    expect(r.regionSlug).toBe('toshkent-shahri');
    expect(r.inTashkentCity).toBe(true);
    expect(r.region).toBe('Toshkent shahri');
    expect(r.city).toBe('Toshkent');
    expect(r.label).toBe('Amir Temur shoh ko‘chasi, 108, Yunusobod tumani, Toshkent');
  });

  it('tuman `district` maydonida kelsa ham o`qiladi', () => {
    const r = parseNominatim(41.3111, 69.2797, {
      address: { district: 'Yunusobod Tumani', city: 'Qashqar mahalla' },
    });
    expect(r.district).toBe('Yunusobod Tumani');
    expect(r.city).toBe('Toshkent');
  });

  it('viloyat nuqtasi — hudud matndan', () => {
    const r = parseNominatim(39.6542, 66.9597, {
      address: { state: 'Samarqand viloyati', city: 'Samarqand', road: 'Registon ko‘chasi' },
    });
    expect(r.regionSlug).toBe('samarqand');
    expect(r.inTashkentCity).toBe(false);
    expect(r.house).toBe('');
  });

  it('xizmat javob bermasa ham hudud koordinatadan aniqlanadi', () => {
    const r = parseNominatim(41.3, 69.24, null);
    expect(r.regionSlug).toBe('toshkent-shahri');
    expect(r.street).toBe('');
    expect(r.label).toBe('Toshkent');
  });
});
