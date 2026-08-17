// Narx/og'irlik chetlanishi bo'yicha QAROR — sof logika.
//
// MUAMMO: mijoz katalogdagi narxda to'lab bo'lgan. Operator zakaz berayotganda
// Xitoydagi narx oshgan yoki kargo tortganda og'irlik kutilganidan katta chiqishi mumkin.
// Har safar qo'lda qaror qilish operatorni bo'g'adi va mijozni bezovta qiladi.
//
// YECHIM: uch zona. Kichik farqni O'ZIMIZ yutamiz (marja ichida bufer bor va mijozni
// bezovta qilish qimmatroq turadi), o'rtachasida mijozdan so'raymiz, kattasida bekor
// qilishni taklif qilamiz. Chegaralar konfigdan boshqariladi.

export type VarianceDecision =
  /** Farq yo'q yoki chidam doirasida — operator bir tugma bilan tasdiqlaydi. */
  | 'AUTO_CONFIRM'
  /** Sezilarli oshgan — mijozga xabar: qo'shimcha to'lov yoki bekor qilish. */
  | 'ASK_CUSTOMER'
  /** Juda katta farq — bekor qilib, pulni qaytarish tavsiya etiladi. */
  | 'CANCEL_SUGGESTED';

export interface VarianceThresholds {
  /** Shu foizgacha oshishni o'zimiz yutamiz (0.05 = 5%). */
  absorbPct: number;
  /** Shu foizdan oshsa — bekor qilish tavsiya etiladi (0.3 = 30%). */
  cancelPct: number;
}

export const DEFAULT_VARIANCE_THRESHOLDS: VarianceThresholds = {
  absorbPct: 0.05,
  cancelPct: 0.3,
};

export interface VarianceResult {
  decision: VarianceDecision;
  /** Farq (so'm). Manfiy = biz yutdik (haqiqiy narx arzonroq chiqdi). */
  diffUzs: number;
  /** Farq mijoz to'lagan summaga nisbatan (0.07 = 7%). */
  diffPct: number;
  /** Biz o'z zimmamizga olgan summa (so'm). */
  absorbedUzs: number;
  /** Mijozdan qo'shimcha so'raladigan summa (so'm). */
  extraChargeUzs: number;
}

/**
 * Mijoz to'lagan summa bilan hozirgi haqiqiy summani solishtiradi.
 *
 * @param paidUzs   mijoz to'lagan (katalogdagi narx)
 * @param actualUzs hozirgi ma'lumot bilan qayta hisoblangan narx
 */
export function evaluateVariance(
  paidUzs: number,
  actualUzs: number,
  thresholds: VarianceThresholds = DEFAULT_VARIANCE_THRESHOLDS,
): VarianceResult {
  const diffUzs = actualUzs - paidUzs;

  // Arzonlashgan yoki teng — hech kimdan hech narsa so'ralmaydi
  if (diffUzs <= 0) {
    return {
      decision: 'AUTO_CONFIRM',
      diffUzs,
      diffPct: paidUzs > 0 ? diffUzs / paidUzs : 0,
      absorbedUzs: 0,
      extraChargeUzs: 0,
    };
  }

  // To'lov nolga teng bo'lsa foiz ma'nosiz — har qanday oshish so'raladi
  const diffPct = paidUzs > 0 ? diffUzs / paidUzs : Infinity;

  if (diffPct <= thresholds.absorbPct) {
    return {
      decision: 'AUTO_CONFIRM',
      diffUzs,
      diffPct,
      absorbedUzs: diffUzs,
      extraChargeUzs: 0,
    };
  }

  if (diffPct <= thresholds.cancelPct) {
    return {
      decision: 'ASK_CUSTOMER',
      diffUzs,
      diffPct,
      absorbedUzs: 0,
      extraChargeUzs: diffUzs,
    };
  }

  return {
    decision: 'CANCEL_SUGGESTED',
    diffUzs,
    diffPct,
    absorbedUzs: 0,
    extraChargeUzs: diffUzs,
  };
}
