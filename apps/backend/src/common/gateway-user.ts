import { timingSafeEqual } from 'node:crypto';

import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ENV, type BaseEnv } from './config';

import type { Request } from 'express';

/**
 * Gateway tekshirgan foydalanuvchi. Servislar JWT'ni QAYTA tekshirmaydi:
 * gateway uni tekshiradi va `x-user-*` sarlavhalarini qo'yadi (mijozdan
 * kelganlarini esa o'chiradi). Shuning uchun servislar faqat ichki tarmoqda
 * bo'lishi va `INTERNAL_API_KEY` bilan himoyalanishi shart.
 */
export interface GatewayUser {
  id: string;
  roles: string[];
}

export const HEADER_USER_ID = 'x-user-id';
export const HEADER_USER_ROLES = 'x-user-roles';
export const HEADER_INTERNAL_KEY = 'x-internal-key';

export function userFromRequest(req: Pick<Request, 'headers'>): GatewayUser | null {
  const id = req.headers[HEADER_USER_ID];
  if (typeof id !== 'string' || id.length === 0) return null;
  const roles = req.headers[HEADER_USER_ROLES];
  return {
    id,
    roles: typeof roles === 'string' && roles ? roles.split(',').map((r) => r.trim()) : [],
  };
}

/** `@CurrentUser()` — kirmagan bo'lsa `null`. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): GatewayUser | null =>
    userFromRequest(ctx.switchToHttp().getRequest<Request>()),
);

export const IS_PUBLIC = 'is-public';
/** Kirishsiz ochiq route (katalog, health...). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES = 'roles';
/** Faqat shu rollardan biri bor foydalanuvchi. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES, roles);

/**
 * Global qo'riqchi: `@Public()` bo'lmagan hamma route kirishni talab qiladi
 * (aksincha emas: unutilgan route ochiq qolmasin), `@Roles()` esa rolni tekshiradi.
 */
@Injectable()
export class UserGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const user = userFromRequest(context.switchToHttp().getRequest<Request>());
    if (!user) throw new UnauthorizedException('Tizimga kirilmagan');

    const roles = this.reflector.getAllAndOverride<string[]>(ROLES, targets);
    if (roles && !roles.some((r) => user.roles.includes(r))) {
      throw new ForbiddenException("Ruxsat yo'q");
    }
    return true;
  }
}

/** Gateway'dan boshqa so'rovni rad etadi (`INTERNAL_API_KEY` qo'yilgan bo'lsa). `/health` istisno. */
@Injectable()
export class InternalKeyGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: BaseEnv) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.env.INTERNAL_API_KEY;
    if (!expected) return true;

    const req = context.switchToHttp().getRequest<Request>();
    if (req.path.startsWith('/health')) return true;

    const given = req.headers[HEADER_INTERNAL_KEY];
    if (typeof given !== 'string' || !safeEqual(given, expected)) {
      throw new ForbiddenException("Ruxsat yo'q");
    }
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
