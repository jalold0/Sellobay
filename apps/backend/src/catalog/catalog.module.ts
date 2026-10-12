import { Module } from '@nestjs/common';

import {
  CoreModule,
  EnvModule,
  HealthModule,
  RedisModule,
  baseEnvSchema,
  databaseEnvSchema,
  databaseModule,
  redisEnvSchema,
} from '../common';

export const catalogEnvSchema = baseEnvSchema.merge(databaseEnvSchema).merge(redisEnvSchema);

/**
 * catalog-service: mahsulotlar, kategoriyalar, brendlar, sharhlar (asosan O'QISH;
 * Redis keshi bilan). Egalik: `Product*`, `Category`, `Brand`, `Review`.
 * Ochiq route'lar `@Public()` bilan belgilanadi (standart — yopiq).
 */
@Module({
  imports: [
    EnvModule.forRoot(catalogEnvSchema),
    databaseModule([]),
    RedisModule.forRoot(),
    HealthModule,
    CoreModule,
  ],
})
export class CatalogModule {}
