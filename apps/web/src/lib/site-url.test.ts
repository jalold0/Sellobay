import { afterEach, describe, expect, it, vi } from 'vitest';

import { siteUrl } from './site-url';

describe('siteUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('aniq qo‘yilgan manzil — oxiridagi «/» siz', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.sellobay.uz/');
    expect(siteUrl()).toBe('https://www.sellobay.uz');
  });

  it('qo‘yilmagan bo‘lsa — Vercel prod domeni (sitemap localhost bo‘lmasin)', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'sellobay.uz');
    expect(siteUrl()).toBe('https://sellobay.uz');
  });

  it('lokal ishlab chiqish', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
    expect(siteUrl()).toBe('http://localhost:3000');
  });
});
