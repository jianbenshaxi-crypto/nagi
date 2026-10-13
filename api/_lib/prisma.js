import { PrismaClient } from '@prisma/client';

// Vercel Functions はリクエストごとにモジュールを再評価しうるため、
// 開発時のホットリロードやコールドスタートで接続が増殖しないよう globalThis にキャッシュする。
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__nagiPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__nagiPrisma = prisma;
}
