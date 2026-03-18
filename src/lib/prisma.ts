// @deprecated 使用 Supabase 客户端替代
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  // 添��警告日志
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Prisma 客户端已弃用，请迁移到 Supabase 客户端');
  }
}
