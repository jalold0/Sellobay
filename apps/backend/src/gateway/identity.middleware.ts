import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import { jwtVerify } from 'jose';

import { ENV, HEADER_INTERNAL_KEY, HEADER_USER_ID, HEADER_USER_ROLES } from '../common';

import type { GatewayEnv } from './gateway.env';
import type { NextFunction, Request, Response } from 'express';

/** Web sessiya cookie'si (`apps/web/src/lib/auth/constants.ts` bilan bir xil nom). */
export const COOKIE_ACCESS = 'sb_at';

/**
 * Token manbai web'dagi bilan bir xil tartibda: avval cookie (web), keyin
 * `Authorization: Bearer` (mobil).
 */
export function extractToken(headers: Request['headers']): string | undefined {
  const cookie = headers.cookie
    ?.split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_ACCESS}=`))
    ?.slice(COOKIE_ACCESS.length + 1);
  if (cookie) return decodeURIComponent(cookie);

  const auth = headers.authorization;
  if (auth && auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim() || undefined;
  return undefined;
}

/**
 * Mijoz yuborgan `x-user-*` va `x-internal-key` sarlavhalarini O'CHIRADI.
 *
 * Servislar `x-user-id` ga ishonadi, shuning uchun ularni faqat gateway qo'yishi kerak.
 * Aks holda har kim `x-user-roles: ADMIN` yuborib, istalgan foydalanuvchi nomidan ish qilardi.
 */
export function stripInternalHeaders(headers: Request['headers']): void {
  delete headers[HEADER_USER_ID];
  delete headers[HEADER_USER_ROLES];
  delete headers[HEADER_INTERNAL_KEY];
}

/**
 * JWT'ni tekshiradi va `x-user-id` / `x-user-roles` ni qo'yadi.
 *
 * Yaroqsiz yoki muddati o'tgan token = kirmagan foydalanuvchi (rad ETILMAYDI):
 * ochiq route'lar (katalog) unda ham ishlashi kerak, himoyalanganlarni esa servis
 * o'zi `UserGuard` bilan yopadi. Eski API uchun original `Authorization`/cookie
 * tegilmay qoladi — u o'zi tekshiradi.
 */
@Injectable()
export class IdentityMiddleware implements NestMiddleware {
  private readonly key: Uint8Array;

  constructor(@Inject(ENV) env: GatewayEnv) {
    this.key = new TextEncoder().encode(env.JWT_SECRET);
  }

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    stripInternalHeaders(req.headers);

    const token = extractToken(req.headers);
    if (token) {
      try {
        const { payload } = await jwtVerify(token, this.key, { algorithms: ['HS256'] });
        if (typeof payload.sub === 'string' && payload.sub) {
          req.headers[HEADER_USER_ID] = payload.sub;
          const roles = Array.isArray(payload.roles)
            ? payload.roles.filter((r) => typeof r === 'string')
            : [];
          req.headers[HEADER_USER_ROLES] = roles.join(',');
        }
      } catch {
        // Yaroqsiz token — anonim.
      }
    }
    next();
  }
}
