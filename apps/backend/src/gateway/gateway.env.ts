import { z } from 'zod';

import { baseEnvSchema, redisEnvSchema } from '../common';

const csv = (raw: string | undefined) =>
  (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const gatewayEnvSchema = baseEnvSchema.merge(redisEnvSchema).extend({
  /**
   * Mavjud tokenlar ishlashi uchun Vercel'dagi `JWT_SECRET` bilan BIR XIL bo'lishi shart
   * (HS256). 32 belgidan qisqa kalit rad etiladi — `apps/web/src/lib/auth/constants.ts` bilan bir xil qoida.
   */
  JWT_SECRET: z.string().min(32),

  AUTH_URL: z.string().url().default('http://auth:4001'),
  CATALOG_URL: z.string().url().default('http://catalog:4002'),
  ORDERS_URL: z.string().url().default('http://orders:4003'),
  /** Hali ko'chirilmagan hamma narsa shu yerga ketadi. */
  LEGACY_URL: z.string().url().default('https://sellobay-web.vercel.app'),

  /** Yoqilgan servislar (vergul bilan). Bo'sh = hammasi eski API'da (xavfsiz boshlang'ich holat). */
  NEST_ROUTES: z.string().default(''),

  /** Bir IP uchun daqiqasiga so'rov. */
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(240),
  /** `/api/auth/*` (OTP, login) uchun qattiqroq chegara. */
  RATE_LIMIT_AUTH_PER_MINUTE: z.coerce.number().int().min(1).default(20),

  CORS_ORIGINS: z.string().default('').transform(csv),
});

export type GatewayEnv = z.infer<typeof gatewayEnvSchema>;
