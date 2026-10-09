import { exportPKCS8, generateKeyPair } from 'jose';
import { describe, expect, it, vi } from 'vitest';

import { createFcmClient, parseServiceAccount } from './fcm';
import { buildOrderStatusMessage, createPushService } from './service';

import type { FcmClient, ServiceAccount } from './fcm';
import type { PushDb } from './service';

async function account(): Promise<ServiceAccount> {
  const { privateKey } = await generateKeyPair('RS256', { extractable: true });
  return {
    project_id: 'sellobay',
    client_email: 'push@sellobay.iam.gserviceaccount.com',
    private_key: await exportPKCS8(privateKey),
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const msg = { title: 'a', body: 'b' };

describe('parseServiceAccount', () => {
  it('sozlanmagan yoki yaroqsiz — null', () => {
    expect(parseServiceAccount(undefined)).toBeNull();
    expect(parseServiceAccount('')).toBeNull();
    expect(parseServiceAccount('{buzuq')).toBeNull();
    expect(parseServiceAccount('{"project_id":"x"}')).toBeNull();
  });

  it('xom JSON va base64 ikkalasi ham o`qiladi, `\\n` matni haqiqiy satrga aylanadi', () => {
    const raw = JSON.stringify({
      project_id: 'p',
      client_email: 'e@p.iam',
      private_key: 'A\\nB',
    });
    const expected = { project_id: 'p', client_email: 'e@p.iam', private_key: 'A\nB' };

    expect(parseServiceAccount(raw)).toEqual(expected);
    expect(parseServiceAccount(Buffer.from(raw).toString('base64'))).toEqual(expected);
  });
});

describe('createFcmClient', () => {
  it('token bir marta olinadi va keshlanadi; xabar to`g`ri shaklda ketadi', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('oauth2')) return json({ access_token: 'AT', expires_in: 3600 });
      return json({ name: 'projects/sellobay/messages/1' });
    }) as unknown as typeof fetch;

    const client = createFcmClient(await account(), fetchImpl);
    const a = await client.send('device-1', { title: 'T', body: 'B', data: { type: 'order' } });
    const b = await client.send('device-2', { title: 'T', body: 'B' });

    expect([a, b]).toEqual(['ok', 'ok']);
    expect(calls.filter((c) => c.url.includes('oauth2'))).toHaveLength(1);

    const send = calls.find((c) => c.url.includes('messages:send'));
    expect(send?.url).toBe('https://fcm.googleapis.com/v1/projects/sellobay/messages:send');
    expect((send?.init?.headers as Record<string, string>).Authorization).toBe('Bearer AT');
    expect(JSON.parse(String(send?.init?.body)).message).toMatchObject({
      token: 'device-1',
      notification: { title: 'T', body: 'B' },
      data: { type: 'order' },
    });
  });

  it('o`lik token — invalid-token; boshqa xato — error (token o`chirilmaydi)', async () => {
    const respond = (status: number, body: unknown) =>
      (async (url: string | URL | Request) =>
        String(url).includes('oauth2')
          ? json({ access_token: 'AT', expires_in: 3600 })
          : json(body, status)) as unknown as typeof fetch;

    const acc = await account();
    const unregistered = { error: { status: 'NOT_FOUND', message: 'UNREGISTERED' } };
    const badToken = { error: { message: 'The registration token is not a valid FCM token' } };
    const badData = { error: { message: 'Invalid value at message.data' } };

    expect(await createFcmClient(acc, respond(404, unregistered)).send('t', msg)).toBe(
      'invalid-token',
    );
    expect(await createFcmClient(acc, respond(400, badToken)).send('t', msg)).toBe('invalid-token');
    expect(await createFcmClient(acc, respond(400, badData)).send('t', msg)).toBe('error');
    expect(await createFcmClient(acc, respond(500, {})).send('t', msg)).toBe('error');
  });

  it('tarmoq yoki auth yiqilsa — xato TASHLAMAYDI', async () => {
    const failing = (async () => {
      throw new Error('tarmoq yo`q');
    }) as unknown as typeof fetch;

    expect(await createFcmClient(await account(), failing).send('t', msg)).toBe('error');
  });
});

type OrderRow = Awaited<ReturnType<PushDb['order']['findUnique']>>;

