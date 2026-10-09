// `withApi()` — har bir route uchun yagona o'ram.
//
// NIMA QILADI:
//   • javobni bitta konvertga soladi (`{ success, data }`);
//   • domen xatolarini HTTP holatiga o'giradi (`ApiDomainError`);
//   • Zod validatsiyasini 400 ga, maydon sabablari bilan;
//   • Prisma xatolarini tushunarli javobga;
//   • qolgan HAMMA narsani 500 `INTERNAL` ga — tafsilot TASHQARIGA
//     CHIQMAYDI, lekin Sentry'ga `requestId` bilan ketadi.
//
// NEGA KERAK: ilgari har route o'z `try/catch` ini yozardi va faqat
// O'Z domen xatosini ushlardi. Ushlanmagan istisno Next'ning standart
// 500 sahifasiga tushardi — u HTML qaytaradi, JSON emas. Flutter
// klienti esa HTML'ni o'qiy olmay «Noma'lum xato» ko'rsatardi: aynan
// shu sabab yetkazish suratining nega yuklanmayotganini topish
// qiyin bo'ldi.
//
// NEGA ALOHIDA SERVIS EMAS: izolyatsiya allaqachon bor — Vercel'da
// har route mustaqil lambda chaqiruvi, biri yiqilsa boshqasiga
// ta'sir qilmaydi. Gateway'ni alohida protsess qilish qo'shimcha
// tarmoq sakrashi va YANGI yiqilish nuqtasi bo'lardi. Shuning uchun
// bu — servis emas, qatlam.

import { ApiDomainError, isApiDomainError } from '@ecom/api-contract';
import { Prisma } from '@ecom/database';
import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import type { NextRequest } from 'next/server';

/** Route'ning o'zgaruvchan yo'l qismlari (`[id]`, `[slug]`). */
export interface RouteContext<P extends Record<string, string> = Record<string, string>> {
  params: P;
  /** Log bilan bog'lash uchun — xato javobida ham qaytadi. */
  requestId: string;
}

type Handler<P extends Record<string, string>> = (
  req: NextRequest,
  ctx: RouteContext<P>,
) => Promise<unknown>;

function envelope(status: number, body: unknown, requestId: string) {
  return NextResponse.json(body, {
    status,
    // Foydalanuvchi skrinshot yuborsa, shu id bo'yicha aniq chaqiruv
    // topiladi. Sarlavhada ham, tanada ham — birinchisi proxy
    // loglarida, ikkinchisi ilovada ko'rinadi.
    headers: { 'x-request-id': requestId },
  });
}

function fail(
  status: number,
  code: string,
  message: string,
  requestId: string,
  fields?: Record<string, string>,
) {
  return envelope(
    status,
    { success: false, error: { code, message, fields }, requestId },
    requestId,
  );
}

/**
 * Prisma xatolarini FOYDALANUVCHI tushunadigan javobga o'giradi.
 *
 * Xom Prisma xabari tashqariga chiqmasligi kerak: unda jadval va
 * ustun nomlari bo'ladi, bu esa sxemani oshkor qiladi.
 */
function fromPrisma(e: unknown, requestId: string) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    switch (e.code) {
      case 'P2002':
        return fail(409, 'ALREADY_EXISTS', 'Bunday yozuv allaqachon mavjud', requestId);
      case 'P2025':
        return fail(404, 'NOT_FOUND', 'Topilmadi', requestId);
      case 'P2003':
        return fail(409, 'IN_USE', 'Bu yozuv boshqa joyda ishlatilmoqda', requestId);
      default:
        return null;
    }
  }
  // Ulanish muammosi — vaqtinchalik. Klient qayta urinishi mumkin.
  if (
    e instanceof Prisma.PrismaClientInitializationError ||
    e instanceof Prisma.PrismaClientRustPanicError
  ) {
    return fail(
      503,
      'DB_UNAVAILABLE',
      'Baza vaqtincha javob bermayapti. Birozdan keyin urinib ko`ring.',
      requestId,
    );
  }
  return null;
}

export function withApi<P extends Record<string, string> = Record<string, string>>(
  handler: Handler<P>,
) {
  return async (req: NextRequest, ctx?: { params?: P }): Promise<NextResponse> => {
    // Mijoz bergan id'ga ISHONMAYMIZ formatiga: u loglarga tushadi va
    // uzun yoki nazoratsiz qiymat log injeksiyasiga yo'l ochardi.
    const incoming = req.headers.get('x-request-id');
    const requestId = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();

    try {
      const data = await handler(req, { params: (ctx?.params ?? {}) as P, requestId });
      return envelope(200, { success: true, data }, requestId);
    } catch (e) {
      if (isApiDomainError(e)) {
        return fail(e.status, e.code, e.message, requestId, e.fields);
      }

      if (e instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const issue of e.issues) {
          const path = issue.path.join('.') || '_';
          fields[path] ??= issue.message;
        }
        return fail(
          400,
          'VALIDATION',
          e.issues[0]?.message ?? "Ma'lumot noto'g'ri",
          requestId,
          fields,
        );
      }

      const prisma = fromPrisma(e, requestId);
      if (prisma) return prisma;

      // Kutilmagan xato. Sabab FAQAT logda qoladi — xabarda baza
      // tuzilishi yoki ichki yo'l bo'lishi mumkin.
      Sentry.captureException(e, {
        tags: { requestId, route: req.nextUrl.pathname },
      });
      console.error(`[api] ${requestId} ${req.method} ${req.nextUrl.pathname}`, e);

      return fail(
        500,
        'INTERNAL',
        'Kutilmagan xato yuz berdi. Birozdan keyin urinib ko`ring.',
        requestId,
      );
    }
  };
}

/**
 * Kirgan foydalanuvchini qaytaradi yoki 401 UloqTIRADI.
 *
 * `withApi()` ichida ishlatiladi: har route'da
 * `if (!user) return apiError(401, ...)` ni takrorlamaslik uchun.
 * Qaytarilgan qiymat NULL EMAS — chaqiruvchi qo'shimcha tekshiruv
 * yozmaydi va shu bilan «tekshirishni unutish» xatosi yo'qoladi.
 */
export async function requireUser() {
  const { getCurrentUser } = await import('@/lib/auth/session');
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiDomainError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
  }
  return user;
}
