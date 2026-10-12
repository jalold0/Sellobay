import { describe, expect, it } from 'vitest';

import { isOwnPublicImageUrl } from './public-url.ts';

describe('isOwnPublicImageUrl', () => {
  it('bizning Blob do‘konimizdagi tovar rasmi — o‘tadi', () => {
    expect(
      isOwnPublicImageUrl(
        'https://abc123.public.blob.vercel-storage.com/products/2026-10/products-x1.webp',
      ),
    ).toBe(true);
  });
  it('tashqi sayt, http, boshqa papka yoki axlat — rad', () => {
    for (const url of [
      'https://evil.example.com/products/a.jpg',
      'http://abc.public.blob.vercel-storage.com/products/a.jpg',
      'https://abc.public.blob.vercel-storage.com/receipts/a.jpg',
      'https://public.blob.vercel-storage.com.evil.com/products/a.jpg',
      'not a url',
    ]) {
      expect(isOwnPublicImageUrl(url)).toBe(false);
    }
  });
});
