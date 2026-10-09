import { randomUUID } from 'node:crypto';

import { ConsoleLogger, type LogLevel, type Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { z } from 'zod';

import { baseEnvSchema, loadEnv } from './config';

import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

const LEVELS: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];

/** `x-request-id` — izlash uchun: kelmagan bo'lsa yaratiladi va javobda qaytariladi. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming.length <= 100 ? incoming : randomUUID();
  req.headers['x-request-id'] = id;
  res.setHeader('x-request-id', id);
  next();
}

export interface BootstrapOptions {
  name: string;
  module: Type<unknown>;
  defaultPort: number;
  /** Gateway: so'rov tanasini o'qimaydi (proksi uni oqim sifatida uzatadi). */
  proxy?: boolean;
  configure?: (app: NestExpressApplication) => void;
}

/**
 * Servisni ishga tushiradi: tekshirilgan muhit, JSON log (productionda), graceful
 * shutdown (SIGTERM'da ochiq so'rovlar tugaydi, ulanishlar yopiladi).
 */
export async function bootstrapService(opts: BootstrapOptions): Promise<NestExpressApplication> {
  const env = loadEnv(
    baseEnvSchema.extend({ PORT: z.coerce.number().int().default(opts.defaultPort) }),
  );
  const production = env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestExpressApplication>(opts.module, {
    bodyParser: !opts.proxy,
    logger: new ConsoleLogger({
      prefix: opts.name,
      json: production,
      logLevels: LEVELS.slice(0, LEVELS.indexOf(env.LOG_LEVEL) + 1),
    }),
  });

  app.disable('x-powered-by');
  // Gateway ortida (Docker/balanser) haqiqiy mijoz IP'si `x-forwarded-for` dan olinadi.
  app.set('trust proxy', true);
  app.use(requestId);
  app.enableShutdownHooks();
  opts.configure?.(app);

  await app.listen(env.PORT, '0.0.0.0');
  return app;
}
