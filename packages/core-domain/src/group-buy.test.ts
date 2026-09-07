import { describe, expect, it } from 'vitest';

import {
  canJoin,
  discountPercent,
  effectiveStatus,
  isExpired,
  isFull,
  msLeft,
  progressPercent,
  seatsLeft,
  statusAfterJoin,
  type GroupBuyState,
} from './group-buy.ts';

const NOW = new Date('2026-09-04T12:00:00.000Z');
const IN_1H = new Date('2026-09-04T13:00:00.000Z');
const AGO_1H = new Date('2026-09-04T11:00:00.000Z');

function state(over: Partial<GroupBuyState> = {}): GroupBuyState {
  return {
    status: 'OPEN',
    targetSize: 5,
    currentSize: 2,
    expiresAt: IN_1H,
    ...over,
  };
}

describe('isExpired', () => {
  it('muddat kelajakda — tugamagan', () => {
    expect(isExpired({ expiresAt: IN_1H }, NOW)).toBe(false);
  });

  it('muddat o‘tgan — tugagan', () => {
    expect(isExpired({ expiresAt: AGO_1H }, NOW)).toBe(true);
  });

  it('aynan muddat lahzasi — tugagan hisoblanadi', () => {
    expect(isExpired({ expiresAt: NOW }, NOW)).toBe(true);
  });
});

describe('isFull / seatsLeft / progressPercent', () => {
  it('joy bor', () => {
    expect(isFull(state({ currentSize: 4, targetSize: 5 }))).toBe(false);
    expect(seatsLeft(state({ currentSize: 4, targetSize: 5 }))).toBe(1);
  });

  it('to‘lgan', () => {
    expect(isFull(state({ currentSize: 5, targetSize: 5 }))).toBe(true);
    expect(seatsLeft(state({ currentSize: 5, targetSize: 5 }))).toBe(0);
  });

  it('targetSize‘dan oshib ketsa ham seatsLeft manfiy bo‘lmaydi', () => {
    expect(seatsLeft(state({ currentSize: 9, targetSize: 5 }))).toBe(0);
  });

  it('progress 0..100 oralig‘ida qoladi', () => {
    expect(progressPercent(state({ currentSize: 0, targetSize: 5 }))).toBe(0);
    expect(progressPercent(state({ currentSize: 2, targetSize: 5 }))).toBe(40);
    expect(progressPercent(state({ currentSize: 9, targetSize: 5 }))).toBe(100);
  });

  it('targetSize 0 bo‘lsa nolga bo‘lish yo‘q', () => {
    expect(progressPercent(state({ currentSize: 3, targetSize: 0 }))).toBe(0);
  });
});

describe('discountPercent', () => {
  it('100 000 → 65 000 = 35%', () => {
    expect(discountPercent(100_000, 65_000)).toBe(35);
  });

  it('guruh narxi yakka narxdan past bo‘lmasa — 0%', () => {
    expect(discountPercent(100_000, 100_000)).toBe(0);
    expect(discountPercent(100_000, 120_000)).toBe(0);
  });

  it('yakka narx 0 yoki noto‘g‘ri bo‘lsa — 0% (nolga bo‘lish yo‘q)', () => {
    expect(discountPercent(0, 50_000)).toBe(0);
    expect(discountPercent(Number.NaN, 50_000)).toBe(0);
  });
});

describe('canJoin', () => {
  it('ochiq, joy bor, a‘zo emas — ruxsat', () => {
    expect(canJoin(state(), { alreadyMember: false, now: NOW })).toBeNull();
  });

  it('allaqachon a‘zo — ALREADY_MEMBER (boshqa sabablardan ustun)', () => {
    expect(canJoin(state({ status: 'COMPLETED' }), { alreadyMember: true, now: NOW })).toBe(
      'ALREADY_MEMBER',
    );
  });

  it('status OPEN emas — NOT_OPEN', () => {
    expect(canJoin(state({ status: 'CANCELLED' }), { alreadyMember: false, now: NOW })).toBe(
      'NOT_OPEN',
    );
  });

  it('muddati o‘tgan — EXPIRED', () => {
    expect(canJoin(state({ expiresAt: AGO_1H }), { alreadyMember: false, now: NOW })).toBe(
      'EXPIRED',
    );
  });

  it('to‘lgan — FULL', () => {
    expect(canJoin(state({ currentSize: 5 }), { alreadyMember: false, now: NOW })).toBe('FULL');
  });
});

describe('statusAfterJoin', () => {
  it('oxirgi joy to‘lsa — COMPLETED', () => {
    expect(statusAfterJoin(state({ currentSize: 4, targetSize: 5 }))).toBe('COMPLETED');
  });

  it('joy qolsa — OPEN', () => {
    expect(statusAfterJoin(state({ currentSize: 3, targetSize: 5 }))).toBe('OPEN');
  });

  it('OPEN bo‘lmagan guruh statusi o‘zgarmaydi', () => {
    expect(statusAfterJoin(state({ status: 'CANCELLED', currentSize: 4 }))).toBe('CANCELLED');
  });
});

describe('effectiveStatus', () => {
  it('bazada OPEN, lekin muddati o‘tgan — mijozga EXPIRED', () => {
    expect(effectiveStatus(state({ expiresAt: AGO_1H }), NOW)).toBe('EXPIRED');
  });

  it('OPEN va muddati bor — OPEN', () => {
    expect(effectiveStatus(state(), NOW)).toBe('OPEN');
  });

  it('COMPLETED muddat o‘tgandan keyin ham COMPLETED qoladi', () => {
    expect(effectiveStatus(state({ status: 'COMPLETED', expiresAt: AGO_1H }), NOW)).toBe(
      'COMPLETED',
    );
  });
});

describe('msLeft', () => {
  it('qolgan vaqtni millisekundda qaytaradi', () => {
    expect(msLeft({ expiresAt: IN_1H }, NOW)).toBe(3_600_000);
  });

  it('muddat o‘tgan bo‘lsa 0 (manfiy emas)', () => {
    expect(msLeft({ expiresAt: AGO_1H }, NOW)).toBe(0);
  });
});
