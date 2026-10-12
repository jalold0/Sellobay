import { type DynamicModule, Global, Module } from '@nestjs/common';

import { ENV, loadEnv } from './config';

import type { z } from 'zod';

/** Servisning tekshirilgan muhitini global `ENV` sifatida beradi. */
@Global()
@Module({})
export class EnvModule {
  static forRoot<S extends z.ZodTypeAny>(schema: S): DynamicModule {
    return {
      module: EnvModule,
      providers: [{ provide: ENV, useFactory: () => loadEnv(schema) }],
      exports: [ENV],
    };
  }
}
