import { describe, expect, it } from 'vitest';

import { wouldCreateCycle } from './category-parent.ts';

// ayollar ── ayollar-kiyim ── ayollar-kiyim-yozgi
const LINKS = [
  { id: 'ayollar', parentId: null },
  { id: 'ayollar-kiyim', parentId: 'ayollar' },
  { id: 'ayollar-kiyim-yozgi', parentId: 'ayollar-kiyim' },
  { id: 'erkaklar', parentId: null },
];

describe('wouldCreateCycle', () => {
  it('o`z ichiga ko`chirib bo`lmaydi', () => {
    expect(wouldCreateCycle(LINKS, 'ayollar', 'ayollar')).toBe(true);
  });

  it('o`z avlodi ichiga ko`chirib bo`lmaydi', () => {
    expect(wouldCreateCycle(LINKS, 'ayollar', 'ayollar-kiyim-yozgi')).toBe(true);
  });

  it('boshqa bo`limga ko`chirish mumkin', () => {
    expect(wouldCreateCycle(LINKS, 'ayollar-kiyim', 'erkaklar')).toBe(false);
  });

  it('ildizga chiqarish — halqa emas', () => {
    expect(wouldCreateCycle(LINKS, 'ayollar-kiyim', null)).toBe(false);
  });

  it('bazadagi mavjud halqada osilib qolmaydi', () => {
    const broken = [
      { id: 'a', parentId: 'b' },
      { id: 'b', parentId: 'a' },
    ];
    expect(wouldCreateCycle(broken, 'x', 'a')).toBe(true);
  });
});
