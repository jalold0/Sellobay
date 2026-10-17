import { verifyPassword } from '@ecom/auth';
import { normalizeUzPhone } from '@ecom/utils';

import { apiError, apiOk } from '@/lib/auth/errors';
import { issueSession, requestMeta } from '@/lib/auth/session';
import { loginSchema } from '@/lib/auth/validators';
import { prisma } from '@/lib/db';
import { isStaff } from '@/lib/permissions';
import { enforceRateLimit } from '@/lib/rate-limit';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Parol terib ko'rishdan himoya: IP bo'yicha daqiqasiga 10, bitta hisobga 15 daqiqada 10 urinish.
  const limited = await enforceRateLimit(req, 'login', { limit: 10, windowSec: 60 });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri kiritma");
  }
  const { identifier, password } = parsed.data;
  const perAccount = await enforceRateLimit(
    req,
    'login-account',
    { limit: 10, windowSec: 15 * 60 },
    identifier.toLowerCase().trim(),
  );
  if (perAccount) return perAccount;

  const looksLikePhone = /^\+?\d+$/.test(identifier);
  const normalizedPhone = looksLikePhone ? normalizeUzPhone(identifier) : null;
  const normalizedEmail = !looksLikePhone ? identifier.toLowerCase().trim() : null;

  const user = await prisma.user.findFirst({
    where: normalizedPhone ? { phone: normalizedPhone } : { email: normalizedEmail! },
    select: {
      id: true,
      passwordHash: true,
      status: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      mustChangePassword: true,
      roles: { select: { role: true } },
    },
  });

  if (!user || !user.passwordHash) {
    return apiError(401, 'INVALID_CREDENTIALS', "Email/telefon yoki parol noto'g'ri");
  }
  if (user.status === 'BLOCKED' || user.status === 'DELETED') {
    return apiError(403, 'ACCOUNT_BLOCKED', 'Hisob bloklangan');
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    return apiError(401, 'INVALID_CREDENTIALS', "Email/telefon yoki parol noto'g'ri");
  }

  // Panelga xodim rollari kiradi (bosh admin, admin, operator, moliya, kontent, ombor) —
  // nimani ko'rishi lib/permissions.ts da. Mijoz/sotuvchi/kuryer — yo'q.
  const roleNames = user.roles.map((r: { role: string }) => r.role);
  if (!isStaff(roleNames)) {
    return apiError(403, 'NOT_AN_ADMIN', "Bu hisobga admin paneliga kirish ruxsati yo'q");
  }

  // Status PENDING bo'lsa, kirsishga ruxsat berib, dashboard'da approval kutilmoqda deb ko'rsatamiz
  // (BLOCKED yuqorida tekshirilgan)

  const res = apiOk({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: roleNames,
      mustChangePassword: user.mustChangePassword,
    },
  });
  // «Meni eslab qol» — faqat aniq true bo'lsa uzoq muddatli sessiya.
  const remember = (body as { remember?: unknown } | null)?.remember === true;
  await issueSession(res, user.id, requestMeta(), remember);
  return res;
}
