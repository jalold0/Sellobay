// OpenAPI reyestri — route'lar shu yerda ro'yxatdan o'tadi.
//
// Reyestr ALOHIDA fayl: sxemalar (`catalog.ts`, `courier.ts`) toza
// qoladi va ularni test ham, klient ham OpenAPI'siz import qila oladi.
// Spec generatsiyasi faqat shu faylga va `scripts/` ga bog'liq.

import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

import { brandSchema, categorySchema, productListSchema } from './catalog.ts';
import { courierDeliveriesSchema, courierHistorySchema, courierStatsSchema } from './courier.ts';
import { apiFailureSchema, apiSuccessSchema } from './envelope.ts';
import { z } from './zod.ts';

export const registry = new OpenAPIRegistry();

/** Barcha xato javoblari bir xil — har route'da takrorlamaymiz. */
const errorResponses = {
  400: {
    description: 'Validatsiya xatosi',
    content: { 'application/json': { schema: apiFailureSchema } },
  },
  401: {
    description: 'Tizimga kirilmagan',
    content: { 'application/json': { schema: apiFailureSchema } },
  },
  403: {
    description: 'Ruxsat yo`q',
    content: { 'application/json': { schema: apiFailureSchema } },
  },
  404: { description: 'Topilmadi', content: { 'application/json': { schema: apiFailureSchema } } },
  429: {
    description: 'Juda ko`p so`rov',
    content: { 'application/json': { schema: apiFailureSchema } },
  },
  500: {
    description: 'Server xatosi',
    content: { 'application/json': { schema: apiFailureSchema } },
  },
};

function ok<T extends z.ZodTypeAny>(schema: T, description: string) {
  return {
    200: { description, content: { 'application/json': { schema: apiSuccessSchema(schema) } } },
    ...errorResponses,
  };
}

registry.registerPath({
  method: 'get',
  path: '/api/v1/products',
  tags: ['Katalog'],
  summary: 'Mahsulotlar ro`yxati',
  request: {
    query: z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      category: z.string().optional(),
      brand: z.string().optional(),
      q: z.string().optional(),
    }),
  },
  responses: ok(productListSchema, 'Sahifalangan mahsulotlar'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/categories',
  tags: ['Katalog'],
  summary: 'Kategoriyalar',
  responses: ok(z.object({ items: z.array(categorySchema) }), 'Kategoriyalar ro`yxati'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/brands',
  tags: ['Katalog'],
  summary: 'Brendlar',
  responses: ok(z.object({ items: z.array(brandSchema) }), 'Brendlar ro`yxati'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/courier/deliveries',
  tags: ['Kuryer'],
  summary: 'Faol topshiriqlar',
  responses: ok(courierDeliveriesSchema, 'O`ziniki va bo`shlari'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/courier/history',
  tags: ['Kuryer'],
  summary: 'Tugagan topshiriqlar',
  request: {
    query: z.object({
      cursor: z.string().uuid().optional(),
      limit: z.coerce.number().int().min(1).max(50).optional(),
    }),
  },
  responses: ok(courierHistorySchema, 'Kursor bo`yicha sahifa'),
});

registry.registerPath({
  method: 'get',
  path: '/api/v1/courier/stats',
  tags: ['Kuryer'],
  summary: 'Kunlik ko`rsatkichlar',
  responses: ok(courierStatsSchema, 'Bugungi va umumiy raqamlar'),
});
