// Kategoriya daraxti — sof funksiyalar (Prisma'siz, test qilinadi).
//
// Do'kon ikki darajali: yuqorida bo'limlar (Ayollar, Erkaklar, Bolalar,
// Maishiy texnika...), ichida turlar (Ayollar › Kiyim). Mahsulot odatda
// ichki turga bog'lanadi. Shuning uchun:
//   • bo'lim tanlansa — uning va BARCHA ichki turlarining mahsulotlari;
//   • bo'limdagi son — ichki turlardagi TAKRORLANMAGAN mahsulotlar soni
//     (bir mahsulot ikki turda bo'lsa, bir marta sanaladi).
// Aks holda bo'lim 0 ta mahsulotli bo'lib ko'rinar va do'kondan yashirinardi.

import type { LocalizedText } from './mock-data';

export interface CategoryNode {
  id: string;
  slug: string;
  parentId: string | null;
  name: LocalizedText;
  iconUrl: string | null;
  position: number;
}

export interface CategorySummary {
  id: string;
  slug: string;
  name: LocalizedText;
  iconUrl: string | null;
  /** Shu kategoriya va ichidagilardagi mahsulotlarning HAQIQIY soni. */
  productCount: number;
  /** Ichki turlar (bo'sh bo'lishi mumkin). */
  children: CategorySummary[];
}

function childrenIndex(nodes: CategoryNode[]): Map<string | null, CategoryNode[]> {
  const byParent = new Map<string | null, CategoryNode[]>();
  const ids = new Set(nodes.map((n) => n.id));
  for (const node of nodes) {
    // Ota-kategoriya o'chirilgan/nofaol bo'lsa — bola ildiz sifatida
    // ko'rinadi, yo'qolib qolmaydi.
    const parent = node.parentId && ids.has(node.parentId) ? node.parentId : null;
    const list = byParent.get(parent) ?? [];
    list.push(node);
    byParent.set(parent, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.position - b.position || a.slug.localeCompare(b.slug));
  }
  return byParent;
}

/**
 * Kategoriya va uning barcha avlodlari id'lari. Slug topilmasa — `null`.
 *
 * Bazada tasodifiy halqa (A → B → A) bo'lsa ham to'xtaydi.
 */
export function descendantIds(nodes: CategoryNode[], slug: string): string[] | null {
  const root = nodes.find((n) => n.slug === slug);
  if (!root) return null;
  const byParent = childrenIndex(nodes);
  const seen = new Set<string>();
  const stack = [root.id];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const child of byParent.get(id) ?? []) stack.push(child.id);
  }
  return [...seen];
}

/**
 * Ildizlardan boshlanadigan daraxt, sonlar yuqoriga yig'ilgan holda.
 *
 * @param productsByCategory kategoriya id → unga TO'G'RIDAN-TO'G'RI
 *   bog'langan ko'rinadigan mahsulotlar id'lari.
 */
export function buildCategoryTree(
  nodes: CategoryNode[],
  productsByCategory: Map<string, Set<string>>,
): CategorySummary[] {
  const byParent = childrenIndex(nodes);
  const visiting = new Set<string>();

  function build(node: CategoryNode): { summary: CategorySummary; products: Set<string> } {
    visiting.add(node.id);
    const products = new Set(productsByCategory.get(node.id) ?? []);
    const children: CategorySummary[] = [];
    for (const child of byParent.get(node.id) ?? []) {
      if (visiting.has(child.id)) continue; // halqa
      const built = build(child);
      children.push(built.summary);
      for (const p of built.products) products.add(p);
    }
    visiting.delete(node.id);
    return {
      summary: {
        id: node.id,
        slug: node.slug,
        name: node.name,
        iconUrl: node.iconUrl,
        productCount: products.size,
        children,
      },
      products,
    };
  }

  return (byParent.get(null) ?? []).map((root) => build(root).summary);
}

/** Daraxtni tekis ro'yxatga yoyadi (ota birinchi). */
export function flattenTree(roots: CategorySummary[]): CategorySummary[] {
  const out: CategorySummary[] = [];
  const walk = (list: CategorySummary[]) => {
    for (const c of list) {
      out.push(c);
      walk(c.children);
    }
  };
  walk(roots);
  return out;
}

/** Mahsuloti yo'q tugunlarni olib tashlaydi (har darajada). */
export function pruneEmpty(roots: CategorySummary[]): CategorySummary[] {
  return roots
    .filter((c) => c.productCount > 0)
    .map((c) => ({ ...c, children: pruneEmpty(c.children) }));
}

/**
 * Slug bo'yicha tugun va uning ildizi (bo'lim). Topilmasa `null`.
 * Katalog sarlavhasi va ikkinchi qatordagi turlar uchun.
 */
export function findInTree(
  roots: CategorySummary[],
  slug: string,
): { node: CategorySummary; root: CategorySummary } | null {
  for (const root of roots) {
    if (root.slug === slug) return { node: root, root };
    const hit = flattenTree(root.children).find((c) => c.slug === slug);
    if (hit) return { node: hit, root };
  }
  return null;
}
