import { TypeOrmModule } from '@nestjs/typeorm';
import { z } from 'zod';

import { ENV, envBool } from './config';

import type { DynamicModule } from '@nestjs/common';
import type { EntitySchema } from 'typeorm';

export const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  /** Neon va boshqa boshqariladigan Postgres uchun `true`. */
  DATABASE_SSL: envBool(false),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  DATABASE_LOGGING: envBool(false),
});
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;

type Entity = (new (...args: never[]) => unknown) | EntitySchema;

/**
 * Postgres (TypeORM) — MAVJUD sxema ustidan.
 *
 * `synchronize` HECH QACHON yoqilmaydi va `migrationsRun` ham: sxema manbai bitta —
 * `packages/database` (Prisma migratsiyalari, `pnpm db:migrate`). TypeORM bu yerda
 * faqat o'qish/yozish qatlami; entity'lar mavjud jadvallarga mos yoziladi (ADR 0012).
 * Aks holda `synchronize` bir tunda production jadvalini qayta yozib yuborishi mumkin.
 */
export function databaseModule(entities: Entity[]): DynamicModule {
  return TypeOrmModule.forRootAsync({
    inject: [ENV],
    useFactory: (env: DatabaseEnv) => ({
      type: 'postgres' as const,
      url: env.DATABASE_URL,
      ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
      entities,
      synchronize: false,
      migrationsRun: false,
      logging: env.DATABASE_LOGGING,
      extra: { max: env.DATABASE_POOL_MAX },
      retryAttempts: 10,
      retryDelay: 3000,
    }),
  });
}
