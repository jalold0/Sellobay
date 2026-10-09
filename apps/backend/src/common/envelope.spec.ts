import {
  BadRequestException,
  Logger,
  type ArgumentsHost,
  type CallHandler,
  type ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';

import { AllExceptionsFilter } from './all-exceptions.filter';
import { DomainError, EnvelopeInterceptor, RAW_RESPONSE } from './envelope';

function ctx(raw: boolean): ExecutionContext {
  class Controller {}
  const handler = () => undefined;
  if (raw) Reflect.defineMetadata(RAW_RESPONSE, true, handler);
  return { getHandler: () => handler, getClass: () => Controller } as unknown as ExecutionContext;
}
const next = (value: unknown): CallHandler => ({ handle: () => of(value) });

describe('EnvelopeInterceptor', () => {
  const interceptor = new EnvelopeInterceptor(new Reflector());
  const run = (raw: boolean, value: unknown) =>
    lastValueFrom(
      interceptor.intercept(ctx(raw), next(value)) as ReturnType<CallHandler['handle']>,
    );

  it('oddiy qiymatni { success: true, data } ga o`raydi', async () => {
    expect(await run(false, { id: 1 })).toEqual({ success: true, data: { id: 1 } });
    expect(await run(false, [1, 2])).toEqual({ success: true, data: [1, 2] });
    expect(await run(false, null)).toEqual({ success: true, data: null });
  });

  it('tayyor konvertni ikki marta o`ramaydi', async () => {
    const envelope = { success: true, data: 5 };
    expect(await run(false, envelope)).toBe(envelope);
  });

  it('@RawResponse() belgilangan javobga tegmaydi (health)', async () => {
    expect(await run(true, { status: 'ok' })).toEqual({ status: 'ok' });
  });
});

describe('AllExceptionsFilter', () => {
  // Kutilmagan xato logga yoziladi — test chiqishini ifloslamasin.
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  function respond(exception: unknown, headers: Record<string, string> = {}) {
    const json = jest.fn();
    const res = { status: jest.fn().mockReturnValue({ json }) };
    const req = { method: 'GET', url: '/x', headers };
    const host = {
      switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
    } as unknown as ArgumentsHost;
    new AllExceptionsFilter().catch(exception, host);
    return {
      status: res.status.mock.calls[0]?.[0] as number,
      body: json.mock.calls[0]?.[0] as Record<string, unknown>,
    };
  }

  it('DomainError — o`z holati, kodi va maydon xatolari bilan', () => {
    const { status, body } = respond(new DomainError(409, 'ALREADY_CLAIMED', 'Band', { id: 'x' }));
    expect(status).toBe(409);
    expect(body).toEqual({
      success: false,
      error: { code: 'ALREADY_CLAIMED', message: 'Band', fields: { id: 'x' } },
    });
  });

  it('HttpException — holat kodidan barqaror kalit', () => {
    expect(respond(new NotFoundException('Topilmadi')).body).toMatchObject({
      error: { code: 'NOT_FOUND', message: 'Topilmadi' },
    });
  });

  it('class-validator xabarlar massivi — birinchisi ko`rsatiladi', () => {
    const { status, body } = respond(new BadRequestException(['phone noto`g`ri', 'code kerak']));
    expect(status).toBe(400);
    expect(body).toMatchObject({ error: { code: 'VALIDATION', message: 'phone noto`g`ri' } });
  });

  it('kutilmagan xato — 500 va ichki tafsilot mijozga CHIQMAYDI', () => {
    const { status, body } = respond(
      new Error('connect ECONNREFUSED 10.0.0.5:5432 password=secret'),
    );
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(body).toMatchObject({ success: false, error: { code: 'INTERNAL' } });
  });

  it('x-request-id javobga qo`shiladi', () => {
    expect(respond(new Error('x'), { 'x-request-id': 'req-1' }).body).toMatchObject({
      requestId: 'req-1',
    });
  });
});
