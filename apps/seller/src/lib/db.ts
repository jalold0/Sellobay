// Prisma client singleton — Next.js serverless uchun
// Hot reload paytida ko'p instance yaratilmasligi uchun globalga saqlanadi
import { prisma } from '@ecom/database';

export { prisma };
export type { Prisma } from '@ecom/database';
