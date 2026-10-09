import { describe, expect, it } from 'vitest';

import { ApiDomainError, isApiDomainError } from './error.ts';
import { apiFailureSchema, apiResponseSchema, apiSuccessSchema } from './envelope.ts';
import { z } from './zod.ts';

const payload = z.object({ id: z.string(), count: z.number() });

describe('javob konverti', () => {
  it('muvaffaqiyat — `data` sxemasi tekshiriladi', () => {
    const ok = apiSuccessSchema(payload).safeParse({ success: true, data: { id: 'a', count: 1 } });
    const bad = apiSuccessSchema(payload).safeParse({ success: true, data: { id: 'a' } });

    expect(ok.success).toBe(true);
    expect(bad.success).toBe(false);
  });

  it('xato konverti — `success: false`, kod va xabar majburiy', () => {
    const ok = apiFailureSchema.safeParse({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Topilmadi' },
      requestId: 'r1',
    });
    const missingCode = apiFailureSchema.safeParse({
      success: false,
      error: { message: 'Topilmadi' },
    });

    expect(ok.success).toBe(true);
    expect(missingCode.success).toBe(false);
  });

  it('birlashgan sxema ikkala shaklni qabul qiladi, aralash shaklni rad etadi', () => {
    const schema = apiResponseSchema(payload);

    expect(schema.safeParse({ success: true, data: { id: 'a', count: 1 } }).success).toBe(true);
    expect(schema.safeParse({ success: false, error: { code: 'X', message: 'y' } }).success).toBe(
      true,
    );
    // `success: true` bo'lib `error` kelsa — ikkalasiga ham mos emas.
    expect(schema.safeParse({ success: true, error: { code: 'X', message: 'y' } }).success).toBe(
      false,
    );
  });
});

describe('ApiDomainError', () => {
  it('status, kod va maydon xatolari saqlanadi', () => {
    const e = new ApiDomainError(409, 'STATE_CHANGED', 'Holat o`zgargan', { status: 'eskirgan' });

    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('ApiDomainError');
    expect([e.status, e.code, e.fields]).toEqual([409, 'STATE_CHANGED', { status: 'eskirgan' }]);
  });

  it('isApiDomainError — boshqa paket nusxasini ham (duck typing) taniydi', () => {
    expect(isApiDomainError(new ApiDomainError(400, 'VALIDATION', 'x'))).toBe(true);
    expect(isApiDomainError({ status: 404, code: 'NOT_FOUND', message: 'x' })).toBe(true);
    expect(isApiDomainError(new Error('oddiy'))).toBe(false);
    expect(isApiDomainError(null)).toBe(false);
    expect(isApiDomainError({ status: '404', code: 'NOT_FOUND', message: 'x' })).toBe(false);
  });
});
