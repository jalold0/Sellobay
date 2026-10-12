import { Controller, Get, Inject, Module, Optional, Res } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { RawResponse } from './envelope';
import { EventBus } from './event-bus';
import { Public } from './gateway-user';
import { REDIS } from './redis.module';

import type { Response } from 'express';
import type Redis from 'ioredis';

type Status = 'up' | 'down' | 'n/a';

/** Bog'liqlikni 2 soniya ichida tekshiradi: osilib qolgan tekshiruv tayyorlikni «yolg'on yashil» qilmasin. */
async function probe(fn: () => Promise<unknown> | unknown): Promise<Status> {
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), 2000);
    });
    await Promise.race([Promise.resolve(fn()), timeout]);
    return 'up';
  } catch {
    return 'down';
  } finally {
    // Tozalanmasa har tekshiruv 2 soniya jarayonni ushlab turadi (va testlar chiqolmaydi).
    clearTimeout(timer);
  }
}

/**
 * `/health` — jarayon tirikmi (orkestrator qayta ishga tushirish uchun).
 * `/health/ready` — bog'liqliklar (baza, Redis, RabbitMQ) ishlayaptimi; 503 bo'lsa
 * gateway/balanser unga trafik yo'llamaydi. Sozlanmagan bog'liqlik `n/a`.
 */
@Controller('health')
export class HealthController {
  constructor(
    @Optional() private readonly db?: DataSource,
    @Optional() @Inject(REDIS) private readonly redis?: Redis,
    @Optional() private readonly bus?: EventBus,
  ) {}

  @Public()
  @RawResponse()
  @Get()
  live() {
    return { status: 'ok' };
  }

  @Public()
  @RawResponse()
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    const checks = {
      database: this.db ? await probe(() => this.db!.query('select 1')) : ('n/a' as Status),
      redis: this.redis ? await probe(() => this.redis!.ping()) : ('n/a' as Status),
      rabbitmq: this.bus
        ? await probe(() => {
            if (!this.bus!.isConnected) throw new Error('disconnected');
          })
        : ('n/a' as Status),
    };
    const ok = Object.values(checks).every((s) => s !== 'down');
    // 503 + tafsilot: qaysi bog'liqlik yiqilganini balanser/operator ko'rsin.
    if (!ok) res.status(503);
    return { status: ok ? 'ok' : 'degraded', checks };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
