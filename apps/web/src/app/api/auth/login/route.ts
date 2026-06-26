import { NextRequest } from 'next/server';
import { verifyPassword } from '@ecom/auth';
import { normalizeUzPhone } from '@ecom/utils';
import { prisma } from '@/lib/db';
import { loginSchema } from '@/lib/auth/validators';
import { apiError, apiOk } from '@/lib/auth/errors';
import { createSession, requestMeta, setCookies } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri kiritma");
  }
  const { identifier, password } = parsed.data;

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

  // Web — cookie; mobile — body'dagi tokenlar (Bearer uchun)
  const tokens = await createSession(user.id, requestMeta());
  const res = apiOk({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    tokens,
  });
  setCookies(res, tokens.access, tokens.refresh);
  return res;
}
