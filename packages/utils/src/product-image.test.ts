import { describe, expect, it } from 'vitest';

import {
  PRODUCT_IMAGE_PLACEHOLDER,
  isRealProductImageUrl,
  picsumSeed,
  productImageBySeed,
  resolveProductImageUrl,
} from './product-image.ts';

const BLOB = 'https://abc123.public.blob.vercel-storage.com/products/2026-08/products-xY9.jpg';
const PICSUM = 'https://picsum.photos/seed/nike-air-max/800/800';

describe('picsumSeed', () => {
  it('picsum manzilidan seed ajratadi', () => {
    expect(picsumSeed(PICSUM)).toBe('nike-air-max');
  });

  it('boshqa manzillarda null qaytaradi', () => {
    expect(picsumSeed(BLOB)).toBeNull();
    expect(picsumSeed('')).toBeNull();
    expect(picsumSeed(null)).toBeNull();
    expect(picsumSeed(undefined)).toBeNull();
  });
});

describe('isRealProductImageUrl', () => {
  it('sotuvchi yuklagan rasmni haqiqiy deb biladi', () => {
    expect(isRealProductImageUrl(BLOB)).toBe(true);
  });

  it('picsum va bo`shni haqiqiy deb bilmaydi', () => {
    expect(isRealProductImageUrl(PICSUM)).toBe(false);
    expect(isRealProductImageUrl(null)).toBe(false);
  });
});

describe('resolveProductImageUrl', () => {
  it('haqiqiy rasmni o`zgartirmaydi', () => {
    expect(resolveProductImageUrl(BLOB, 'nike-air-max')).toBe(BLOB);
  });

  it('picsum seed`i repodagi rasmga aylanadi', () => {
    expect(resolveProductImageUrl(PICSUM, 'boshqa-slug')).toBe('/products/nike-air-max.jpg');
  });

  it('rasmi yo`q mahsulotda slug bo`yicha topadi', () => {
    expect(resolveProductImageUrl(null, 'zara-shirt')).toBe('/products/zara-shirt.jpg');
  });

  it('noma`lum mahsulotda placeholder beradi', () => {
    expect(resolveProductImageUrl(null, 'yangi-mahsulot')).toBe(PRODUCT_IMAGE_PLACEHOLDER);
  });

  it('baseUrl berilsa absolut manzil qaytaradi — mobil shuni talab qiladi', () => {
    expect(resolveProductImageUrl(null, 'zara-shirt', 'https://sellobay.uz')).toBe(
      'https://sellobay.uz/products/zara-shirt.jpg',
    );
  });

  it('baseUrl oxiridagi ortiqcha slash ikkilanmaydi', () => {
    expect(resolveProductImageUrl(null, 'zara-shirt', 'https://sellobay.uz/')).toBe(
      'https://sellobay.uz/products/zara-shirt.jpg',
    );
  });

  it('haqiqiy rasmga baseUrl qo`shilmaydi', () => {
    expect(resolveProductImageUrl(BLOB, 'x', 'https://sellobay.uz')).toBe(BLOB);
  });
});

describe('productImageBySeed', () => {
  it('mock ekranlar uchun seed bo`yicha ishlaydi', () => {
    expect(productImageBySeed('gucci-bag')).toBe('/products/gucci-bag.jpg');
    expect(productImageBySeed('yo`q-narsa')).toBe(PRODUCT_IMAGE_PLACEHOLDER);
  });
});
