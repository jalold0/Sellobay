import http from 'node:http';
import { type AddressInfo } from 'node:net';

import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';

import { REDIS, requestId } from '../common';

import { GatewayModule } from './gateway.module';

import type { NestExpressApplication } from '@nestjs/platform-express';

const SECRET = 'x'.repeat(40);
const INTERNAL_KEY = '0123456789abcdef';

interface Seen {
  method?: string;
  url?: string;
  headers: http.IncomingHttpHeaders;
  body: string;
}

/** Haqiqiy HTTP server: nima kelganini yozib oladi va `{ from }` qaytaradi. */
async function upstream(name: string) {
  const seen: Seen[] = [];
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      seen.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: Buffer.concat(chunks).toString(),
      });
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ success: true, data: { from: name } }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { url, seen, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}

/** Xotiradagi Redis: gateway faqat incr/expire/ping/quit ishlatadi. */
class FakeRedis {
  private readonly counts = new Map<string, number>();
  failing = false;
  async incr(key: string) {
    if (this.failing) throw new Error('redis down');
    const n = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, n);
    return n;
  }
  async expire() {
    return 1;
  }
  async ping() {
    if (this.failing) throw new Error('redis down');
    return 'PONG';
  }
  async quit() {
    return 'OK';
  }
  disconnect() {}
}

async function token(sub: string, roles: string[], secret = SECRET) {
  return new SignJWT({ roles })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(secret));
}

