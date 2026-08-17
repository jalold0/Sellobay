import { describe, expect, it } from 'vitest';

import { parseSourcingLink } from './sourcing-link.ts';

describe('parseSourcingLink — qo‘llab-quvvatlanadigan platformalar', () => {
  it('Taobao klassik havola', () => {
    const r = parseSourcingLink('https://item.taobao.com/item.htm?id=654321987654&spm=a1z10');
    expect(r).toMatchObject({
      ok: true,
      platform: 'TAOBAO',
      itemId: '654321987654',
      needsResolve: false,
    });
  });

  it('Tmall havolasi TMALL deb aniqlanadi', () => {
    const r = parseSourcingLink('https://detail.tmall.com/item.htm?id=123456789&skuId=99');
    expect(r).toMatchObject({ ok: true, platform: 'TMALL', itemId: '123456789' });
  });

  it('1688 — /offer/<id>.html yo‘l ko‘rinishi', () => {
    const r = parseSourcingLink('https://detail.1688.com/offer/645123456789.html');
    expect(r).toMatchObject({ ok: true, platform: 'ALIBABA_1688', itemId: '645123456789' });
  });

  it('world.taobao.com/item/<id>.htm yo‘l ko‘rinishi', () => {
    const r = parseSourcingLink('https://world.taobao.com/item/987654321.htm');
    expect(r).toMatchObject({ ok: true, platform: 'TAOBAO', itemId: '987654321' });
  });

  it('mobil h5 havolasi', () => {
    const r = parseSourcingLink('https://h5.m.taobao.com/awp/core/detail.htm?id=555444333222');
    expect(r).toMatchObject({ ok: true, platform: 'TAOBAO', itemId: '555444333222' });
  });

  it('Weidian — itemID parametri', () => {
    const r = parseSourcingLink('https://weidian.com/item.html?itemID=4455667788');
    expect(r).toMatchObject({ ok: true, platform: 'WEIDIAN', itemId: '4455667788' });
  });
});

describe('parseSourcingLink — normalizatsiya', () => {
  it('tracking parametrlari tashlanadi (kanonik havola)', () => {
    const r = parseSourcingLink(
      'https://item.taobao.com/item.htm?spm=a217.1.2&id=112233445566&utm_source=wechat',
    );
    expect(r.ok && r.normalizedUrl).toBe('https://item.taobao.com/item.htm?id=112233445566');
  });

  it('protokolsiz kiritilgan havola ham qabul qilinadi', () => {
    const r = parseSourcingLink('item.taobao.com/item.htm?id=112233445566');
    expect(r).toMatchObject({ ok: true, itemId: '112233445566' });
  });

  it('bosh/oxirgi bo‘shliqlar kesiladi', () => {
    const r = parseSourcingLink('   https://item.taobao.com/item.htm?id=112233445566   ');
    expect(r.ok).toBe(true);
  });

  it('1688 kanonik havolasi /offer/ ko‘rinishida qaytadi', () => {
    const r = parseSourcingLink('https://m.1688.com/offer/645123456789.html?from=share');
    expect(r.ok && r.normalizedUrl).toBe('https://detail.1688.com/offer/645123456789.html');
  });
});

describe('parseSourcingLink — qisqa havolalar', () => {
  it('m.tb.cn — qabul qilinadi, lekin aniqlash kerak', () => {
    const r = parseSourcingLink('https://m.tb.cn/h.gk4Xy2z');
    expect(r).toMatchObject({
      ok: true,
      platform: 'TAOBAO',
      itemId: null,
      needsResolve: true,
    });
  });

  it('qr.1688.com — 1688 deb taxmin qilinadi', () => {
    const r = parseSourcingLink('https://qr.1688.com/share/abc123');
    expect(r).toMatchObject({ ok: true, platform: 'ALIBABA_1688', needsResolve: true });
  });
});

describe('parseSourcingLink — rad etiladigan holatlar', () => {
  it('bo‘sh satr', () => {
    expect(parseSourcingLink('')).toEqual({ ok: false, error: 'INVALID_URL' });
    expect(parseSourcingLink('   ')).toEqual({ ok: false, error: 'INVALID_URL' });
  });

  it('URL emas', () => {
    expect(parseSourcingLink('salom dunyo')).toEqual({ ok: false, error: 'INVALID_URL' });
  });

  it('nuqtasiz bitta so‘z — "sayt qo‘llanmaydi" emas, "havola noto‘g‘ri"', () => {
    // `https://salom` texnik jihatdan to'g'ri URL — lekin mijozga bu xabar chalg'ituvchi
    expect(parseSourcingLink('salom')).toEqual({ ok: false, error: 'INVALID_URL' });
    expect(parseSourcingLink('localhost')).toEqual({ ok: false, error: 'INVALID_URL' });
  });

  it('boshqa sayt (masalan Amazon)', () => {
    expect(parseSourcingLink('https://www.amazon.com/dp/B08N5WRWNW')).toEqual({
      ok: false,
      error: 'UNSUPPORTED_HOST',
    });
  });

  it('to‘g‘ri sayt, lekin tovar sahifasi emas', () => {
    expect(parseSourcingLink('https://www.taobao.com/list/product/shoes.htm')).toEqual({
      ok: false,
      error: 'NO_ITEM_ID',
    });
  });

  it('juda qisqa ID (6 raqamdan kam) qabul qilinmaydi', () => {
    expect(parseSourcingLink('https://item.taobao.com/item.htm?id=123')).toEqual({
      ok: false,
      error: 'NO_ITEM_ID',
    });
  });

  it('"taobao" so‘zi bor soxta domen o‘tmaydi', () => {
    expect(parseSourcingLink('https://taobao.com.evil.ru/item.htm?id=112233445566')).toEqual({
      ok: false,
      error: 'UNSUPPORTED_HOST',
    });
  });
});
