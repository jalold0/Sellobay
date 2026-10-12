// Tovar formasidagi pul maydonlari uchun zod sxemalari (yaratish va tahrirlash bir xil).
// Qoida @ecom/core-domain `parseMoneyInput` da: natija — o'nlik SATR, number EMAS.

import { parseMoneyInput } from '@ecom/core-domain';
import { z } from 'zod';

const MONEY_MESSAGE = 'Narx musbat son bo‘lishi kerak (masalan 125000 yoki 125000.50)';

export const moneySchema = z.union([z.string(), z.number()]).transform((v, ctx) => {
  const parsed = parseMoneyInput(v);
  if (parsed === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: MONEY_MESSAGE });
    return z.NEVER;
  }
  return parsed;
});

/**
 * Bo'sh qoldirilishi mumkin bo'lgan narx (eski narx, variant narxi): ''/null → null (o'chirish),
 * maydon umuman yuborilmasa → undefined (tahrirda «o'zgartirmaslik» — eski qiymat qoladi).
 */
export const optionalMoneySchema = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null || (typeof v === 'string' && v.trim() === '')) return null;
    const parsed = parseMoneyInput(v);
    if (parsed === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: MONEY_MESSAGE });
      return z.NEVER;
    }
    return parsed;
  });
