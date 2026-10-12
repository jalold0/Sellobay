import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common';

import { EnvModule, HealthModule, RedisModule } from '../common';

import { gatewayEnvSchema } from './gateway.env';
import { IdentityMiddleware } from './identity.middleware';
import { ProxyMiddleware } from './proxy.middleware';
import { RateLimitMiddleware } from './rate-limit.middleware';

/**
 * Gateway: tashqi dunyoning YAGONA kirish nuqtasi.
 *
 * `/api/**` so'rovlari shu tartibda o'tadi:
 *   1. identity   — JWT'ni tekshiradi, mijozning soxta `x-user-*` sarlavhalarini o'chiradi;
 *   2. rate-limit — Redis'da IP bo'yicha cheklov;
 *   3. proxy      — `routes.ts` bo'yicha NestJS servisiga yoki eski API'ga.
 * `/health` gateway'ning o'zida.
 */
@Module({
  imports: [EnvModule.forRoot(gatewayEnvSchema), RedisModule.forRoot(), HealthModule],
  providers: [IdentityMiddleware, RateLimitMiddleware, ProxyMiddleware],
})
export class GatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(IdentityMiddleware, RateLimitMiddleware, ProxyMiddleware)
      .forRoutes({ path: '/api/{*splat}', method: RequestMethod.ALL });
  }
}
