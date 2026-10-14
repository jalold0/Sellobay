// Bildirishnomalar: faqat o'z yozuvlari, faqat IN_APP, kursorli sahifa.
//
// Prisma soxtalashtiriladi — tekshirilayotgan narsa so'rov shartlari.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = {
  notification: {
    findMany: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({ prisma: db }));

const { listNotifications, markNotificationsRead, serializeNotification } = await import(
  './notifications-server'
);

function row(id: string, readAt: Date | null = null) {
  return {
    id,
    title: 'Buyurtma yo‘lda',
    body: 'SB-1 kargoga topshirildi',
    data: { orderNumber: 'SB-1' },
    readAt,
    createdAt: new Date('2026-10-14T10:00:00Z'),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.notification.count.mockResolvedValue(3);
});

describe('listNotifications', () => {
  it('faqat shu foydalanuvchining IN_APP yozuvlari, eng yangisi birinchi', async () => {
    db.notification.findMany.mockResolvedValue([row('a')]);
    await listNotifications('u1');

    const args = db.notification.findMany.mock.calls[0]?.[0];
    expect(args.where).toEqual({ channel: 'IN_APP', userId: 'u1' });
    expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(db.notification.count.mock.calls[0]?.[0].where).toEqual({
      channel: 'IN_APP',
      userId: 'u1',
      readAt: null,
    });
  });

  it('bitta ortiq yozuv bo`lsa — keyingi sahifa kursori beriladi', async () => {
    db.notification.findMany.mockResolvedValue([row('a'), row('b'), row('c')]);
    const page = await listNotifications('u1', { limit: 2 });

    expect(page.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(page.nextCursor).toBe('b');
    expect(page.unreadCount).toBe(3);
  });

  it('oxirgi sahifada kursor yo`q', async () => {
    db.notification.findMany.mockResolvedValue([row('a')]);
    const page = await listNotifications('u1', { limit: 2 });
    expect(page.nextCursor).toBeNull();
  });

  it('kursor berilsa — o`sha yozuvdan keyingisidan boshlanadi', async () => {
    db.notification.findMany.mockResolvedValue([]);
    await listNotifications('u1', { cursor: 'b' });
    const args = db.notification.findMany.mock.calls[0]?.[0];
    expect(args.cursor).toEqual({ id: 'b' });
    expect(args.skip).toBe(1);
  });

  it('limit chegaralanadi', async () => {
    db.notification.findMany.mockResolvedValue([]);
    await listNotifications('u1', { limit: 5000 });
    expect(db.notification.findMany.mock.calls[0]?.[0].take).toBe(51);
  });
});

describe('markNotificationsRead', () => {
  it('tanlanganlar — faqat o`ziniki va hali o`qilmaganlari', async () => {
    db.notification.updateMany.mockResolvedValue({ count: 1 });
    db.notification.count.mockResolvedValue(2);
    const res = await markNotificationsRead('u1', ['a']);

    const args = db.notification.updateMany.mock.calls[0]?.[0];
    expect(args.where).toEqual({ channel: 'IN_APP', userId: 'u1', readAt: null, id: { in: ['a'] } });
    expect(args.data.status).toBe('READ');
    expect(args.data.readAt).toBeInstanceOf(Date);
    expect(res).toEqual({ updated: 1, unreadCount: 2 });
  });

  it('ids bo`lmasa — hammasi', async () => {
    db.notification.updateMany.mockResolvedValue({ count: 3 });
    await markNotificationsRead('u1', null);
    expect(db.notification.updateMany.mock.calls[0]?.[0].where).toEqual({
      channel: 'IN_APP',
      userId: 'u1',
      readAt: null,
    });
  });
});

describe('serializeNotification', () => {
  it('o`qilganlik readAt dan; massiv data tashlab yuboriladi', () => {
    expect(serializeNotification(row('a', new Date())).read).toBe(true);
    expect(serializeNotification({ ...row('a'), data: [1, 2] }).data).toBeNull();
    expect(serializeNotification(row('a')).createdAt).toBe('2026-10-14T10:00:00.000Z');
  });
});
