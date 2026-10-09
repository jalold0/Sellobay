import { Inject, Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { ENV, HEADER_INTERNAL_KEY } from '../common';

import {
  type ServiceName,
  type UpstreamName,
  parseEnabledServices,
  resolveUpstream,
} from './routes';

import type { GatewayEnv } from './gateway.env';
import type { NextFunction, Request, Response } from 'express';
import type { IncomingMessage, ServerResponse } from 'node:http';

type Handler = (req: Request, res: Response, next: NextFunction) => unknown;

/**
 * So'rovni upstream'ga oqim sifatida uzatadi (tana o'qilmaydi, fayl yuklash ham ishlaydi).
 * Upstream tanlovi: `routes.ts`. Upstream yiqilsa mijozga yagona shakldagi 502 qaytadi.
 */
@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ProxyMiddleware.name);
  private readonly enabled: ReadonlySet<ServiceName>;
  private readonly handlers: Record<UpstreamName, Handler>;

  constructor(@Inject(ENV) env: GatewayEnv) {
    this.enabled = parseEnabledServices(env.NEST_ROUTES);
    this.logger.log(
      `Yoqilgan servislar: ${this.enabled.size ? [...this.enabled].join(', ') : 'yo‘q (hammasi eski API’da)'}`,
    );

    const targets: Record<UpstreamName, string> = {
      auth: env.AUTH_URL,
      catalog: env.CATALOG_URL,
      orders: env.ORDERS_URL,
      legacy: env.LEGACY_URL,
    };

    const make = (name: UpstreamName): Handler =>
      createProxyMiddleware<Request, Response>({
        target: targets[name],
        // Vercel host sarlavhasi bo'yicha loyihani tanlaydi; ichki servislarda esa kerak emas.
        changeOrigin: name === 'legacy',
        xfwd: true,
        proxyTimeout: 30_000,
        timeout: 35_000,
        on: {
          proxyReq: (proxyReq) => {
            // Ichki kalit faqat NestJS servislarga: eski API'ga (tashqi) sizib chiqmasin.
            if (name !== 'legacy' && env.INTERNAL_API_KEY)
              proxyReq.setHeader(HEADER_INTERNAL_KEY, env.INTERNAL_API_KEY);
          },
          error: (err, req, res) => {
            this.logger.error(
              `${name} upstream xatosi: ${err.message} (${(req as IncomingMessage).url ?? ''})`,
            );
            if (!('writeHead' in res) || (res as ServerResponse).headersSent) return;
            (res as ServerResponse).writeHead(502, { 'content-type': 'application/json' });
            (res as ServerResponse).end(
              JSON.stringify({
                success: false,
                error: {
                  code: 'UPSTREAM_UNAVAILABLE',
                  message: 'Xizmat vaqtincha javob bermayapti',
                },
              }),
            );
          },
        },
      }) as unknown as Handler;

    this.handlers = {
      auth: make('auth'),
      catalog: make('catalog'),
      orders: make('orders'),
      legacy: make('legacy'),
    };
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const upstream = resolveUpstream(req.path, this.enabled);
    res.setHeader('x-upstream', upstream);
    void this.handlers[upstream](req, res, next);
  }
}
