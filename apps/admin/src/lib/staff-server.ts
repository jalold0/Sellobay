// Panel xodimlari: qo'shish, rol berish, bloklash, parolni tiklash (ADR 0019).
//
// Yangi xodimga vaqtinchalik parol beriladi va u FAQAT bir marta (javobda) ko'rsatiladi —
// bazada faqat argon2 hash. Xodim birinchi kirishda parolini almashtirmaguncha hech qanday
// panel API'si ishlamaydi (`mustChangePassword`, `requirePermission`).

import crypto from 'node:crypto';

import { hashPassword } from '@ecom/auth';
import { normalizeUzPhone } from '@ecom/utils';
import { z } from 'zod';

import { writeAudit } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { STAFF_ROLES, isStaffRole, type StaffRole } from '@/lib/permissions';

import type { UserRole } from '@ecom/database';

export class StaffError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'StaffError';
  }
}

const roleList = z
  .array(z.enum(STAFF_ROLES))
  .min(1, 'Kamida bitta rol tanlang')
  .transform((r) => Array.from(new Set(r)));

export const createStaffSchema = z.object({
  firstName: z.string().trim().min(1, 'Ismni kiriting').max(50),
  lastName: z.string().trim().min(1, 'Familiyani kiriting').max(50),
  email: z.string().trim().toLowerCase().email("Email noto'g'ri"),
  phone: z.string().trim().max(20).optional().nullable(),
  roles: roleList,
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z
  .object({
    roles: roleList.optional(),
    status: z.enum(['ACTIVE', 'BLOCKED']).optional(),
  })
  .refine((v) => v.roles !== undefined || v.status !== undefined, {
    message: "O'zgartirish yo'q",
  });
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

// O/0, l/1/I kabi adashtiriladigan belgilarsiz — parol og'zaki yoki qog'ozda beriladi.
const LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';

/** 12 belgili vaqtinchalik parol: kamida bitta harf va bitta raqam (parol siyosatiga mos). */
export function generateTempPassword(length = 12): string {
  const all = LETTERS + DIGITS;
  const chars = [
    LETTERS[crypto.randomInt(LETTERS.length)]!,
    DIGITS[crypto.randomInt(DIGITS.length)]!,
  ];
  while (chars.length < length) chars.push(all[crypto.randomInt(all.length)]!);
  // Fisher–Yates: harf va raqam doim boshida turmasin.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}

const staffSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  status: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  roles: { select: { role: true } },
} as const;

type StaffRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  roles: { role: string }[];
};

function toDto(u: StaffRow) {
  return {
    id: u.id,
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    email: u.email,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    status: u.status,
    mustChangePassword: u.mustChangePassword,
    // Faqat xodim rollari — CUSTOMER kabi rollar ro'yxatni chalkashtiradi.
    // STAFF_ROLES tartibida (bosh admin birinchi) — bazadagi qo'shilish tartibida emas.
    roles: STAFF_ROLES.filter((s) => u.roles.some((r) => r.role === s)),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}
export type StaffDto = ReturnType<typeof toDto>;

export async function listStaff(): Promise<StaffDto[]> {
  const users = await prisma.user.findMany({
    where: { roles: { some: { role: { in: [...STAFF_ROLES] } } }, status: { not: 'DELETED' } },
    orderBy: { createdAt: 'asc' },
    take: 500,
    select: staffSelect,
  });
  return users.map(toDto);
}

function assertMayGrant(actorRoles: string[], roles: StaffRole[]) {
  // Hozir xodimlarni faqat bosh admin boshqaradi, lekin xarita kengaysa ham:
  // bosh admin rolini faqat bosh admin bera oladi.
  if (roles.includes('SUPER_ADMIN') && !actorRoles.includes('SUPER_ADMIN')) {
    throw new StaffError(403, 'FORBIDDEN', 'Bosh admin rolini faqat bosh admin bera oladi');
  }
}

export async function createStaff(
  input: CreateStaffInput,
  actor: { id: string; roles: string[] },
): Promise<{ staff: StaffDto; tempPassword: string }> {
  assertMayGrant(actor.roles, input.roles);

  let phone: string | null = null;
  if (input.phone) {
    phone = normalizeUzPhone(input.phone);
    if (!phone) throw new StaffError(400, 'VALIDATION', "Telefon raqami noto'g'ri (+998...)");
  }

  const taken = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, ...(phone ? [{ phone }] : [])] },
    select: { email: true },
  });
  if (taken) {
    throw new StaffError(
      409,
      taken.email === input.email ? 'EMAIL_TAKEN' : 'PHONE_TAKEN',
      taken.email === input.email
        ? 'Bu email bilan hisob allaqachon bor'
        : 'Bu telefon raqami bilan hisob allaqachon bor',
    );
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        phone,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
        status: 'ACTIVE',
        mustChangePassword: true,
        roles: { create: input.roles.map((role) => ({ role: role as UserRole })) },
      },
      select: staffSelect,
    });
    await writeAudit(
      {
        userId: actor.id,
        action: 'staff.create',
        resource: 'User',
        resourceId: created.id,
        meta: { roles: input.roles },
      },
      tx,
    );
    return created;
  });

  return { staff: toDto(user), tempPassword };
}

