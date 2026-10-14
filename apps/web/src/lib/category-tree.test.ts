import { describe, expect, it } from 'vitest';

import {
  buildCategoryTree,
  descendantIds,
  findInTree,
  flattenTree,
  pruneEmpty,
  type CategoryNode,
} from './category-tree';

const n = (id: string, parentId: string | null, position = 0): CategoryNode => ({
  id,
  slug: id,
  parentId,
  name: { uz: id, ru: id, en: id },
  iconUrl: null,
  position,
});

// ayollar ── ayollar-kiyim, ayollar-poyabzal
// erkaklar ── erkaklar-kiyim
// texnika (bo'sh)
const NODES = [
  n('erkaklar', null, 2),
  n('ayollar', null, 1),
  n('texnika', null, 3),
  n('ayollar-poyabzal', 'ayollar', 2),
  n('ayollar-kiyim', 'ayollar', 1),
  n('erkaklar-kiyim', 'erkaklar', 1),
];

const PRODUCTS = new Map([
  ['ayollar-kiyim', new Set(['p1', 'p2'])],
  // p2 ikki turda — bo'limda bir marta sanaladi.
  ['ayollar-poyabzal', new Set(['p2', 'p3'])],
  ['erkaklar-kiyim', new Set(['p4'])],
]);

describe('descendantIds', () => {
  it('bo`lim — o`zi va barcha ichki turlari', () => {
    expect(descendantIds(NODES, 'ayollar')?.sort()).toEqual(
      ['ayollar', 'ayollar-kiyim', 'ayollar-poyabzal'].sort(),
    );
  });

  it('ichki tur — faqat o`zi', () => {
    expect(descendantIds(NODES, 'ayollar-kiyim')).toEqual(['ayollar-kiyim']);
  });

  it('noma`lum slug — null', () => {
    expect(descendantIds(NODES, 'yoq')).toBeNull();
  });

  it('halqa bo`lsa ham to`xtaydi', () => {
    const loop = [n('a', 'b'), n('b', 'a')];
    expect(descendantIds(loop, 'a')?.sort()).toEqual(['a', 'b']);
  });
});

describe('buildCategoryTree', () => {
  const tree = buildCategoryTree(NODES, PRODUCTS);

  it('ildizlar va bolalar position bo`yicha', () => {
    expect(tree.map((c) => c.slug)).toEqual(['ayollar', 'erkaklar', 'texnika']);
    expect(tree[0]?.children.map((c) => c.slug)).toEqual(['ayollar-kiyim', 'ayollar-poyabzal']);
  });

  it('bo`lim soni — takrorlanmagan mahsulotlar', () => {
    expect(tree[0]?.productCount).toBe(3); // p1, p2, p3
    expect(tree[0]?.children[1]?.productCount).toBe(2);
    expect(tree[1]?.productCount).toBe(1);
    expect(tree[2]?.productCount).toBe(0);
  });

  it('ota-kategoriyasi yo`q tugun ildiz bo`lib chiqadi', () => {
    const orphan = buildCategoryTree([n('yetim', 'ochirilgan')], new Map());
    expect(orphan.map((c) => c.slug)).toEqual(['yetim']);
  });
});

describe('yordamchilar', () => {
  const tree = buildCategoryTree(NODES, PRODUCTS);

  it('pruneEmpty bo`sh bo`limni olib tashlaydi', () => {
    expect(pruneEmpty(tree).map((c) => c.slug)).toEqual(['ayollar', 'erkaklar']);
  });

  it('flattenTree — ota birinchi', () => {
    expect(flattenTree(tree).map((c) => c.slug)).toEqual([
      'ayollar',
      'ayollar-kiyim',
      'ayollar-poyabzal',
      'erkaklar',
      'erkaklar-kiyim',
      'texnika',
    ]);
  });

  it('findInTree ichki tur uchun bo`limni ham qaytaradi', () => {
    const hit = findInTree(tree, 'ayollar-poyabzal');
    expect(hit?.node.slug).toBe('ayollar-poyabzal');
    expect(hit?.root.slug).toBe('ayollar');
    expect(findInTree(tree, 'yoq')).toBeNull();
  });
});
