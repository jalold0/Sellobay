/**
 * Bosh admin (SUPER_ADMIN) hisobini yaratish yoki parolini o'rnatish — prod uchun ham.
 *
 * NEGA SKRIPT: parol hech qayerga yozilmasligi kerak (chat, kod, commit, log). Skript parolni
 * terminalda yashirin so'raydi va bazaga faqat argon2id xeshini yozadi (`@ecom/auth` bilan
 * bir xil parametrlar — admin login shu xeshni tekshiradi).
 *
 * Ishga tushirish (PowerShell, prod):
 *   $env:DATABASE_URL = "postgresql://...neon.tech/neondb?sslmode=require"
 *   pnpm --filter @ecom/database admin:yaratish
 *
 * Qo'shimcha: bazada `@test.uz` test hisoblari (parollari repo'dagi seed faylida ochiq!)
 * topilsa — ularni bloklashni taklif qiladi.
 */
import { hash } from '@node-rs/argon2';
import { PrismaClient } from '@prisma/client';
import { createInterface } from 'node:readline';

// `packages/auth/src/password.ts` bilan BIR XIL bo'lishi shart.
const ARGON_OPTIONS = { memoryCost: 2 ** 16, timeCost: 3, parallelism: 1 } as const;
// Admin uchun oddiy mijozdan qattiqroq: kamida 12 belgi, harf va raqam.
const ADMIN_PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).{12,}$/;

// Bitta readline butun sessiya uchun: qatorlar async iterator'da buferlanadi (har savolga
// yangi interfeys ochilsa, oldindan yozilgan/pipe qilingan qatorlar yo'qolardi).
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: Boolean(process.stdin.isTTY),
});
let muted = false;
{
  // Yashirin savolda terminal yozilgan belgilarni ekranga qaytarmaydi.
  const out = rl as unknown as { _writeToOutput: (s: string) => void };
  const original = out._writeToOutput.bind(rl);
  out._writeToOutput = (s: string) => {
    if (!muted) original(s);
  };
}
const lines = rl[Symbol.asyncIterator]();

async function ask(question: string, hidden = false): Promise<string> {
  process.stdout.write(question);
  muted = hidden;
  const { value } = await lines.next();
  muted = false;
  if (hidden) process.stdout.write('\n');
  return String(value ?? '').trim();
}

function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? '').host || '(noma`lum)';
  } catch {
    return '(DATABASE_URL o`qilmadi)';
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL qo`yilmagan. PowerShell: $env:DATABASE_URL = "postgresql://..."');
    process.exit(1);
  }
  console.log(`\nBaza: ${dbHost()}`);
  if ((await ask('Shu bazaga yozamizmi? (ha/yo`q): ')).toLowerCase() !== 'ha') {
    console.log('Bekor qilindi.');
    rl.close();
    return;
  }

  const prisma = new PrismaClient();
  try {
    const email = (await ask('Admin email: ')).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email noto`g`ri');
    const firstName = await ask('Ism: ');
    const password = await ask('Parol (kamida 12 belgi, harf va raqam; ko`rinmaydi): ', true);
    if (!ADMIN_PASSWORD_POLICY.test(password)) {
      throw new Error(
        'Parol kamida 12 belgi bo`lishi va harf hamda raqamni o`z ichiga olishi kerak',
      );
    }
    if ((await ask('Parolni takrorlang: ', true)) !== password)
      throw new Error('Parollar mos emas');

    const passwordHash = await hash(password, ARGON_OPTIONS);
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash, status: 'ACTIVE', ...(firstName ? { firstName } : {}) },
          select: { id: true },
        })
      : await prisma.user.create({
          data: {
            email,
            passwordHash,
            firstName: firstName || null,
            status: 'ACTIVE',
            emailVerifiedAt: new Date(),
          },
          select: { id: true },
        });
    // (userId, role, scope) unique'i scope NULL bo'lganda takrorni to'xtatmaydi — avval tekshiramiz.
    for (const role of ['ADMIN', 'SUPER_ADMIN', 'CUSTOMER'] as const) {
      const has = await prisma.userRoleAssignment.findFirst({
        where: { userId: user.id, role, scope: null },
        select: { id: true },
      });
      if (!has) await prisma.userRoleAssignment.create({ data: { userId: user.id, role } });
    }
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: existing ? 'ADMIN_PASSWORD_SET_CLI' : 'ADMIN_CREATED_CLI',
        resource: 'User',
        resourceId: user.id,
      },
    });
    console.log(
      `\n✓ ${existing ? 'Parol yangilandi va' : 'Hisob yaratildi,'} SUPER_ADMIN roli berildi: ${email}`,
    );

    // Test hisoblari (parollari repo'da ochiq) — prod'da qolmasligi kerak.
    const testAccounts = await prisma.user.findMany({
      where: { email: { endsWith: '@test.uz' }, status: { not: 'BLOCKED' } },
      select: { id: true, email: true },
    });
    if (testAccounts.length) {
      console.log(
        `\nDiqqat: bazada ${testAccounts.length} ta test hisobi bor (parollari seed faylida ochiq):`,
      );
      for (const a of testAccounts) console.log(`  - ${a.email}`);
      if ((await ask('Ularni bloklaymizmi? (ha/yo`q): ')).toLowerCase() === 'ha') {
        await prisma.user.updateMany({
          where: { id: { in: testAccounts.map((a) => a.id) } },
          data: { status: 'BLOCKED' },
        });
        await prisma.userSession
          .deleteMany({ where: { userId: { in: testAccounts.map((a) => a.id) } } })
          .catch(() => undefined);
        console.log('✓ Test hisoblari bloklandi va sessiyalari yopildi.');
      }
    }
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main().catch((e: unknown) => {
  console.error(`\nXato: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
