// Admin amallari jurnali (`AuditLog`).
//
// Model sxemada bor edi, lekin hech kim yozmasdi (audit Y13): kim sotuvchini tasdiqlagani,
// tovarni rad etgani, chekni qabul qilgani yoki buyurtmani bekor qilgani noma'lum qolardi.
//
// Holat o'zgarishi bilan BIR tranzaksiyada yoziladi (`tx` beriladi): amal bekor bo'lsa,
// jurnalda ham yolg'on yozuv qolmaydi.

import { requestMeta } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

import type { Prisma } from '@ecom/database';

export type AuditAction =
  | 'seller.approve'
  | 'seller.reject'
  | 'seller.suspend'
  | 'seller.reactivate'
  | 'product.approve'
  | 'product.reject'
  | 'product.takedown'
  | 'product.create'
  | 'payment.verify'
  | 'payment.reject'
  | 'order.status'
  | 'order.cancel'
  | 'order.refund'
  | 'order.carrier'
  | 'return.receive'
  | 'return.dispatch'
  | 'shipment.receive'
  | 'marketplace.settings.update'
  | 'seller.fulfillment_model'
  | 'seller.bank'
  | 'payout.create'
  | 'payout.paid'
  | 'payout.cancel'
  | 'auth.password_change'
  | 'staff.create'
  | 'staff.roles'
  | 'staff.block'
  | 'staff.unblock'
  | 'staff.password_reset';

export interface AuditEntry {
  userId: string;
  action: AuditAction;
  resource:
    | 'Seller'
    | 'Product'
    | 'Payment'
    | 'Order'
    | 'User'
    | 'SellerShipment'
    | 'SellerPayout'
    | 'GlobalSetting';
  resourceId: string;
  meta?: Prisma.InputJsonValue;
}

export async function writeAudit(
  entry: AuditEntry,
  tx: Prisma.TransactionClient = prisma,
): Promise<void> {
  let meta: { ipAddress?: string; userAgent?: string } = {};
  try {
    meta = requestMeta();
  } catch {
    // So'rovdan tashqarida (skript/test) — sarlavhalar yo'q.
  }
  await tx.auditLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
      ...(entry.meta !== undefined ? { meta: entry.meta } : {}),
    },
  });
}
