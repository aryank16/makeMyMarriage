import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Migrations MUST use the direct connection (port 5432). Supabase's
    // transaction pooler on 6543 runs PgBouncer, which breaks DDL and
    // prepared statements.
    url: env('DIRECT_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
