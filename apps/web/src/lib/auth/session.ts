// Session boshqaruvi: JWT issue/verify + refresh rotation + cookie set/clear
import crypto from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { signAccessToken, verifyToken, type AccessPayload } from '@ecom/auth';
import { prisma } from '@/lib/db';
import {
  ACCESS_SECRET,
  ACCESS_TTL,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  REFRESH_TTL_DAYS,
} from './constants';

const REFRESH_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;

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

export interface SessionTokens {
  access: string;
  refresh: string;
}

// UserSession + RefreshToken yaratadi, JWT issue qiladi va RAW tokenlarni qaytaradi.
// Cookie qo'ymaydi — chaqiruvchi (web → setCookies, mobile → body) o'zi hal qiladi.
export async function createSession(
  userId: string,
  meta: { deviceName?: string; userAgent?: string; ipAddress?: string } = {},
): Promise<SessionTokens> {
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
    { secret: ACCESS_SECRET, expiresIn: ACCESS_TTL, issuer: 'sellobay' },
  );

  const refreshRaw = generateOpaqueToken();
  const refreshHash = hashToken(refreshRaw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await prisma.refreshToken.create({
    data: { userId, tokenHash: refreshHash, expiresAt },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });

  return { access, refresh: refreshRaw };
}

// Login muvaffaqiyatli bo'lgandan keyin chaqiriladi (web — cookie asosida).
// Cookie qo'yadi VA raw tokenlarni qaytaradi (mobile body'ga qo'shishi uchun).
export async function issueSession(
  res: NextResponse,
  userId: string,
  meta: { deviceName?: string; userAgent?: string; ipAddress?: string } = {},
): Promise<SessionTokens> {
  const tokens = await createSession(userId, meta);
  setCookies(res, tokens.access, tokens.refresh);
  return tokens;
}

export function setCookies(res: NextResponse, access: string, refresh: string) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set({
    name: COOKIE_ACCESS,
    value: access,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    // Access cookie qisqa muddatli — JWT ichida expiry bor, cookie ham mosroq
    maxAge: 60 * 60, // 1h cap (JWT 15min bilan tekshiriladi)
  });
  res.cookies.set({
    name: COOKIE_REFRESH,
    value: refresh,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearCookies(res: NextResponse) {
  res.cookies.delete(COOKIE_ACCESS);
  res.cookies.delete(COOKIE_REFRESH);
}

// Refresh token rotation: eskini revoke qiladi, yangisini chiqaradi
// Refresh tokenni rotatsiya qiladi va YANGI raw tokenlarni qaytaradi (cookie qo'ymaydi).
// Web (cookie) ham, mobile (body) ham shu yadrodan foydalanadi.
export async function rotateRefreshTokens(refreshRaw: string): Promise<SessionTokens | null> {
  const refreshHash = hashToken(refreshRaw);
  const current = await prisma.refreshToken.findUnique({ where: { tokenHash: refreshHash } });

  if (!current || current.revokedAt || current.expiresAt < new Date()) {
    return null;
  }

  // Eski tokenni revoke qilamiz, yangisini ulashtirib qo'yamiz (replacedById)
  const newRaw = generateOpaqueToken();
  const newHash = hashToken(newRaw);
  const newExpires = new Date(Date.now() + REFRESH_TTL_MS);

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
    { secret: ACCESS_SECRET, expiresIn: ACCESS_TTL, issuer: 'sellobay' },
  );

  return { access, refresh: newRaw };
}

export async function rotateRefresh(
  res: NextResponse,
  refreshRaw: string,
): Promise<NextResponse | null> {
  const tokens = await rotateRefreshTokens(refreshRaw);
  if (!tokens) return null;
  setCookies(res, tokens.access, tokens.refresh);
  return res;
}

export async function revokeRefresh(refreshRaw: string): Promise<void> {
  const refreshHash = hashToken(refreshRaw);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: refreshHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// Server component / route handler ichida joriy user'ni o'qish.
// Token manbai: cookie (web) YOKI `Authorization: Bearer <token>` (mobile).
export async function getCurrentUser() {
  const cookieToken = cookies().get(COOKIE_ACCESS)?.value;
  const authHeader = headers().get('authorization') ?? headers().get('Authorization');
  const bearerToken =
    authHeader && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : undefined;
  const token = cookieToken ?? bearerToken;
  if (!token) return null;
  try {
    const payload = await verifyToken<AccessPayload>(token, ACCESS_SECRET);
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
      },
    });
    if (!user || user.status === 'BLOCKED' || user.status === 'DELETED') return null;
    return { ...user, roles: payload.roles ?? [] };
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
