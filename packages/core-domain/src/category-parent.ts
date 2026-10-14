// Kategoriyaning ota-kategoriyasini almashtirish qoidasi.
//
// Daraxtda halqa bo'lmasligi kerak: kategoriya o'zining yoki o'z
// avlodining ichiga ko'chirilsa (Ayollar → Ayollar › Kiyim ichiga),
// katalog bo'limni topa olmay qoladi. Admin API shu tekshiruvdan o'tadi.

export interface ParentLink {
  id: string;
  parentId: string | null;
}

/**
 * [categoryId] ni [newParentId] ichiga ko'chirsa halqa hosil bo'ladimi.
 * `null` (ildizga chiqarish) hech qachon halqa emas.
 */
export function wouldCreateCycle(
  links: ParentLink[],
  categoryId: string,
  newParentId: string | null,
): boolean {
  if (newParentId === null) return false;
  const parentOf = new Map(links.map((l) => [l.id, l.parentId]));
  const seen = new Set<string>();
  // Yangi otadan yuqoriga chiqib boramiz: yo'lda o'zimiz uchrasak — halqa.
  let cursor: string | null | undefined = newParentId;
  while (cursor) {
    if (cursor === categoryId) return true;
    if (seen.has(cursor)) return true; // bazada allaqachon halqa bor
    seen.add(cursor);
    cursor = parentOf.get(cursor);
  }
  return false;
}
