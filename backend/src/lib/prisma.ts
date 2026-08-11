import { PrismaClient } from '@prisma/client';

/**
 * Prisma 7 requires a driver adapter passed to the PrismaClient constructor.
 *
 * We initialise the client once at startup (in src/index.ts → main()).
 * All controllers import { prisma } and use it after startup completes —
 * by the time any HTTP request arrives, prisma is already set.
 */

let _prisma: PrismaClient | null = null;

/**
 * Build and return a PrismaClient with the correct adapter.
 * - Neon (serverless) URLs → @prisma/adapter-neon
 * - Standard Postgres URLs → @prisma/adapter-pg
 */
export async function initPrisma(): Promise<PrismaClient> {
  if (_prisma) return _prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const isNeon = connectionString.includes('neon.tech');

  if (isNeon) {
    const { PrismaNeon } = await import('@prisma/adapter-neon');
    const { neonConfig, Pool } = await import('@neondatabase/serverless');
    const { default: ws } = await import('ws');
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = new PrismaNeon(pool as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _prisma = new PrismaClient({ adapter } as any);
  } else {
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _prisma = new PrismaClient({ adapter } as any);
  }

  return _prisma;
}

/**
 * Synchronous accessor — safe to call after initPrisma() has resolved.
 * Throws clearly if called before startup completes.
 */
export function getPrisma(): PrismaClient {
  if (!_prisma) {
    throw new Error(
      'Prisma not initialised. Make sure initPrisma() is awaited before handling requests.',
    );
  }
  return _prisma;
}

/**
 * Convenience export used throughout controllers.
 * This is a module-level getter so it always returns the live instance.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_t, prop: string | symbol) {
    const client = getPrisma();
    const val = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === 'function' ? (val as Function).bind(client) : val;
  },
});