describe('gateway', () => {
  let legacy: Awaited<ReturnType<typeof upstream>>;
  let auth: Awaited<ReturnType<typeof upstream>>;
  let app: NestExpressApplication;
  let redis: FakeRedis;
  const touched: string[] = [];

  async function start(env: Record<string, string> = {}) {
    const values: Record<string, string> = {
      NODE_ENV: 'test',
      REDIS_URL: 'redis://127.0.0.1:6379',
      JWT_SECRET: SECRET,
      INTERNAL_API_KEY: INTERNAL_KEY,
      LEGACY_URL: legacy.url,
      AUTH_URL: auth.url,
      NEST_ROUTES: '',
      ...env,
    };
    for (const [k, v] of Object.entries(values)) {
      touched.push(k);
      process.env[k] = v;
    }
    redis = new FakeRedis();
    const moduleRef = await Test.createTestingModule({ imports: [GatewayModule] })
      .overrideProvider(REDIS)
      .useValue(redis)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({
      bodyParser: false,
      logger: false,
    });
    app.set('trust proxy', true);
    app.use(requestId);
    await app.init();
    return request(app.getHttpServer());
  }

  beforeEach(async () => {
    legacy = await upstream('legacy');
    auth = await upstream('auth');
  });

  afterEach(async () => {
    await app?.close();
    await legacy.close();
    await auth.close();
    for (const k of touched.splice(0)) delete process.env[k];
  });

  it("standart: hamma narsa eski API'ga, tokenga tegilmaydi, ichki kalit SIZMAYDI", async () => {
    const api = await start();

    const res = await api.get('/api/products?limit=1').set('Authorization', 'Bearer abc.def.ghi');

    expect(res.status).toBe(200);
    expect(res.headers['x-upstream']).toBe('legacy');
    expect(res.body.data.from).toBe('legacy');
    expect(legacy.seen[0]?.url).toBe('/api/products?limit=1');
    expect(legacy.seen[0]?.headers.authorization).toBe('Bearer abc.def.ghi');
    expect(legacy.seen[0]?.headers['x-internal-key']).toBeUndefined();
  });

  it('yoqilgan servisga yo`naltiradi: tana to`liq o`tadi va ichki kalit qo`shiladi', async () => {
    const api = await start({ NEST_ROUTES: 'auth' });

    const res = await api.post('/api/auth/otp/send').send({ phone: '+998901234567' });

    expect(res.status).toBe(200);
    expect(res.headers['x-upstream']).toBe('auth');
    expect(auth.seen[0]?.headers['x-internal-key']).toBe(INTERNAL_KEY);
    expect(JSON.parse(auth.seen[0]?.body ?? '{}')).toEqual({ phone: '+998901234567' });
    expect(legacy.seen).toHaveLength(0);
  });

  it('haqiqiy JWT (Bearer) — servis x-user-id va rollarni oladi', async () => {
    const api = await start({ NEST_ROUTES: 'auth' });

    await api
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${await token('user-1', ['CUSTOMER', 'COURIER'])}`);

    expect(auth.seen[0]?.headers['x-user-id']).toBe('user-1');
    expect(auth.seen[0]?.headers['x-user-roles']).toBe('CUSTOMER,COURIER');
  });

  it('web cookie (sb_at) ham tanib olinadi', async () => {
    const api = await start({ NEST_ROUTES: 'auth' });

    await api
      .get('/api/auth/me')
      .set('Cookie', `foo=1; sb_at=${await token('web-user', ['CUSTOMER'])}; bar=2`);

    expect(auth.seen[0]?.headers['x-user-id']).toBe('web-user');
  });

  it('XAVFSIZLIK: mijozning soxta x-user-* / x-internal-key sarlavhalari o`chiriladi', async () => {
    const api = await start({ NEST_ROUTES: 'auth' });

    await api
      .get('/api/auth/me')
      .set('x-user-id', 'admin-1')
      .set('x-user-roles', 'ADMIN')
      .set('x-internal-key', 'hacker-key-hacker-key');

    expect(auth.seen[0]?.headers['x-user-id']).toBeUndefined();
    expect(auth.seen[0]?.headers['x-user-roles']).toBeUndefined();
    // Servis o'z kalitini oladi, mijozniki emas.
    expect(auth.seen[0]?.headers['x-internal-key']).toBe(INTERNAL_KEY);
  });

  it('XAVFSIZLIK: token bor bo`lsa ham soxta rol tokendagi rol bilan almashtiriladi', async () => {
    const api = await start({ NEST_ROUTES: 'auth' });

    await api
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${await token('user-1', ['CUSTOMER'])}`)
      .set('x-user-roles', 'ADMIN');

    expect(auth.seen[0]?.headers['x-user-roles']).toBe('CUSTOMER');
  });

  it('boshqa kalit bilan imzolangan token — anonim (rad etilmaydi, ochiq route ishlaydi)', async () => {
    const api = await start({ NEST_ROUTES: 'auth' });

    const res = await api
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${await token('evil', ['ADMIN'], 'y'.repeat(40))}`);

    expect(res.status).toBe(200);
    expect(auth.seen[0]?.headers['x-user-id']).toBeUndefined();
  });

  it('/api/auth/* qattiqroq cheklanadi: limitdan keyin 429 + Retry-After, boshqa yo`llar ta`sirlanmaydi', async () => {
    const api = await start({
      NEST_ROUTES: 'auth',
      RATE_LIMIT_AUTH_PER_MINUTE: '2',
      RATE_LIMIT_PER_MINUTE: '100',
    });

    expect((await api.post('/api/auth/otp/send')).status).toBe(200);
    expect((await api.post('/api/auth/otp/send')).status).toBe(200);
    const blocked = await api.post('/api/auth/otp/send');

    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.body).toMatchObject({ success: false, error: { code: 'RATE_LIMITED' } });
    expect((await api.get('/api/products')).status).toBe(200);
  });

  it('Redis yiqilsa cheklov o`tkazib yuboriladi (fail-open), savdo to`xtamaydi', async () => {
    const api = await start({ RATE_LIMIT_PER_MINUTE: '1' });
    redis.failing = true;

    for (let i = 0; i < 3; i++) expect((await api.get('/api/products')).status).toBe(200);
  });

  it('upstream yiqilgan — yagona shakldagi 502', async () => {
    const api = await start({ NEST_ROUTES: 'auth', AUTH_URL: 'http://127.0.0.1:1' });

    const res = await api.get('/api/auth/me');

    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({ success: false, error: { code: 'UPSTREAM_UNAVAILABLE' } });
  });

  it("/health gateway'ning o`zida (proksi qilinmaydi); tayyorlik Redis holatini ko`rsatadi", async () => {
    const api = await start();

    expect((await api.get('/health')).body).toEqual({ status: 'ok' });
    const ready = await api.get('/health/ready');
    expect(ready.status).toBe(200);
    expect(ready.body).toMatchObject({ status: 'ok', checks: { redis: 'up', database: 'n/a' } });
    expect(legacy.seen).toHaveLength(0);

    redis.failing = true;
    const down = await api.get('/health/ready');
    expect(down.status).toBe(503);
    expect(down.body).toMatchObject({ status: 'degraded', checks: { redis: 'down' } });
  });

  it('x-request-id berilsa saqlanadi, berilmasa yaratiladi', async () => {
    const api = await start();

    expect((await api.get('/health').set('x-request-id', 'trace-42')).headers['x-request-id']).toBe(
      'trace-42',
    );
    expect((await api.get('/health')).headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
