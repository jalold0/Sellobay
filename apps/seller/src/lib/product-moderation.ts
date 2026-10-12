// Admin moderatsiya qarorlarining sababi (AuditLog) — sotuvchi tovari yonida ko'rsatiladi.
// Admin `PATCH /api/products/[id]` reject/takedown'da sababni jurnalga yozadi.

import { prisma } from '@/lib/db';

export interface ModerationNote {
  action: 'reject' | 'takedown';
  reason: string;
  at: string;
}

/**
 * Har tovar uchun admin sababi — faqat tovar bo'yicha ENG OXIRGI jurnal yozuvi rad etish yoki
 * sotuvdan olish bo'lsa (sotuvchi keyin tahrirlab qayta yuborgan bo'lsa, eski sabab ko'rinmaydi).
 */
export async function lastProductModerationNotes(
  productIds: string[],
): Promise<Map<string, ModerationNote>> {
  const notes = new Map<string, ModerationNote>();
  if (productIds.length === 0) return notes;
  const rows = await prisma.auditLog.findMany({
    where: {
      resource: 'Product',
      resourceId: { in: productIds },
    },
    orderBy: { createdAt: 'desc' },
    select: { resourceId: true, action: true, meta: true, createdAt: true },
  });
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.resourceId || seen.has(row.resourceId)) continue;
    seen.add(row.resourceId);
    if (row.action !== 'product.reject' && row.action !== 'product.takedown') continue;
    const reason = (row.meta as { reason?: unknown } | null)?.reason;
    if (typeof reason !== 'string') continue;
    notes.set(row.resourceId, {
      action: row.action === 'product.takedown' ? 'takedown' : 'reject',
      reason,
      at: row.createdAt.toISOString(),
    });
  }
  return notes;
}
