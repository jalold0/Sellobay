import { Module } from '@nestjs/common';
import { z } from 'zod';

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

export const authEnvSchema = baseEnvSchema
  .merge(databaseEnvSchema)
  .merge(redisEnvSchema)
  .merge(rabbitEnvSchema)
  .extend({
    /** Gateway tekshiradigan kalit bilan BIR XIL (HS256, mavjud tokenlar ishlashi uchun). */
    JWT_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  });

/**
 * auth-service: hisob, sessiya (access JWT + refresh rotatsiyasi), OTP, manzillar.
 * Egalik qiladigan jadvallar: `User*`, `OtpCode`, `RefreshToken`, `UserAddress`.
 * Hodisalar: `user.registered`, `otp.requested` (→ notification).
 */
@Module({
  imports: [
    EnvModule.forRoot(authEnvSchema),
    databaseModule([]),
    RedisModule.forRoot(),
    EventBusModule.forRoot(),
    HealthModule,
    CoreModule,
  ],
})
export class AuthModule {}
