import { describe, expect, it } from 'vitest';

import { decideOtpLogin, otpHashEquals, otpSendRetryAfter } from './otp-login';

const verified = new Date('2026-01-01T00:00:00Z');

describe('decideOtpLogin (audit SEC-04)', () => {
  it('raqamli hisob yo`q — yangi hisob', () => {
    expect(decideOtpLogin(null)).toBe('create');
  });

  it('raqami tasdiqlangan faol hisob — kirish', () => {
    expect(decideOtpLogin({ status: 'ACTIVE', phoneVerifiedAt: verified })).toBe('login');
  });

  it('raqam tasdiqlanmagan hisobda — o`sha hisobga KIRITILMAYDI', () => {
    // Hujumchi qurbonning raqamini profiliga yozgan holat.
    expect(decideOtpLogin({ status: 'ACTIVE', phoneVerifiedAt: null })).toBe('release-and-create');
    expect(decideOtpLogin({ status: 'PENDING', phoneVerifiedAt: null })).toBe('release-and-create');
  });

  it('tasdiq kutayotgan hisob SMS kod bilan faollashmaydi', () => {
    expect(decideOtpLogin({ status: 'PENDING', phoneVerifiedAt: verified })).toBe('reject-pending');
  });

  it('bloklangan/o`chirilgan hisob — raqam tasdiqlanmagan bo`lsa ham rad', () => {
    expect(decideOtpLogin({ status: 'BLOCKED', phoneVerifiedAt: verified })).toBe('reject-blocked');
    expect(decideOtpLogin({ status: 'DELETED', phoneVerifiedAt: null })).toBe('reject-blocked');
  });
});

describe('otpSendRetryAfter (audit SEC-05)', () => {
  const now = new Date('2026-10-17T12:00:00Z');
  const ago = (sec: number) => new Date(now.getTime() - sec * 1000);

  it('chegaradan past — ruxsat', () => {
    expect(otpSendRetryAfter([], now)).toBeNull();
    expect(otpSendRetryAfter([ago(100), ago(900), ago(1800), ago(2700)], now)).toBeNull();
  });

  it('soatiga 5 ta — eng eskisi soatdan chiqquncha kutish', () => {
    const sent = [ago(3000), ago(2400), ago(1800), ago(1200), ago(600)];
    expect(otpSendRetryAfter(sent, now)).toBe(600);
  });

  it('kuniga 10 ta — soatlik chegara bo`sh bo`lsa ham rad', () => {
    const sent = Array.from({ length: 10 }, (_, i) => ago(2 * 3600 + i * 3600));
    const retry = otpSendRetryAfter(sent, now);
    expect(retry).not.toBeNull();
    // Eng eski (11 soat oldingi) yuborish 24 soatdan chiqqanda: 13 soat.
    expect(retry).toBe(13 * 3600);
  });

  it('oynadan tashqaridagi eski yuborishlar hisoblanmaydi', () => {
    const sent = Array.from({ length: 12 }, (_, i) => ago(25 * 3600 + i));
    expect(otpSendRetryAfter(sent, now)).toBeNull();
  });
});

describe('otpHashEquals', () => {
  it('teng / teng emas / uzunlik farqi / bo`sh', () => {
    expect(otpHashEquals('ab12', 'ab12')).toBe(true);
    expect(otpHashEquals('ab12', 'ab13')).toBe(false);
    expect(otpHashEquals('ab12', 'ab1234')).toBe(false);
    expect(otpHashEquals('', '')).toBe(false);
  });
});
