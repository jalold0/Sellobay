// Promokod (PromoCode) validatsiya va chegirma hisoblash — web + mobile uchun umumiy server logikasi.
// Order API ham, /api/promo/validate ham shu yerdan foydalanadi — bitta haqiqat manbai.

import type { PromoCode, PromoType } from '@ecom/database';

export interface PromoContext {
  /** Mahsulotlar yig'indisi (yetkazib berishsiz), so'mda */
  subtotal: number;
  /** Yetkazib berish narxi, so'mda — FREE_SHIPPING uchun kerak */
  shippingFee: number;
  /** Joriy foydalanuvchi shu promokodni necha marta ishlatgan (login bo'lsa) */
  userUsedCount?: number;
}

export type PromoFailReason =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'MIN_ORDER'
  | 'USAGE_LIMIT'
  | 'USER_LIMIT';

export interface PromoEvalOk {
  ok: true;
  code: string;
  type: PromoType;
  /** Hisoblangan chegirma so'mda (yetkazib berish yoki mahsulotdan) */
  discount: number;
}

export interface PromoEvalFail {
  ok: false;
  reason: PromoFailReason;
  /** MIN_ORDER uchun — yetishmayotgan minimal summa */
  minOrderTotal?: number;
}

export type PromoEval = PromoEvalOk | PromoEvalFail;

const REASON_MESSAGE: Record<PromoFailReason, string> = {
  NOT_FOUND: 'Promokod topilmadi',
  INACTIVE: 'Promokod faol emas',
  NOT_STARTED: 'Promokod hali boshlanmagan',
  EXPIRED: 'Promokod muddati tugagan',
  MIN_ORDER: 'Buyurtma summasi yetarli emas',
  USAGE_LIMIT: 'Promokod ishlatish chegarasi tugagan',
  USER_LIMIT: 'Siz bu promokodni allaqachon ishlatgansiz',
};

export function promoFailMessage(reason: PromoFailReason): string {
  return REASON_MESSAGE[reason];
}

/**
 * Promokodni kontekst bo'yicha baholaydi va chegirmani hisoblaydi.
 * `now` — sinov uchun beriladigan vaqt (default: hozir).
 */
export function evaluatePromo(
  promo: Pick<
    PromoCode,
    | 'code'
    | 'type'
    | 'value'
    | 'minOrderTotal'
    | 'maxDiscount'
    | 'usageLimit'
    | 'usagePerUser'
    | 'usedCount'
    | 'startsAt'
    | 'endsAt'
    | 'isActive'
  >,
  ctx: PromoContext,
  now: Date = new Date(),
): PromoEval {
  if (!promo.isActive) return { ok: false, reason: 'INACTIVE' };
  if (promo.startsAt && now < promo.startsAt) return { ok: false, reason: 'NOT_STARTED' };
  if (promo.endsAt && now > promo.endsAt) return { ok: false, reason: 'EXPIRED' };

  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
    return { ok: false, reason: 'USAGE_LIMIT' };
  }
  if (ctx.userUsedCount != null && ctx.userUsedCount >= promo.usagePerUser) {
    return { ok: false, reason: 'USER_LIMIT' };
  }

  const minOrder = promo.minOrderTotal ? Number(promo.minOrderTotal) : 0;
  if (minOrder > 0 && ctx.subtotal < minOrder) {
    return { ok: false, reason: 'MIN_ORDER', minOrderTotal: minOrder };
  }

  const value = Number(promo.value);
  const maxDiscount = promo.maxDiscount ? Number(promo.maxDiscount) : null;

  let discount = 0;
  switch (promo.type) {
    case 'PERCENT':
      discount = Math.round((ctx.subtotal * value) / 100);
      break;
    case 'FIXED':
      discount = value;
      break;
    case 'FREE_SHIPPING':
      discount = ctx.shippingFee;
      break;
  }

  if (maxDiscount != null) discount = Math.min(discount, maxDiscount);
  // FREE_SHIPPING'dan tashqari — chegirma subtotal'dan oshmasin
  const cap = promo.type === 'FREE_SHIPPING' ? ctx.shippingFee : ctx.subtotal;
  discount = Math.max(0, Math.min(discount, cap));

  return { ok: true, code: promo.code, type: promo.type, discount };
}
