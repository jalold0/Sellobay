import { z } from 'zod';

import { localizedTextSchema, paginationSchema, sortOrderSchema } from './common';

// ---------- Users ----------
export const userRoleSchema = z.enum([
  'CUSTOMER',
  'SELLER',
  'COURIER',
  'WAREHOUSE_STAFF',
  'SUPPORT_AGENT',
  'MARKETING_MANAGER',
  'FINANCE_MANAGER',
  'ADMIN',
  'SUPER_ADMIN',
]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const genderSchema = z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']);
export type Gender = z.infer<typeof genderSchema>;

// ---------- Products ----------
export const productStatusSchema = z.enum([
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'ARCHIVED',
  'OUT_OF_STOCK',
]);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const productFilterSchema = paginationSchema.extend({
  q: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  sellerId: z.string().uuid().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  inStock: z.coerce.boolean().optional(),
  sortBy: z.enum(['popularity', 'price', 'rating', 'newest']).default('popularity'),
  sortOrder: sortOrderSchema.default('desc'),
});
export type ProductFilter = z.infer<typeof productFilterSchema>;

export const createProductSchema = z.object({
  name: localizedTextSchema,
  description: localizedTextSchema,
  slug: z.string().min(2),
  sku: z.string().min(2),
  brandId: z.string().uuid().optional(),
  categoryIds: z.array(z.string().uuid()).min(1),
  basePrice: z.number().positive(),
  currency: z.string().default('UZS'),
  taxRate: z.number().min(0).max(100).default(0),
  weightGrams: z.number().int().nonnegative().optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

// ---------- Orders ----------
export const orderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const deliveryMethodSchema = z.enum(['HOME_DELIVERY', 'PICKUP_POINT', 'EXPRESS']);
export type DeliveryMethod = z.infer<typeof deliveryMethodSchema>;

export const paymentProviderSchema = z.enum([
  'CLICK',
  'PAYME',
  'UZUM_BANK',
  'UZCARD',
  'HUMO',
  'VISA',
  'MASTERCARD',
  'CASH_ON_DELIVERY',
]);
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1),
  shippingAddressId: z.string().uuid().optional(),
  guestEmail: z.string().email().optional(),
  guestPhone: z.string().optional(),
  deliveryMethod: deliveryMethodSchema.default('HOME_DELIVERY'),
  paymentProvider: paymentProviderSchema,
  promoCode: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
