import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';

import { DomainError, type ApiFailure } from './envelope';

import type { Request, Response } from 'express';

const CODE_BY_STATUS: Record<number, string> = {
  400: 'VALIDATION',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
};

/** Barcha xatolarni yagona konvertga aylantiradi. Ichki xatolar tafsiloti mijozga CHIQMAYDI. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();
    const requestId = req.headers['x-request-id'];

    let status = 500;
    let body: ApiFailure['error'] = { code: 'INTERNAL', message: 'Ichki xato' };

    if (exception instanceof DomainError) {
      status = exception.status;
      body = { code: exception.code, message: exception.message, fields: exception.fields };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      body = { code: CODE_BY_STATUS[status] ?? 'ERROR', message: messageOf(exception) };
    } else {
      // Kutilmagan xato: izi logda, mijozga umumiy matn.
      this.logger.error(
        `${req.method} ${req.url} — ${exception instanceof Error ? exception.stack : String(exception)}`,
      );
    }

    const payload: ApiFailure = {
      success: false,
      error: body,
      ...(typeof requestId === 'string' ? { requestId } : {}),
    };
    res.status(status).json(payload);
  }
}

function messageOf(e: HttpException): string {
  const r = e.getResponse();
  if (typeof r === 'string') return r;
  const message = (r as { message?: unknown }).message;
  // class-validator va boshqalar massiv qaytaradi — birinchisi yetarli.
  if (Array.isArray(message)) return String(message[0] ?? e.message);
  return typeof message === 'string' ? message : e.message;
}
