import { describe, expect, it } from 'vitest';

import {
  botLocale,
  checkContact,
  hashLoginToken,
  isLoginToken,
  newLoginCode,
  newLoginToken,
  parseStartPayload,
  secretMatches,
} from './login';

describe('token va kod', () => {
  it('token Telegram start parametriga sig`adi va tekshiruvdan o`tadi', () => {
    const token = newLoginToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isLoginToken(token)).toBe(true);
    expect(newLoginToken()).not.toBe(token);
  });

  it('noto`g`ri tokenlar rad etiladi', () => {
    for (const v of ['', 'abc', 'a'.repeat(44), 'a'.repeat(42) + '!', 123, null]) {
      expect(isLoginToken(v)).toBe(false);
    }
  });

  it('xesh barqaror, token o`zi emas', () => {
    const token = newLoginToken();
    expect(hashLoginToken(token)).toBe(hashLoginToken(token));
    expect(hashLoginToken(token)).not.toContain(token);
  });

  it('kod 4 xonali', () => {
    for (let i = 0; i < 50; i++) expect(newLoginCode()).toMatch(/^\d{4}$/);
  });
});

describe('parseStartPayload', () => {
  it.each([
    ['/start abc', 'abc'],
    ['/start@SellobayBot abc', 'abc'],
    ['/start', null],
    ['  /start  ', null],
    ['salom', undefined],
    ['/help', undefined],
    [undefined, undefined],
  ])('%s', (text, out) => expect(parseStartPayload(text)).toBe(out));
});

describe('checkContact — faqat o`z raqami', () => {
  it('o`z kontakti, O`zbekiston raqami — qabul', () => {
    expect(checkContact({ phone_number: '998901234567', user_id: 42 }, 42)).toEqual({
      ok: true,
      phone: '+998901234567',
    });
    expect(checkContact({ phone_number: '+998 90 123 45 67', user_id: 42 }, 42)).toEqual({
      ok: true,
      phone: '+998901234567',
    });
  });

  it('begona kontakt (qo`lda yuborilgan) — rad', () => {
    expect(checkContact({ phone_number: '998901234567', user_id: 7 }, 42)).toEqual({
      ok: false,
      reason: 'not-own',
    });
    expect(checkContact({ phone_number: '998901234567' }, 42)).toEqual({
      ok: false,
      reason: 'not-own',
    });
  });

  it('chet el raqami — rad', () => {
    expect(checkContact({ phone_number: '79161234567', user_id: 42 }, 42)).toEqual({
      ok: false,
      reason: 'not-uz',
    });
  });
});

describe('boshqa', () => {
  it('bot tili', () => {
    expect(botLocale('ru')).toBe('ru');
    expect(botLocale('en-GB')).toBe('en');
    expect(botLocale('uz')).toBe('uz');
    expect(botLocale(undefined)).toBe('uz');
  });

  it('webhook siri', () => {
    expect(secretMatches('abc', 'abc')).toBe(true);
    expect(secretMatches('abd', 'abc')).toBe(false);
    expect(secretMatches('ab', 'abc')).toBe(false);
    expect(secretMatches(null, 'abc')).toBe(false);
    expect(secretMatches('', '')).toBe(false);
  });
});
