import {
  type DynamicModule,
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import Redis from 'ioredis';
import { z } from 'zod';

import { ENV } from './config';

export const REDIS = Symbol('REDIS');

export const redisEnvSchema = z.object({ REDIS_URL: z.string().url() });
export type RedisEnv = z.infer<typeof redisEnvSchema>;

@Injectable()
class RedisLifecycle implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit().catch(() => this.redis.disconnect());
  }
}

/**
 * Redis (ioredis). Servislar holatni xotirada SAQLAMAYDI: tezlik cheklovi, kesh,
 * idempotency kalitlari va OTP hisoblagichlari shu yerda.
 *
 * Ulanish uzilsa jarayon yiqilmaydi: ioredis o'zi qayta ulanadi, so'rovlar esa
 * 2 urinishdan keyin xato beradi (osilib qolmaydi). Tayyorlik `/health/ready` da ko'rinadi.
 */
@Global()
@Module({})
export class RedisModule {
  static forRoot(): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: REDIS,
          inject: [ENV],
          useFactory: (env: RedisEnv) => {
            const logger = new Logger('Redis');
            const client = new Redis(env.REDIS_URL, {
              maxRetriesPerRequest: 2,
              enableReadyCheck: true,
              retryStrategy: (attempt) => Math.min(attempt * 200, 3000),
            });
            // Tinglovchisiz 'error' hodisasi ioredis'da har urinishda to'liq stack chiqaradi;
            // har 10 soniyada bir marta qisqa ogohlantirish yetarli.
            let lastLogged = 0;
            client.on('error', (e) => {
              if (Date.now() - lastLogged < 10_000) return;
              lastLogged = Date.now();
              logger.warn(`Redis xatosi: ${e.message}`);
            });
            return client;
          },
        },
        RedisLifecycle,
      ],
      exports: [REDIS],
    };
  }
}
