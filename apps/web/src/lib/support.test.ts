import { describe, expect, it } from 'vitest';

import { hasSupport, socialLinks, supportContacts, telegramHandle, telHref } from './support';

describe('supportContacts (audit TRU-01)', () => {
  it('sozlanmagan kanal — null (soxta qiymat yo`q)', () => {
    const c = supportContacts({});
    expect(c).toEqual({ phone: null, email: null, telegram: null });
    expect(hasSupport(c)).toBe(false);
  });

  it('ENV dan o`qiydi, bo`sh joylarni tashlaydi', () => {
    const c = supportContacts({
      SUPPORT_PHONE: ' +998 90 123 45 67 ',
      SUPPORT_EMAIL: 'help@sellobay.uz',
      SUPPORT_TELEGRAM: 'https://t.me/sellobay_support',
    });
    expect(c).toEqual({
      phone: '+998 90 123 45 67',
      email: 'help@sellobay.uz',
      telegram: 'sellobay_support',
    });
  });
});

describe('telegramHandle', () => {
  it.each([
    ['@sellobay_support', 'sellobay_support'],
    ['sellobay_support', 'sellobay_support'],
    ['https://t.me/sellobay_support/', 'sellobay_support'],
    ['t.me/sellobay_support', 'sellobay_support'],
  ])('%s', (raw, out) => expect(telegramHandle(raw)).toBe(out));

  it.each(['https://t.me/', '', 'a b', 'https://evil.com/x'])('yaroqsiz: %s', (raw) =>
    expect(telegramHandle(raw)).toBeNull(),
  );
});

describe('socialLinks', () => {
  it('faqat profil havolasi — sayt bosh sahifasi qabul qilinmaydi', () => {
    const s = socialLinks({
      SOCIAL_INSTAGRAM: 'https://instagram.com',
      SOCIAL_FACEBOOK: 'https://facebook.com/sellobay',
      SOCIAL_YOUTUBE: 'http://youtube.com/@sellobay',
    });
    expect(s.instagram).toBeNull();
    expect(s.facebook).toBe('https://facebook.com/sellobay');
    expect(s.youtube).toBeNull();
    expect(s.telegram).toBeNull();
  });
});

describe('telHref', () => {
  it('formatlashni olib tashlaydi, + qoladi', () => {
    expect(telHref('+998 (90) 123-45-67')).toBe('tel:+998901234567');
  });
});
