import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MARKETPLACE_SETTINGS,
  isPayoutDay,
  nextPayoutDate,
  resolveMarketplaceSettings,
  settleItem,
  shipmentDeadline,
} from './marketplace-settings.ts';

describe('resolveMarketplaceSettings', () => {
  it('bo‘sh yoki buzuq — standart', () => {
    expect(resolveMarketplaceSettings(null)).toEqual(DEFAULT_MARKETPLACE_SETTINGS);
    expect(
      resolveMarketplaceSettings({ commissionPct: { FBS: -5, FBO: 'x' }, payoutDays: [0, 40] }),
    ).toEqual(DEFAULT_MARKETPLACE_SETTINGS);
  });
  it('to‘g‘ri farqlar qo‘llanadi, kunlar tartiblanadi', () => {
    const s = resolveMarketplaceSettings({
      commissionPct: { FBS: 8 },
      feePerUnit: { FBO: 7000 },
      payoutDays: [16, 1, 16],
    });
    expect(s.commissionPct).toEqual({ FBS: 8, FBO: 12 });
    expect(s.feePerUnit).toEqual({ FBS: 0, FBO: 7000 });
    expect(s.payoutDays).toEqual([1, 16]);
  });
});

describe('settleItem', () => {
  it('FBS: 10% komissiya, xizmat haqisiz', () => {
    expect(settleItem('250000.00', 2, 'FBS', DEFAULT_MARKETPLACE_SETTINGS)).toEqual({
      sale: '250000.00',
      commission: '25000.00',
      fee: '0.00',
      net: '225000.00',
    });
  });
  it('FBO: 12% + har dona 5000', () => {
    expect(settleItem('100000', 3, 'FBO', DEFAULT_MARKETPLACE_SETTINGS)).toEqual({
      sale: '100000.00',
      commission: '12000.00',
      fee: '15000.00',
      net: '73000.00',
    });
  });
  it('komissiya tiyingacha yaxlitlanadi (float xatosiz)', () => {
    const s = resolveMarketplaceSettings({ commissionPct: { FBS: 7.5 } });
    expect(settleItem('333.33', 1, 'FBS', s).commission).toBe('25.00');
  });
});

describe('to‘lov kunlari (Toshkent)', () => {
  const days = [1, 16];
  it('keyingi to‘lov kuni', () => {
    // 10-oktyabr Toshkent → 16-oktyabr
    expect(nextPayoutDate(new Date('2026-10-10T10:00:00Z'), days).toISOString()).toBe(
      '2026-10-15T19:00:00.000Z',
    );
    // 20-oktyabr → 1-noyabr
    expect(nextPayoutDate(new Date('2026-10-20T10:00:00Z'), days).toISOString()).toBe(
      '2026-10-31T19:00:00.000Z',
    );
  });
  it('UTC 19:30 15-oktyabr — Toshkentda allaqachon 16-oktyabr, to‘lov kuni', () => {
    expect(isPayoutDay(new Date('2026-10-15T19:30:00Z'), days)).toBe(true);
    expect(isPayoutDay(new Date('2026-10-15T18:30:00Z'), days)).toBe(false);
  });
  it('dekabrdan keyin yanvar', () => {
    expect(nextPayoutDate(new Date('2026-12-20T10:00:00Z'), days).toISOString()).toBe(
      '2026-12-31T19:00:00.000Z',
    );
  });
});

describe('shipmentDeadline', () => {
  it('FBS 48 soat', () => {
    expect(
      shipmentDeadline(
        'FBS',
        DEFAULT_MARKETPLACE_SETTINGS,
        new Date('2026-10-13T08:00:00Z'),
      ).toISOString(),
    ).toBe('2026-10-15T08:00:00.000Z');
  });
});
