import { Prisma } from '@ecom/database';
import { describe, expect, it } from 'vitest';

import { serializeAddress } from './address-dto';

describe('serializeAddress', () => {
  it('Decimal koordinata — son (mobil ilova son kutadi)', () => {
    const out = serializeAddress({
      id: 'a1',
      latitude: new Prisma.Decimal('41.3111000'),
      longitude: new Prisma.Decimal('69.2797000'),
    });
    expect(out).toEqual({ id: 'a1', latitude: 41.3111, longitude: 69.2797 });
    expect(JSON.parse(JSON.stringify(out)).latitude).toBeTypeOf('number');
  });

  it('koordinatasiz manzil — null', () => {
    expect(serializeAddress({ id: 'a2', latitude: null, longitude: null })).toEqual({
      id: 'a2',
      latitude: null,
      longitude: null,
    });
  });
});
