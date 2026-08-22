// Global migratsiyadan oldin/keyin bazani tekshirish: npx tsx scripts/global-db-check.ts
import { prisma } from '../packages/database/src/index.ts';

async function main() {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name`;
  const names = rows.map((r) => r.table_name);
  console.log(`Jadvallar soni: ${names.length}`);
  for (const t of ['SourcingRequest', 'GlobalSource', 'GlobalFulfillment']) {
    console.log(`  ${t}: ${names.includes(t) ? 'BOR' : "yo'q"}`);
  }

  const [users, products, orders] = await prisma.$transaction([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
  ]);
  console.log(`Ma'lumot: ${users} user, ${products} mahsulot, ${orders} buyurtma`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
