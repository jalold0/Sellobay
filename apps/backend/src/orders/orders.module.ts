import { Module } from '@nestjs/common';

import {
  CoreModule,
  EnvModule,
  EventBusModule,
  HealthModule,
  RedisModule,
  baseEnvSchema,
  databaseEnvSchema,
  databaseModule,
  rabbitEnvSchema,
  redisEnvSchema,
} from '../common';

export const ordersEnvSchema = baseEnvSchema
  .merge(databaseEnvSchema)
  .merge(redisEnvSchema)
  .merge(rabbitEnvSchema);

/**
 * orders-service: savat, buyurtma yaratish (idempotent), holat o'tishlari, to'lov,
 * qaytarish. Egalik: `Order*`, `Cart*`, `Payment`, `Delivery*`.
 * Hodisalar: `order.created`, `order.status_changed` (→ notification), `payment.confirmed`.
 *
 * DIQQAT: narx/loyalty/zona qoidalari `@ecom/core-domain` dan olinadi, qayta yozilmaydi.
 */
@Module({
  imports: [
    EnvModule.forRoot(ordersEnvSchema),
    databaseModule([]),
    RedisModule.forRoot(),
    EventBusModule.forRoot(),
    HealthModule,
    CoreModule,
  ],
})
export class OrdersModule {}
