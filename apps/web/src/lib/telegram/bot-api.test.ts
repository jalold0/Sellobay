import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ensureWebhook, resetWebhookEnsuredForTests, telegramConfig } from './bot-api';

const okResponse = () =>
  new Response(JSON.stringify({ ok: true, result: true, description: 'Webhook was set' }));

describe('ensureWebhook (ADR 0018)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetWebhookEnsuredForTests();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '123:abc');
    vi.stubEnv('TELEGRAM_BOT_USERNAME', 'SellobayBot');
    vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', 'sir_0123');
    vi.stubEnv('VERCEL_ENV', 'production');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('prod — Vercel`dagi sir bilan, www manziliga bir marta o`rnatadi', async () => {
    fetchMock.mockResolvedValue(okResponse());
    expect(await ensureWebhook('https://www.sellobay.uz')).toBe(true);
    expect(await ensureWebhook('https://www.sellobay.uz')).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.telegram.org/bot123:abc/setWebhook');
    expect(JSON.parse(init.body as string)).toEqual({
      url: 'https://www.sellobay.uz/api/telegram/webhook',
      secret_token: 'sir_0123',
      allowed_updates: ['message'],
    });
  });

  it('preview/lokal — prod webhook`iga tegmaydi', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(await ensureWebhook('https://www.sellobay.uz')).toBe(false);
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(await ensureWebhook('http://localhost:3000')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Telegram rad etsa — keyingi chaqiruvda qayta uriniladi', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, description: 'Bad Request' }), { status: 400 }),
    );
    expect(await ensureWebhook('https://www.sellobay.uz')).toBe(false);
    fetchMock.mockResolvedValueOnce(okResponse());
    expect(await ensureWebhook('https://www.sellobay.uz')).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('sirda ruxsat etilmagan belgi — Telegram kirishi o`chiq', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', '<SECRET>');
    expect(telegramConfig()).toBeNull();
    expect(await ensureWebhook('https://www.sellobay.uz')).toBe(false);
    vi.stubEnv('TELEGRAM_WEBHOOK_SECRET', '  ab12cd  ');
    expect(telegramConfig()?.secret).toBe('ab12cd');
  });

  it('sozlanmagan bo`lsa — hech narsa qilmaydi', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
    expect(await ensureWebhook('https://www.sellobay.uz')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
