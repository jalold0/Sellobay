import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

let cached: PrismaClient | undefined;

function resolveClient(): PrismaClient {
  if (cached) return cached;

  cached =
    global.__prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
    });

  // Dev'da hot-reload har safar yangi klient yaratmasligi uchun global'da saqlanadi.
  if (process.env.NODE_ENV !== 'production') {
    global.__prisma = cached;
  }

  return cached;
}

/**
 * Prisma klienti — DANGASA (lazy) yaratiladi.
 *
 * Ilgari u modul yuklanishida yaratilardi. Muammo shunda: `src/index.ts`
 * `export * from '@prisma/client'` va `export { prisma }` ni BIR barrel'dan
 * beradi, ya'ni `@ecom/database` dan faqat tip yoki `Prisma.Decimal` olgan fayl
 * ham yon ta'sir sifatida Postgres query engine'ini (native .so) ko'tarardi.
 *
 * Buni CI ochib berdi: sof narx-hisob testi (apps/web/src/lib/promo.test.ts)
 * `Prisma.Decimal` uchun import qilgani sababli PrismaClientInitializationError
 * bergan — 34 testning hammasi o'tgan bo'lsa ham job yiqilgan.
 *
 * Proxy birinchi murojaatda (masalan `prisma.order`) klientni yaratadi, shuning
 * uchun 22 ta chaqiruv joyi o'zgarmaydi. Bog'lanish (`$connect`) baribir
 * birinchi so'rovda bo'ladi — Prisma o'zi dangasa ulanadi.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = resolveClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function'
      ? (value as (...a: unknown[]) => unknown).bind(client)
      : value;
  },
  set(_target, prop, value) {
    return Reflect.set(resolveClient(), prop, value);
  },
  has(_target, prop) {
    return prop in resolveClient();
  },
});

export type { PrismaClient };
