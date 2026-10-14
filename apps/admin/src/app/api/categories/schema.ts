// Kategoriya API'lari uchun umumiy tekshiruv sxemalari.

import { z } from 'zod';

/** Nom uch tilda saqlanadi (Category.name — Json). */
export const localizedName = z.object({
  uz: z.string().trim().min(2, 'O`zbekcha nom kamida 2 belgi').max(80),
  ru: z.string().trim().max(80).optional(),
  en: z.string().trim().max(80).optional(),
});

/**
 * Ikonka manzili: https:// yoki saytdagi yo'l (/categories/x.png).
 * Bo'sh satr — ikonkani olib tashlash (ilova slug bo'yicha belgi chizadi).
 */
export const categoryIconUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || v.startsWith('https://') || v.startsWith('/'), {
    message: 'Ikonka manzili https:// yoki / bilan boshlanishi kerak',
  })
  .nullable();
