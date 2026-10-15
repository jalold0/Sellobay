import { describe, expect, it } from 'vitest';

import {
  hasSupport,
  SELLOBAY_CHANNELS,
  socialLinks,
  supportContacts,
  telegramHandle,
  telHref,
} from './support';

describe('supportContacts (audit TRU-01)', () => {
  it('ENV sozlanmasa — Sellobay`ning rasmiy kanallari; rasmiysi yo`q kanal — null', () => {
    const c = supportContacts({});
    expect(c).toEqual({
      phone: SELLOBAY_CHANNELS.phone,
      email: SELLOBAY_CHANNELS.email,
      telegram: null,
    });
    expect(hasSupport(c)).toBe(true);
  });

  it('bo`sh ENV qiymati ham rasmiy kanalga tushadi', () => {
    const c = supportContacts({ SUPPORT_PHONE: '  ', SUPPORT_EMAIL: '' });
    expect(c.phone).toBe(SELLOBAY_CHANNELS.phone);
    expect(c.email).toBe(SELLOBAY_CHANNELS.email);
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
    // Yaroqsiz Instagram ENV — rasmiy profilga tushadi, bosh sahifaga emas.
    expect(s.instagram).toBe(SELLOBAY_CHANNELS.instagram);
    expect(s.facebook).toBe('https://facebook.com/sellobay');
    expect(s.youtube).toBeNull();
    expect(s.telegram).toBeNull();
  });

  it('ENV sozlanmasa — faqat rasmiy Instagram, qolgani yashirin', () => {
    expect(socialLinks({})).toEqual({
      instagram: 'https://www.instagram.com/sellobay.uz/',
      facebook: null,
      youtube: null,
      telegram: null,
    });
  });

  it('ENV dagi Instagram rasmiysidan ustun', () => {
    const s = socialLinks({ SOCIAL_INSTAGRAM: 'https://instagram.com/boshqa' });
    expect(s.instagram).toBe('https://instagram.com/boshqa');
  });
});

describe('telHref', () => {
  it('formatlashni olib tashlaydi, + qoladi', () => {
    expect(telHref('+998 (90) 123-45-67')).toBe('tel:+998901234567');
  });
});