async function loadStaff(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: staffSelect });
  if (!user || user.status === 'DELETED' || !user.roles.some((r) => isStaffRole(r.role))) {
    throw new StaffError(404, 'NOT_FOUND', 'Xodim topilmadi');
  }
  return user;
}

/** Faol bosh adminlar soni — oxirgisini bloklab yoki rolini olib panelni egasiz qoldirmaslik uchun. */
async function activeSuperAdmins(): Promise<number> {
  return prisma.user.count({
    where: { status: 'ACTIVE', roles: { some: { role: 'SUPER_ADMIN' } } },
  });
}

export async function updateStaff(
  id: string,
  input: UpdateStaffInput,
  actor: { id: string; roles: string[] },
): Promise<StaffDto> {
  if (id === actor.id) {
    throw new StaffError(400, 'SELF_EDIT', "O'z rolingiz va holatingizni o'zgartira olmaysiz");
  }
  const user = await loadStaff(id);
  const current = user.roles.map((r) => r.role).filter(isStaffRole);
  const isSuper = current.includes('SUPER_ADMIN');

  if (input.roles) assertMayGrant(actor.roles, input.roles);
  if (isSuper && !actor.roles.includes('SUPER_ADMIN')) {
    throw new StaffError(403, 'FORBIDDEN', "Bosh adminni faqat bosh admin o'zgartira oladi");
  }

  const losesSuper =
    isSuper &&
    user.status === 'ACTIVE' &&
    ((input.roles && !input.roles.includes('SUPER_ADMIN')) || input.status === 'BLOCKED');
  if (losesSuper && (await activeSuperAdmins()) <= 1) {
    throw new StaffError(400, 'LAST_SUPER_ADMIN', "Oxirgi faol bosh adminni o'zgartirib bo'lmaydi");
  }

  await prisma.$transaction(async (tx) => {
    if (input.roles) {
      const next = input.roles;
      const remove = current.filter((r) => !next.includes(r));
      const add = next.filter((r) => !current.includes(r));
      if (remove.length) {
        await tx.userRoleAssignment.deleteMany({
          where: { userId: id, role: { in: remove as UserRole[] } },
        });
      }
      for (const role of add) {
        await tx.userRoleAssignment.create({ data: { userId: id, role: role as UserRole } });
      }
      if (remove.length || add.length) {
        await writeAudit(
          {
            userId: actor.id,
            action: 'staff.roles',
            resource: 'User',
            resourceId: id,
            meta: { from: current, to: next },
          },
          tx,
        );
      }
    }
    if (input.status && input.status !== user.status) {
      await tx.user.update({ where: { id }, data: { status: input.status } });
      if (input.status === 'BLOCKED') {
        // Bloklangan xodimning barcha qurilmalardagi sessiyasi yopiladi.
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await writeAudit(
        {
          userId: actor.id,
          action: input.status === 'BLOCKED' ? 'staff.block' : 'staff.unblock',
          resource: 'User',
          resourceId: id,
        },
        tx,
      );
    }
  });

  return toDto(await loadStaff(id));
}

export async function resetStaffPassword(
  id: string,
  actor: { id: string; roles: string[] },
): Promise<{ tempPassword: string }> {
  if (id === actor.id) {
    throw new StaffError(400, 'SELF_EDIT', "O'z parolingizni Sozlamalar sahifasida almashtiring");
  }
  const user = await loadStaff(id);
  if (user.roles.some((r) => r.role === 'SUPER_ADMIN') && !actor.roles.includes('SUPER_ADMIN')) {
    throw new StaffError(403, 'FORBIDDEN', 'Bosh admin parolini faqat bosh admin tiklay oladi');
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true } });
    // Eski parol bilan ochilgan sessiyalar ham yopiladi.
    await tx.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await writeAudit(
      { userId: actor.id, action: 'staff.password_reset', resource: 'User', resourceId: id },
      tx,
    );
  });
  return { tempPassword };
}
