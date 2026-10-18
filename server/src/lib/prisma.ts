import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  __prisma: PrismaClient | undefined;
};

// Reutilizar instancia en hot-reload (desarrollo)
export const prisma = globalForPrisma.__prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}
