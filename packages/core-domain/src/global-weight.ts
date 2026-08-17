// Global tovar og'irligini BAHOLASH — sof logika.
//
// MUAMMO: Xitoy platformalarida og'irlik ko'pincha ko'rsatilmagan, lekin narxning
// 30-50% i aynan og'irlikdan chiqadi. Har bir tovarni qo'lda tortib bo'lmaydi.
//
// YECHIM: og'irlik tasodifiy son emas — futbolka har doim ~0.35 kg. Kategoriya bo'yicha
// KONSERVATIV baho beramiz (kam emas, ko'p tomonga), yuqoriga yaxlitlaymiz va zaxira
// qo'shamiz. Bitta buyurtmada xato bo'lishi mumkin, 100 tasida o'rtacha plyusda chiqadi.
//
// KEYIN: kargo omborida tovar TORTILADI — haqiqiy og'irlik bazaga yoziladi
// (`actualWeightKg`). 30-50 buyurtmadan keyin bu jadval taxmin emas, o'lchov bo'ladi.

export type WeightCategory =
  | 'TSHIRT' // futbolka, ich kiyim, yengil trikotaj
  | 'OUTERWEAR' // kurtka, palto, sviter
  | 'SHOES' // krossovka, poyabzal, botinka
  | 'BAG' // sumka, ryukzak
  | 'ACCESSORY' // quloqchin, kamar, ko'zoynak, zargarlik
  | 'SMALL_ELECTRONICS' // smart soat, quloqchin, power bank
  | 'COSMETICS' // parfyum, krem, bo'yoq
  | 'TOY' // o'yinchoq
  | 'HOME' // uy jihozi, mayda texnika
  | 'OTHER'; // noma'lum — eng ehtiyotkor baho

/**
 * Bitta donaning taxminiy og'irligi (kg), qadoq bilan — ATAYLAB yuqoriroq olingan.
 * O'zgartirishdan oldin: bu raqamni pasaytirish = har bir buyurtmada zarar.
 *
 * Bular BOSHLANG'ICH qiymatlar. Kargo omborida tortilgan haqiqiy og'irliklar
 * to'plangach (`GlobalSource.actualWeightKg`), shu jadval o'lchov bilan almashtiriladi.
 */
export const CATEGORY_WEIGHT_KG: Record<WeightCategory, number> = {
  TSHIRT: 0.35,
  OUTERWEAR: 1.2,
  SHOES: 1.3,
  BAG: 0.9,
  ACCESSORY: 0.4,
  SMALL_ELECTRONICS: 0.45,
  COSMETICS: 0.45,
  TOY: 0.7,
  HOME: 1.5,
  OTHER: 1.0,
};

/** Kargo og'irlikni shu qadamgacha yuqoriga yaxlitlaydi. */
export const WEIGHT_ROUND_STEP_KG = 0.5;

/** Yuqoriga yaxlitlash (kg). step <= 0 bo'lsa yaxlitlanmaydi. */
export function roundUpKg(kg: number, step: number = WEIGHT_ROUND_STEP_KG): number {
  if (step <= 0) return kg;
  // Suzuvchi nuqta xatosi 0.5 ni 0.5000000001 qilib yubormasligi uchun yaxlitlaymiz
  const steps = Math.ceil(Number((kg / step).toFixed(6)));
  return Number((steps * step).toFixed(3));
}

export interface WeightEstimate {
  /**
   * Butun pozitsiya (qty ta dona) uchun sof og'irlik (kg) — YAXLITLANMAGAN.
   * Yaxlitlash, minimal og'irlik va zaxira narx dvigatelida qo'llanadi
   * (`priceGlobalItem`) — ikki marta yaxlitlash yengil tovarni ikki barobar
   * qimmatlashtiradi, shuning uchun yaxlitlash BITTA joyda turadi.
   */
  kg: number;
  /** Bu o'lchangan og'irlikmi yoki taxminmi (narxga zaxira qo'shiladimi). */
  isEstimated: boolean;
  /** Qaysi manbadan olindi — admin panelda ko'rsatiladi. */
  source: 'MEASURED' | 'MANUAL' | 'CATEGORY';
}

export interface WeightEstimateInput {
  category: WeightCategory;
  qty: number;
  /** Kargo tortgan haqiqiy og'irlik (bir dona, kg) — bo'lsa hammasidan ustun. */
  actualWeightKg?: number | null;
  /** Operator qo'lda kiritgan og'irlik (bir dona, kg). */
  manualWeightKg?: number | null;
}

/**
 * Bitta pozitsiya uchun og'irlik manbasi: o'lchangan → qo'lda kiritilgan → kategoriya standarti.
 */
export function estimateWeightKg(input: WeightEstimateInput): WeightEstimate {
  const qty = Math.max(1, input.qty);

  if (input.actualWeightKg && input.actualWeightKg > 0) {
    return { kg: input.actualWeightKg * qty, isEstimated: false, source: 'MEASURED' };
  }

  if (input.manualWeightKg && input.manualWeightKg > 0) {
    return { kg: input.manualWeightKg * qty, isEstimated: true, source: 'MANUAL' };
  }

  const perUnit = CATEGORY_WEIGHT_KG[input.category] ?? CATEGORY_WEIGHT_KG.OTHER;
  return { kg: perUnit * qty, isEstimated: true, source: 'CATEGORY' };
}

/**
 * Narx kafolati koridori: mijozga ko'rsatilgan narx shu og'irlikkacha amal qiladi.
 * Undan oshsa — kutilmagan hisob emas, oldindan aytilgan shart ishga tushadi.
 *
 * Kirish sifatida narx dvigateli chiqargan HISOBGA OLINGAN og'irlik beriladi
 * (`GlobalPriceBreakdown.chargeableKg`) — kargo aynan shuni hisoblaydi.
 */
export function weightGuaranteeCeilingKg(
  chargeableKg: number,
  isEstimated: boolean,
  guaranteePct: number,
): number {
  if (!isEstimated) return chargeableKg;
  return roundUpKg(chargeableKg * (1 + Math.max(0, guaranteePct)));
}
