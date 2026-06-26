import { NextRequest } from 'next/server';
import { hashPassword } from '@ecom/auth';
import { normalizeUzPhone } from '@ecom/utils';
import { prisma } from '@/lib/db';
import { registerSchema } from '@/lib/auth/validators';
import { apiError, apiOk } from '@/lib/auth/errors';
import { createSession, requestMeta, setCookies } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri kiritma");
  }
  const { email, phone, password, firstName, lastName, locale, role } = parsed.data;
  const isSeller = role === 'seller';

  const normalizedPhone = phone ? normalizeUzPhone(phone) : null;
  if (phone && !normalizedPhone) {
    return apiError(400, 'VALIDATION', "Telefon raqami noto'g'ri (+998XXXXXXXXX kerak)");
  }
  const normalizedEmail = email?.toLowerCase().trim();

  // Mavjudligini tekshirish
  if (normalizedEmail) {
    const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (exists) return apiError(409, 'EMAIL_TAKEN', "Bu email allaqachon ro'yxatdan o'tgan");
  }
  if (normalizedPhone) {
    const exists = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (exists) return apiError(409, 'PHONE_TAKEN', "Bu telefon allaqachon ro'yxatdan o'tgan");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail ?? null,
      phone: normalizedPhone,
      passwordHash,
      firstName,
      lastName,
      locale,
      // Sotuvchi: tasdiq kutilmoqda (admin approval). Mijoz: darhol faol.
      status: isSeller ? 'PENDING' : 'ACTIVE',
      emailVerifiedAt: null,
      roles: {
        create: isSeller ? [{ role: 'CUSTOMER' }, { role: 'SELLER' }] : [{ role: 'CUSTOMER' }],
      },
    },
    select: { id: true, email: true, phone: true, firstName: true, lastName: true },
  });

  // Sotuvchi sifatida ariza — Seller entity (PENDING) yaratamiz, admin tasdiqlashi shart
  if (isSeller) {
    const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Sotuvchi';
    await prisma.seller.create({
      data: {
        ownerUserId: user.id,
        legalName: displayName,
        brandName: displayName,
        email: normalizedEmail,
        phone: normalizedPhone,
        status: 'PENDING',
      },
    });
  }

  // Sotuvchi PENDING — sessiya bermaymiz, admin tasdiqlagandan keyin login qiladi
  if (isSeller) {
    return apiOk({ user, pendingApproval: true });
  }
  const tokens = await createSession(user.id, requestMeta());
  const res = apiOk({ user, pendingApproval: false, tokens });
  setCookies(res, tokens.access, tokens.refresh);
  return res;
}
