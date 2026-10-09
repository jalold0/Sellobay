import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Observable, map } from 'rxjs';

/**
 * Yagona javob konverti (`@ecom/api-contract` bilan bir xil shakl):
 *   muvaffaqiyat: `{ success: true, data }`
 *   xato:         `{ success: false, error: { code, message, fields? }, requestId? }`
 *
 * Flutter va web klientlari shu shaklga tayanadi, shuning uchun u o'zgarmaydi.
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string; fields?: Record<string, string> };
  requestId?: string;
}

/** Konvertga o'ralmasligi kerak bo'lgan javob (health, fayl, proksi). */
export const RAW_RESPONSE = 'raw-response';
export const RawResponse = () => SetMetadata(RAW_RESPONSE, true);

function isEnvelope(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as { success: unknown }).success === 'boolean'
  );
}

/** Controller qaytargan qiymatni `{ success: true, data }` ga o'raydi. */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const raw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (raw) return next.handle();

    return next.handle().pipe(map((data) => (isEnvelope(data) ? data : { success: true, data })));
  }
}

/**
 * Domen xatosi. `status` HTTP kodi, `code` esa klient tanib oladigan barqaror
 * kalit (`NOT_FOUND`, `ALREADY_CLAIMED`...); matn foydalanuvchiga ko'rinadi.
 */
export class DomainError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
