// Mijozning ilova ichidagi bildirishnomalari (IN_APP).
//
// Yozuvlarni boshqa joylar yaratadi (masalan admin `global-notify.ts`);
// bu modul faqat o'qish va «o'qildi» belgilashni beradi. Push, SMS va
// email yozuvlari bu ro'yxatga kirmaydi — ular mijozga boshqa kanal
// orqali yetkazilgan, «qo'ng'iroq» faqat ilova ichidagi xabarlar uchun.

import { prisma } from '@/lib/db';

import type { Prisma } from '@ecom/database';

export const NOTIFICATIONS_PAGE_MAX = 50;
const NOTIFICATIONS_PAGE_DEFAULT = 20;

const IN_APP: Prisma.NotificationWhereInput = { channel: 'IN_APP' };

export interface NotificationDto {
  id: string;
  title: string;
  body: string;
  /// Yozuvchi qo'ygan qo'shimcha ma'lumot (masalan `orderNumber`) —
  /// ilova bosilganda qayerga o'tishni shundan biladi.
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  data: Prisma.JsonValue | null;
  readAt: Date | null;
  createdAt: Date;
};

export function serializeNotification(row: NotificationRow): NotificationDto {
  const data =
    row.data !== null && typeof row.data === 'object' && !Array.isArray(row.data)
      ? (row.data as Record<string, unknown>)
      : null;
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    data,
    read: row.readAt !== null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function unreadWhere(userId: string): Prisma.NotificationWhereInput {
  return { ...IN_APP, userId, readAt: null };
}

export async function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({ where: unreadWhere(userId) });
}

/// Eng yangisi birinchi. Kursor — oxirgi ko'rilgan yozuv `id` si.
export async function listNotifications(
  userId: string,
  opts: { cursor?: string | null; limit?: number | null } = {},
): Promise<{ items: NotificationDto[]; nextCursor: string | null; unreadCount: number }> {
  const limit = Math.min(
    Math.max(opts.limit ?? NOTIFICATIONS_PAGE_DEFAULT, 1),
    NOTIFICATIONS_PAGE_MAX,
  );
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { ...IN_APP, userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      select: { id: true, title: true, body: true, data: true, readAt: true, createdAt: true },
    }),
    countUnread(userId),
  ]);
  const page = rows.slice(0, limit);
  return {
    items: page.map(serializeNotification),
    nextCursor: rows.length > limit ? (page[page.length - 1]?.id ?? null) : null,
    unreadCount,
  };
}

/// O'qildi deb belgilaydi. `ids` bo'lmasa — hammasi.
///
/// Faqat SHU foydalanuvchining yozuvlari: begona `id` jim o'tkazib
/// yuboriladi (xato emas — kimdir boshqa qurilmada allaqachon o'chirgan
/// bo'lishi mumkin). Allaqachon o'qilgan yozuvning `readAt` i o'zgarmaydi.
export async function markNotificationsRead(
  userId: string,
  ids: string[] | null,
): Promise<{ updated: number; unreadCount: number }> {
  const where: Prisma.NotificationWhereInput = {
    ...unreadWhere(userId),
    ...(ids ? { id: { in: ids } } : {}),
  };
  const { count } = await prisma.notification.updateMany({
    where,
    data: { readAt: new Date(), status: 'READ' },
  });
  return { updated: count, unreadCount: await countUnread(userId) };
}
