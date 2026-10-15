import { describe, expect, it } from 'vitest';

import {
  MAX_HANDOVER_ATTEMPTS,
  checkHandover,
  formatParcelCode,
  generateHandoverPin,
  generateParcelCode,
  handoverQrPayload,
  normalizeParcelCode,
  parcelQrPayload,
  parseScan,
} from './parcel-handover.ts';

/** Navbatma-navbat berilgan baytlarni qaytaradigan soxta manba. */
function fixedBytes(...chunks: number[][]) {
  let i = 0;
  return (length: number) => {
    const chunk = chunks[i++] ?? [];
    return Uint8Array.from({ length }, (_, k) => chunk[k] ?? 0);
  };
}

describe('generateParcelCode', () => {
  it('8 belgi, faqat Crockford alifbosidan', () => {
    const code = generateParcelCode(fixedBytes([0, 1, 10, 18, 31, 32, 255, 100]));
    expect(code).toBe('01AJZ0Z4');
    expect(normalizeParcelCode(code)).toBe(code);
  });

  it('haqiqiy tasodif bilan ham yaroqli kod beradi', () => {
    for (let n = 0; n < 50; n += 1) {
      expect(normalizeParcelCode(generateParcelCode())).not.toBeNull();
    }
  });
});

describe('generateHandoverPin', () => {
  it('4 raqam, oldidagi nollar saqlanadi', () => {
    expect(generateHandoverPin(fixedBytes([0, 7]))).toBe('0007');
  });

  it('60 000 dan kattasini tashlab, keyingisini oladi', () => {
    // 0xEA60 = 60 000 — tashlanadi; 0x04D2 = 1234.
    expect(generateHandoverPin(fixedBytes([0xea, 0x60], [0x04, 0xd2]))).toBe('1234');
  });
});

describe('normalizeParcelCode', () => {
  it.each([
    ['sb-7k3m-9qxz', '7K3M9QXZ'],
    ['7K3M 9QXZ', '7K3M9QXZ'],
    ['SB7K3M9QXZ', '7K3M9QXZ'],
    // Adashtiriladigan harflar: O → 0, I/L → 1.
    ['7K3MOQXL', '7K3M0QX1'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeParcelCode(input)).toBe(expected);
  });

  it.each(['', '7K3M9QX', '7K3M9QXZZ', '7K3M9QXU'])('yaroqsiz: %s', (input) => {
    expect(normalizeParcelCode(input)).toBeNull();
  });

  it('formatParcelCode bilan qayta o`qiladi', () => {
    expect(formatParcelCode('7K3M9QXZ')).toBe('SB-7K3M-9QXZ');
    expect(normalizeParcelCode(formatParcelCode('7K3M9QXZ'))).toBe('7K3M9QXZ');
  });
});

describe('parseScan', () => {
  it('yorliq QR`i — posilka', () => {
    expect(parseScan(parcelQrPayload('7K3M9QXZ'))).toEqual({
      kind: 'parcel',
      parcelCode: '7K3M9QXZ',
    });
  });

  it('mijoz QR`i — topshirish', () => {
    expect(parseScan(handoverQrPayload('7K3M9QXZ', '0420'))).toEqual({
      kind: 'handover',
      parcelCode: '7K3M9QXZ',
      pin: '0420',
    });
  });

  it('qo`lda terilgan kod — posilka', () => {
    expect(parseScan(' sb-7k3m-9qxz ')).toEqual({ kind: 'parcel', parcelCode: '7K3M9QXZ' });
  });

  it.each(['https://click.uz/pay?x=1', 'SBH1:7K3M9QXZ:12', 'SBH1:7K3M9QXZ', 'SBP1:'])(
    'begona yoki buzuq QR: %s',
    (raw) => {
      expect(parseScan(raw)).toBeNull();
    },
  );
});

describe('checkHandover', () => {
  const expected = { parcelCode: '7K3M9QXZ', pin: '0420', attempts: 0 };

  it('to`g`ri og`zaki kod', () => {
    expect(checkHandover(expected, { method: 'CODE', value: ' 0420 ' })).toEqual({ ok: true });
  });

  it('to`g`ri QR', () => {
    const value = handoverQrPayload('7K3M9QXZ', '0420');
    expect(checkHandover(expected, { method: 'QR', value })).toEqual({ ok: true });
  });

  it('boshqa posilkaning QR`i — kod to`g`ri bo`lsa ham rad', () => {
    const value = handoverQrPayload('AAAAAAAA', '0420');
    expect(checkHandover(expected, { method: 'QR', value })).toEqual({
      ok: false,
      reason: 'WRONG_PARCEL',
    });
  });

  it('noto`g`ri kod', () => {
    expect(checkHandover(expected, { method: 'CODE', value: '1111' })).toEqual({
      ok: false,
      reason: 'WRONG_PIN',
    });
  });

  it('yorliq QR`i topshirish uchun yaramaydi', () => {
    expect(checkHandover(expected, { method: 'QR', value: parcelQrPayload('7K3M9QXZ') })).toEqual({
      ok: false,
      reason: 'MALFORMED',
    });
  });

  it('urinishlar tugagach to`g`ri kod ham qabul qilinmaydi', () => {
    expect(
      checkHandover(
        { ...expected, attempts: MAX_HANDOVER_ATTEMPTS },
        { method: 'CODE', value: '0420' },
      ),
    ).toEqual({ ok: false, reason: 'LOCKED' });
  });
});