function fakeDb(opts: { tokens?: string[]; order?: OrderRow } = {}) {
  const deleted: string[][] = [];
  const queries: unknown[] = [];
  const db: PushDb = {
    pushToken: {
      findMany: async (args) => {
        queries.push(args.where);
        return (opts.tokens ?? ['d1', 'd2']).map((token) => ({ token }));
      },
      deleteMany: async (args) => {
        deleted.push(args.where.token.in);
      },
    },
    order: {
      findUnique: async () =>
        opts.order === undefined
          ? { number: 'ORD-1', userId: 'u1', user: { locale: 'ru' } }
          : opts.order,
    },
  };
  return { db, deleted, queries };
}

const clientReturning = (results: Record<string, 'ok' | 'invalid-token' | 'error'>) => {
  const sent: { token: string; title: string; body: string }[] = [];
  const client: FcmClient = {
    send: async (token, m) => {
      sent.push({ token, title: m.title, body: m.body });
      return results[token] ?? 'ok';
    },
  };
  return { client, sent };
};

describe('createPushService', () => {
  it('sozlanmagan (client yo`q) — hech narsa qilmaydi', async () => {
    const { db, queries } = fakeDb();
    const svc = createPushService(db, null);

    expect(await svc.sendToUser('u1', msg)).toBe(0);
    await svc.notifyOrderStatus('o1', 'DELIVERED');
    expect(queries).toHaveLength(0);
  });

  it('o`lik tokenlar bazadan o`chiriladi, qolganlari yuboriladi', async () => {
    const { db, deleted } = fakeDb({ tokens: ['live', 'dead'] });
    const { client } = clientReturning({ dead: 'invalid-token' });

    const sent = await createPushService(db, client).sendToUser('u1', msg);

    expect(sent).toBe(1);
    expect(deleted).toEqual([['dead']]);
  });

  it('vaqtinchalik xato tokenni O`CHIRMAYDI', async () => {
    const { db, deleted } = fakeDb({ tokens: ['t'] });
    const { client } = clientReturning({ t: 'error' });

    await createPushService(db, client).sendToUser('u1', msg);

    expect(deleted).toEqual([]);
  });

  it('baza yiqilsa ham xato tashlamaydi', async () => {
    const { db } = fakeDb();
    db.pushToken.findMany = async () => {
      throw new Error('baza');
    };
    const { client } = clientReturning({});

    expect(await createPushService(db, client).sendToUser('u1', msg)).toBe(0);
  });

  it('buyurtma holati — foydalanuvchi tilida, FAQAT mijoz ilovasiga', async () => {
    const { db, queries } = fakeDb({ tokens: ['d1'] });
    const { client, sent } = clientReturning({});

    await createPushService(db, client).notifyOrderStatus('o1', 'DELIVERED');

    expect(queries).toEqual([{ userId: 'u1', appName: 'customer' }]);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.title).toContain('ORD-1');
    expect(sent[0]?.body).toBe('Доставлен');
  });

  it('shovqinli holatlar (PAID, PACKED...) yuborilmaydi', async () => {
    const { db, queries } = fakeDb();
    const { client } = clientReturning({});
    const svc = createPushService(db, client);

    for (const s of ['PENDING', 'PAID', 'PROCESSING', 'PACKED'])
      await svc.notifyOrderStatus('o1', s);

    expect(queries).toHaveLength(0);
  });

  it('mehmon buyurtmasida (userId yo`q) yuborilmaydi', async () => {
    const { db, queries } = fakeDb({ order: { number: 'ORD-2', userId: null, user: null } });
    const { client } = clientReturning({});

    await createPushService(db, client).notifyOrderStatus('o1', 'DELIVERED');

    expect(queries).toHaveLength(0);
  });
});

describe('buildOrderStatusMessage', () => {
  it('noma`lum til — o`zbekcha; data tuzilmasi ilova kutganidek', () => {
    const m = buildOrderStatusMessage({ id: 'o1', number: 'ORD-1' }, 'SHIPPED', 'xx');
    expect(m.body).toBe("Yo'lda");
    expect(m.data).toEqual({ type: 'order', orderId: 'o1', status: 'SHIPPED' });
  });
});
