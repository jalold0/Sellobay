import { z } from 'zod';

export const SUPPORTED_LOCALES = ['uz', 'ru', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const SUPPORTED_CURRENCIES = ['UZS', 'USD', 'EUR'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const localizedTextSchema = z.object({
  uz: z.string(),
  ru: z.string().optional(),
  en: z.string().optional(),
});

export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const sortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof sortOrderSchema>;
