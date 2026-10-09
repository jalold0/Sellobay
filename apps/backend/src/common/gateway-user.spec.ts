import { ForbiddenException, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC, InternalKeyGuard, ROLES, UserGuard, userFromRequest } from './gateway-user';

import type { BaseEnv } from './config';

function ctx(req: object, meta: { public?: boolean; roles?: string[] } = {}): ExecutionContext {
  class Controller {}
  const handler = () => undefined;
  if (meta.public) Reflect.defineMetadata(IS_PUBLIC, true, handler);
  if (meta.roles) Reflect.defineMetadata(ROLES, meta.roles, handler);
  return {
    getHandler: () => handler,
    getClass: () => Controller,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('userFromRequest', () => {
  it('gateway qo`ygan sarlavhalardan foydalanuvchini oladi', () => {
    expect(
      userFromRequest({ headers: { 'x-user-id': 'u1', 'x-user-roles': 'CUSTOMER, COURIER' } }),
    ).toEqual({
      id: 'u1',
      roles: ['CUSTOMER', 'COURIER'],
    });
  });

  it('sarlavha yo`q yoki bo`sh — kirmagan', () => {
    expect(userFromRequest({ headers: {} })).toBeNull();
    expect(userFromRequest({ headers: { 'x-user-id': '' } })).toBeNull();
  });

  it('rollar yo`q — bo`sh massiv', () => {
    expect(userFromRequest({ headers: { 'x-user-id': 'u1' } })?.roles).toEqual([]);
  });
});

describe('UserGuard (standart — yopiq)', () => {
  const guard = new UserGuard(new Reflector());

  it('@Public() bo`lmagan route kirmagan foydalanuvchini rad etadi', () => {
    expect(() => guard.canActivate(ctx({ headers: {} }))).toThrow(UnauthorizedException);
  });

  it('@Public() route hammaga ochiq', () => {
    expect(guard.canActivate(ctx({ headers: {} }, { public: true }))).toBe(true);
  });

  it('kirgan foydalanuvchi o`tadi', () => {
    expect(guard.canActivate(ctx({ headers: { 'x-user-id': 'u1' } }))).toBe(true);
  });

  it('@Roles(): kerakli rol bo`lmasa 403, bo`lsa o`tadi', () => {
    const meta = { roles: ['ADMIN'] };
    expect(() =>
      guard.canActivate(ctx({ headers: { 'x-user-id': 'u1', 'x-user-roles': 'CUSTOMER' } }, meta)),
    ).toThrow(ForbiddenException);
    expect(
      guard.canActivate(
        ctx({ headers: { 'x-user-id': 'u1', 'x-user-roles': 'CUSTOMER,ADMIN' } }, meta),
      ),
    ).toBe(true);
  });
});

describe('InternalKeyGuard', () => {
  const guardWith = (key?: string) => new InternalKeyGuard({ INTERNAL_API_KEY: key } as BaseEnv);
  const req = (path: string, key?: string) => ({
    path,
    headers: key ? { 'x-internal-key': key } : {},
  });

  it('kalit sozlanmagan bo`lsa tekshirmaydi (lokal dev)', () => {
    expect(guardWith().canActivate(ctx(req('/api/x')))).toBe(true);
  });

  it('kalit sozlangan: noto`g`ri yoki yo`q — 403, to`g`ri — o`tadi', () => {
    const guard = guardWith('0123456789abcdef');
    expect(() => guard.canActivate(ctx(req('/api/x')))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx(req('/api/x', 'wrong-key-wrong-key')))).toThrow(
      ForbiddenException,
    );
    expect(guard.canActivate(ctx(req('/api/x', '0123456789abcdef')))).toBe(true);
  });

  it('/health kalitsiz ochiq (orkestrator tekshiruvi)', () => {
    expect(guardWith('0123456789abcdef').canActivate(ctx(req('/health/ready')))).toBe(true);
  });
});
