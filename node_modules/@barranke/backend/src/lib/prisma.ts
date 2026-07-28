import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma como singleton.
 * Evita crear múltiples conexiones a la base de datos durante hot-reload en desarrollo.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma = global.__prisma__ ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}
