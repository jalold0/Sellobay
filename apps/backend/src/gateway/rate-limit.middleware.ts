import { Inject, Injectable, Logger, type NestMiddleware } from '@nestjs/common';

import { ENV, REDIS } from '../common';

import type { GatewayEnv } from './gateway.env';
import type { NextFunction, Request, Response } from 'express';
import type Redis from 'ioredis';

/** Auth yo'llari (OTP, login) qattiqroq cheklanadi: parol/OTP terish shu yerdan boshlanadi. */
export function limitFor(
  path: string,
  env: Pick<GatewayEnv, 'RATE_LIMIT_PER_MINUTE' | 'RATE_LIMIT_AUTH_PER_MINUTE'>,
): number {
  return path.startsWith('/api/auth/') ? env.RATE_LIMIT_AUTH_PER_MINUTE : env.RATE_LIMIT_PER_MINUTE;
}

/**
 * Redis'da qat'iy oyna: IP + daqiqa bo'yicha hisoblagich. Hamma gateway nusxalari
 * bitta hisoblagichni ulashadi (xotirada saqlansa, har nusxa o'z limitini berardi).
 *
 * Redis yiqilsa so'rovlar O'TKAZILADI (fail-open): cheklov yordamchi himoya,
 * Redis ishlamay qolgani butun savdoni to'xtatmasligi kerak.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  constructor(
    @Inject(ENV) private readonly env: GatewayEnv,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const limit = limitFor(req.path, this.env);
    const scope = req.path.startsWith('/api/auth/') ? 'auth' : 'api';
    const windowId = Math.floor(Date.now() / 60_000);
    const key = `rl:${scope}:${req.ip ?? 'unknown'}:${windowId}`;

    let count: number;
    try {
      count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, 70);
    } catch (e) {
      this.logger.warn(
        `Redis ishlamayapti, cheklov o'tkazib yuborildi: ${e instanceof Error ? e.message : String(e)}`,
      );
      next();
      return;
    }

    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - count)));
    if (count > limit) {
      const retryAfter = 60 - (Math.floor(Date.now() / 1000) % 60);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `So'rovlar juda ko'p. ${retryAfter} soniyadan keyin urinib ko'ring`,
        },
      });
      return;
    }
    next();
  }
}
