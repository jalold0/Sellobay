import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AllExceptionsFilter } from './all-exceptions.filter';
import { EnvelopeInterceptor } from './envelope';
import { InternalKeyGuard, UserGuard } from './gateway-user';

/**
 * Hamma ICHKI servis (auth, catalog, orders) import qiladigan umumiy qoidalar:
 * ichki kalit, kirish talabi (standart — yopiq), yagona konvert va xato shakli.
 * Gateway buni import QILMAYDI: u so'rovni o'zgartirmay proksi qiladi.
 */
@Module({
  providers: [
    { provide: APP_GUARD, useClass: InternalKeyGuard },
    { provide: APP_GUARD, useClass: UserGuard },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class CoreModule {}
