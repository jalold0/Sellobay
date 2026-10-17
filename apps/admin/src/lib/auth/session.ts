// Session boshqaruvi: JWT issue/verify + refresh rotation + cookie set/clear
import crypto from 'node:crypto';

import { signAccessToken, verifyToken, type AccessPayload } from '@ecom/auth';
import { cookies, headers } from 'next/headers';

import { prisma } from '@/lib/db';

import {
  requireAccessSecret,
  ACCESS_TTL,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  COOKIE_REMEMBER,
  REFRESH_TTL_DAYS,
  SESSION_ONLY_TTL_HOURS,
} from './constants';

import type { NextResponse } from 'next/server';

const REFRESH_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
const SESSION_ONLY_TTL_MS = SESSION_ONLY_TTL_HOURS * 60 * 60 * 1000;

/** Refresh token muddati: «Meni eslab qol» — REFRESH_TTL_DAYS kun, aks holda SESSION_ONLY_TTL_HOURS soat. */
function refreshExpiry(remember: boolean): Date {
  return new Date(Date.now() + (remember ? REFRESH_TTL_MS : SESSION_ONLY_TTL_MS));
}

function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function fetchUserRoles(userId: string): Promise<string[]> {
  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId },
    select: { role: true },
  });
  return assignments.map((a: { role: string }) => a.role);
}

// Login muvaffaqiyatli bo'lgandan keyin chaqiriladi.
// UserSession + RefreshToken yaratadi, JWT issue qiladi, cookie'larni response'ga qo'yadi.
export async function issueSession(
  res: NextResponse,
  userId: string,
  meta: { deviceName?: string; userAgent?: string; ipAddress?: string } = {},
  /** «Meni eslab qol» — false bo'lsa cookie'lar brauzer yopilganda o'chadi. */
  remember = true,
): Promise<NextResponse> {
  const roles = await fetchUserRoles(userId);

  const session = await prisma.userSession.create({
    data: {
      userId,
      deviceName: meta.deviceName,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    },
  });

  const access = await signAccessToken(
    { sub: userId, roles, sid: session.id },
    { secret: requireAccessSecret(), expiresIn: ACCESS_TTL, issuer: 'sellobay' },
  );

  const refreshRaw = generateOpaqueToken();
  const refreshHash = hashToken(refreshRaw);
  const expiresAt = refreshExpiry(remember);

  await prisma.refreshToken.create({
    data: { userId, tokenHash: refreshHash, expiresAt },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });

  setCookies(res, access, refreshRaw, remember);
  return res;
}

export function setCookies(res: NextResponse, access: string, refresh: string, remember = true) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set({
    name: COOKIE_ACCESS,
    value: access,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    // Access cookie qisqa muddatli — JWT ichida expiry bor, cookie ham mosroq
    ...(remember ? { maxAge: 60 * 60 } : {}), // 1h cap (JWT 15min bilan tekshiriladi)
  });
  res.cookies.set({
    name: COOKIE_REFRESH,
    value: refresh,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    // Eslab qolinmagan bo'lsa maxAge yo'q — sessiya cookie, brauzer yopilganda o'chadi.
    ...(remember ? { maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 } : {}),
  });
  res.cookies.set({
    name: COOKIE_REMEMBER,
    value: remember ? '1' : '0',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    ...(remember ? { maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 } : {}),
  });
}

export function clearCookies(res: NextResponse) {
  res.cookies.delete(COOKIE_ACCESS);
  res.cookies.delete(COOKIE_REFRESH);
  res.cookies.delete(COOKIE_REMEMBER);
}

// Refresh token rotation: eskini revoke qiladi, yangisini chiqaradi
export async function rotateRefresh(
  res: NextResponse,
  refreshRaw: string,
): Promise<NextResponse | null> {
  const refreshHash = hashToken(refreshRaw);
  const current = await prisma.refreshToken.findUnique({ where: { tokenHash: refreshHash } });

  if (!current || current.revokedAt || current.expiresAt < new Date()) {
    return null;
  }

  // Eski tokenni revoke qilamiz, yangisini ulashtirib qo'yamiz (replacedById)
  const newRaw = generateOpaqueToken();
  const newHash = hashToken(newRaw);
  // Login paytidagi «Meni eslab qol» tanlovi rotatsiyada ham saqlanadi.
  const remember = cookies().get(COOKIE_REMEMBER)?.value !== '0';
  const newExpires = refreshExpiry(remember);

  const newToken = await prisma.refreshToken.create({
    data: { userId: current.userId, tokenHash: newHash, expiresAt: newExpires },
  });

  await prisma.refreshToken.update({
    where: { id: current.id },
    data: { revokedAt: new Date(), replacedById: newToken.id },
  });

  const roles = await fetchUserRoles(current.userId);
  const access = await signAccessToken(
    { sub: current.userId, roles },
    { secret: requireAccessSecret(), expiresIn: ACCESS_TTL, issuer: 'sellobay' },
  );

  setCookies(res, access, newRaw, remember);
  return res;
}

/** Parol almashganda — joriy qurilmadan tashqari hamma refresh token'lar bekor qilinadi. */
export async function revokeOtherRefreshTokens(
  userId: string,
  currentRefreshRaw: string | undefined,
): Promise<number> {
  const keep = currentRefreshRaw ? hashToken(currentRefreshRaw) : null;
  const res = await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null, ...(keep ? { tokenHash: { not: keep } } : {}) },
    data: { revokedAt: new Date() },
  });
  return res.count;
}

export async function revokeRefresh(refreshRaw: string): Promise<void> {
  const refreshHash = hashToken(refreshRaw);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: refreshHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// Server component / route handler ichida joriy user'ni o'qish
export async function getCurrentUser() {
  const token = cookies().get(COOKIE_ACCESS)?.value;
  if (!token) return null;
  try {
    const payload = await verifyToken<AccessPayload>(token, requireAccessSecret());
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        locale: true,
        status: true,
        loyaltyPoints: true,
        gender: true,
        birthDate: true,
        mustChangePassword: true,
        roles: { select: { role: true } },
      },
    });
    if (!user || user.status === 'BLOCKED' || user.status === 'DELETED') return null;
    // Rollar bazadan (token ichidagisidan emas): xodimdan rol olinsa yoki u bloklansa,
    // API'lar darhol ruxsat bermaydi — access token tugashini (15 daqiqa) kutmasdan.
    const { roles, ...rest } = user;
    return { ...rest, roles: roles.map((r) => r.role as string) };
  } catch {
    return null;
  }
}

export function requestMeta() {
  const h = headers();
  return {
    userAgent: h.get('user-agent') ?? undefined,
    ipAddress: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
  };
}
