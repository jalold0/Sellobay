// Sellobay — 3 ta test hisob seed
// Customer + Seller (ACTIVE, approval o'tkazib yuborilgan) + SUPER_ADMIN
// Idempotent: upsert + role assignment dedup
// Run: pnpm --filter @ecom/database exec tsx prisma/seed-test-accounts.ts

import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ARGON_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16,
  timeCost: 3,
  parallelism: 1,
};

interface SeedAccount {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: Array<'CUSTOMER' | 'SELLER' | 'ADMIN' | 'SUPER_ADMIN'>;
  status: 'ACTIVE' | 'PENDING';
}

const ACCOUNTS: SeedAccount[] = [
  {
    email: 'customer@test.uz',
    phone: '+998901111111',
    password: 'Test1234',
    firstName: 'Test',
    lastName: 'Mijoz',
    roles: ['CUSTOMER'],
    status: 'ACTIVE',
  },
  {
    email: 'seller@test.uz',
    phone: '+998902222222',
    password: 'Test1234',
    firstName: 'Test',
    lastName: 'Sotuvchi',
    roles: ['CUSTOMER', 'SELLER'],
    status: 'ACTIVE', // testda darhol faol (production'da PENDING → admin approval)
  },
  {
    email: 'admin@test.uz',
    phone: '+998903333333',
    password: 'Test1234',
    firstName: 'Test',
    lastName: 'Admin',
    roles: ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'],
    status: 'ACTIVE',
  },
];

async function upsertAccount(acc: SeedAccount) {
  const passwordHash = await argon2.hash(acc.password, ARGON_OPTIONS);

  const user = await prisma.user.upsert({
    where: { email: acc.email },
    update: {
      passwordHash,
      firstName: acc.firstName,
      lastName: acc.lastName,
      phone: acc.phone,
      status: acc.status,
    },
    create: {
      email: acc.email,
      phone: acc.phone,
      passwordHash,
      firstName: acc.firstName,
      lastName: acc.lastName,
      status: acc.status,
      locale: 'uz',
    },
  });

  // Rollarni dedup qilib qo'shamiz (existing + new)
  const existing = await prisma.userRoleAssignment.findMany({
    where: { userId: user.id },
    select: { role: true },
  });
  const existingRoles = new Set(existing.map((r: { role: string }) => r.role));
  const toAdd = acc.roles.filter((r) => !existingRoles.has(r));

  if (toAdd.length > 0) {
    await prisma.userRoleAssignment.createMany({
      data: toAdd.map((role) => ({ userId: user.id, role })),
    });
  }

  // Sotuvchi rolida bo'lsa, Seller entity'ni ham yaratamiz (ACTIVE — testda approval skip)
  let sellerInfo = '';
  if (acc.roles.includes('SELLER')) {
    const seller = await prisma.seller.upsert({
      where: { ownerUserId: user.id },
      update: {
        status: 'ACTIVE',
        approvedAt: new Date(),
      },
      create: {
        ownerUserId: user.id,
        legalName: `${acc.firstName} ${acc.lastName} (Test)`,
        brandName: `${acc.firstName} Shop`,
        email: acc.email,
        phone: acc.phone,
        status: 'ACTIVE',
        approvedAt: new Date(),
      },
    });
    sellerInfo = ` [Seller#${seller.id.slice(0, 8)} ACTIVE]`;
  }

  console.log(
    `✔ ${acc.email}  (${acc.roles.join('+')}, ${acc.status})  ${
      toAdd.length > 0 ? `[+${toAdd.length} role]` : '[role unchanged]'
    }${sellerInfo}`,
  );
}

async function main() {
  console.log('=== Sellobay test accounts seed ===\n');

  for (const acc of ACCOUNTS) {
    await upsertAccount(acc);
  }

  console.log('\n--- Yaratilgan/yangilangan hisoblar ---');
  console.log('  📱 Customer:  customer@test.uz / Test1234  (web va mobile uchun)');
  console.log('  🏪 Seller:    seller@test.uz   / Test1234  (sellobay-seller :3002)');
  console.log('  🛡️  Admin:     admin@test.uz    / Test1234  (sellobay-admin :3001)');
  console.log('\nTelefon raqamlari: +99890{1,2,3}*');
}

main()
  .catch((e) => {
    console.error('Seed xato:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
