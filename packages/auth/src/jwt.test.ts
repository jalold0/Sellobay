import { describe, expect, it } from 'vitest';

import { signAccessToken, signRefreshToken, verifyToken, type AccessPayload } from './jwt.ts';

const CFG = { secret: 'test-sir-uzunligi-yetarli', expiresIn: '15m' };

describe('JWT siri', () => {
  // Regressiya: JWT_SECRET qo'yilmagan muhitda chaqiruvchilar bo'sh satr
  // uzatardi va token BO'SH kalit bilan imzolanardi. Bo'sh kalit sir emas —
  // uni hamma biladi, ya'ni istalgan odam token yasay olardi. Ustiga-ustak
  // Node runtime bunday kalitni qabul qilar, Edge runtime esa rad etardi:
  // login ishlab turgandek ko'rinib, middleware har safar login'ga qaytarardi.
  it("bo'sh sir bilan access token imzolamaydi", async () => {
    await expect(signAccessToken({ sub: 'u1', roles: [] }, { ...CFG, secret: '' })).rejects.toThrow(
      /JWT siri bo/,
    );
  });

  it("bo'sh sir bilan refresh token imzolamaydi", async () => {
    await expect(
      signRefreshToken({ sub: 'u1', jti: 'j1', family: 'f1' }, { ...CFG, secret: '' }),
    ).rejects.toThrow(/JWT siri bo/);
  });

  it("bo'sh sir bilan tokenni tekshirmaydi", async () => {
    const token = await signAccessToken({ sub: 'u1', roles: [] }, CFG);
    await expect(verifyToken(token, '')).rejects.toThrow(/JWT siri bo/);
  });

  it('haqiqiy sir bilan imzolab, qaytarib o`qiydi', async () => {
    const token = await signAccessToken({ sub: 'u1', roles: ['ADMIN'], sid: 's1' }, CFG);
    const payload = await verifyToken<AccessPayload>(token, CFG.secret);
    expect(payload.sub).toBe('u1');
    expect(payload.roles).toEqual(['ADMIN']);
    expect(payload.sid).toBe('s1');
  });

  it('boshqa sir bilan imzolangan tokenni qabul qilmaydi', async () => {
    const token = await signAccessToken({ sub: 'u1', roles: [] }, CFG);
    await expect(verifyToken(token, 'boshqa-sir-butunlay')).rejects.toThrow();
  });
});
