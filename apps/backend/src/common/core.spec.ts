import { Controller, Get, Logger, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { baseEnvSchema } from './config';
import { CoreModule } from './core.module';
import { EnvModule } from './env.module';
import { DomainError } from './envelope';
import { CurrentUser, type GatewayUser, Public, Roles } from './gateway-user';
import { HealthModule } from './health.module';

import type { NestExpressApplication } from '@nestjs/platform-express';

@Controller('api/demo')
class DemoController {
  @Public()
  @Get('open')
  open() {
    return { hello: 'world' };
  }

  @Get('private')
  private(@CurrentUser() user: GatewayUser | null) {
    return { id: user?.id };
  }

  @Roles('ADMIN')
  @Get('admin')
  admin() {
    return 'ok';
  }

  @Public()
  @Get('conflict')
  conflict() {
    throw new DomainError(409, 'ALREADY_CLAIMED', 'Band', { id: 'x' });
  }

  @Public()
  @Get('crash')
  crash() {
    throw new Error('connect ECONNREFUSED password=secret');
  }
}

@Module({
  imports: [EnvModule.forRoot(baseEnvSchema), CoreModule, HealthModule],
  controllers: [DemoController],
})
class DemoModule {}

/**
 * Haqiqiy Nest ilovasi: dependency injection, global qo'riqchilar, konvert va xato filtri
 * birga ishlaydi. (Alohida unit testlar `import type` kabi DI'ni buzadigan xatolarni ushlamaydi.)
 */
describe('CoreModule (integratsiya)', () => {
  let app: NestExpressApplication;
  const saved = process.env.INTERNAL_API_KEY;

  async function start(internalKey?: string) {
    if (internalKey) process.env.INTERNAL_API_KEY = internalKey;
    else delete process.env.INTERNAL_API_KEY;
    const moduleRef = await Test.createTestingModule({ imports: [DemoModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
    await app.init();
    return request(app.getHttpServer());
  }

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await app?.close();
    jest.restoreAllMocks();
    if (saved === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = saved;
  });

  it('muvaffaqiyatli javob { success, data } konvertiga o`raladi', async () => {
    const api = await start();
    const res = await api.get('/api/demo/open');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { hello: 'world' } });
  });

  it('standart — YOPIQ: @Public() bo`lmagan route kirishsiz 401 (yagona xato shaklida)', async () => {
    const api = await start();
    const res = await api.get('/api/demo/private');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, error: { code: 'UNAUTHENTICATED' } });
  });

  it('gateway qo`ygan x-user-id bilan o`tadi va @CurrentUser() ishlaydi', async () => {
    const api = await start();
    const res = await api.get('/api/demo/private').set('x-user-id', 'u1');
    expect(res.body).toEqual({ success: true, data: { id: 'u1' } });
  });

  it('@Roles(): rol yo`q — 403, bor — 200', async () => {
    const api = await start();
    const denied = await api
      .get('/api/demo/admin')
      .set('x-user-id', 'u1')
      .set('x-user-roles', 'CUSTOMER');
    expect(denied.status).toBe(403);
    expect(denied.body).toMatchObject({ error: { code: 'FORBIDDEN' } });
    expect(
      (await api.get('/api/demo/admin').set('x-user-id', 'u1').set('x-user-roles', 'ADMIN')).status,
    ).toBe(200);
  });

  it('DomainError o`z holati, kodi va maydonlari bilan chiqadi', async () => {
    const api = await start();
    const res = await api.get('/api/demo/conflict');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'ALREADY_CLAIMED', message: 'Band', fields: { id: 'x' } },
    });
  });

  it('kutilmagan xato 500 — ichki tafsilot (parol) mijozga chiqmaydi', async () => {
    const api = await start();
    const res = await api.get('/api/demo/crash');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });

  it('INTERNAL_API_KEY sozlangan: gateway kalitisiz so`rov rad etiladi, /health esa ochiq', async () => {
    const api = await start('0123456789abcdef');

    expect((await api.get('/api/demo/open')).status).toBe(403);
    expect((await api.get('/api/demo/open').set('x-internal-key', '0123456789abcdef')).status).toBe(
      200,
    );
    expect((await api.get('/health')).status).toBe(200);
  });

  it('/health konvertsiz (RawResponse), /health/ready sozlanmagan bog`liqlikni n/a deydi', async () => {
    const api = await start();
    expect((await api.get('/health')).body).toEqual({ status: 'ok' });
    const ready = await api.get('/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body).toEqual({
      status: 'ok',
      checks: { database: 'n/a', redis: 'n/a', rabbitmq: 'n/a' },
    });
  });
});
