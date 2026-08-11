import path from 'node:path';
import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  migrate: {
    async adapter() {
      const { PrismaNeon } = await import('@prisma/adapter-neon');
      const { neonConfig, Pool } = await import('@neondatabase/serverless');
      const ws = await import('ws');
      neonConfig.webSocketConstructor = ws.default;
      const connectionString = process.env.DATABASE_URL!;
      const pool = new Pool({ connectionString });
      return new PrismaNeon(pool);
    },
  },
});
