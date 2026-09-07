import { describe, expect, it } from 'vitest';

import { orderOwnerKey, scopeIdempotencyKey } from './idempotency';

describe('scopeIdempotencyKey', () => {
  it('bir xil egaga bir xil kalit — bir xil natija (takroriy so‘rov tanaladi)', () => {
    const a = scopeIdempotencyKey('abc-123', 'user-1');
    const b = scopeIdempotencyKey('abc-123', 'user-1');
    expect(a).toBe(b);
  });

  it('TURLI egalarda bir xil klient kaliti TO‘QNASHMAYDI', () => {
    // Bu asosiy xavfsizlik xossasi: `Order.idempotencyKey` global UNIQUE.
    // Xom kalit saqlansa, ikkinchi mijozning buyurtmasi rad etilardi va u
    // birinchisining javobini ko'rib qolishi mumkin edi.
    const mine = scopeIdempotencyKey('same-key', 'user-1');
    const theirs = scopeIdempotencyKey('same-key', 'user-2');
    expect(mine).not.toBe(theirs);
  });

  it('turli kalit — turli natija', () => {
    expect(scopeIdempotencyKey('key-1', 'user-1')).not.toBe(scopeIdempotencyKey('key-2', 'user-1'));
  });

  it('natija sha256 hex (64 belgi) — xom kalit bazaga tushmaydi', () => {
    const out = scopeIdempotencyKey('abc-123', 'user-1');
    expect(out).toMatch(/^[0-9a-f]{64}$/);
    expect(out).not.toContain('abc-123');
  });

  it('ajratuvchi tufayli bo‘laklar chalkashmaydi', () => {
    // "ab" + ":" + "c"  va  "a" + ":" + "bc" bir xil bo'lib qolmasligi kerak
    expect(scopeIdempotencyKey('c', 'ab')).not.toBe(scopeIdempotencyKey('bc', 'a'));
  });
});

describe('orderOwnerKey', () => {
  it('login foydalanuvchi — userId', () => {
    expect(orderOwnerKey('user-1', '+998901234567')).toBe('user-1');
  });

  it('mehmon — telefon raqami prefiks bilan', () => {
    expect(orderOwnerKey(null, '+998901234567')).toBe('guest:+998901234567');
    expect(orderOwnerKey(undefined, '+998901234567')).toBe('guest:+998901234567');
  });

  it('mehmon telefonidagi ortiqcha bo‘shliq e‘tiborga olinmaydi', () => {
    expect(orderOwnerKey(null, '  +998901234567  ')).toBe('guest:+998901234567');
  });

  it('mehmon kaliti userId bilan chalkashmaydi', () => {
    // Foydalanuvchi id'si "guest:" bilan boshlanmaydi (UUID), lekin
    // prefiks baribir ikki fazoni ajratib turadi.
    expect(orderOwnerKey(null, 'user-1')).not.toBe(orderOwnerKey('user-1', 'x'));
  });
});
