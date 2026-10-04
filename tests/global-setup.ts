import { execSync } from 'node:child_process';
import { config } from 'dotenv';

export default function setup() {
  config({ path: '.env.test', quiet: true });
  // Schema-only; the test database is never seeded. Every test builds the
  // exact fixtures it needs so that nothing passes by accident.
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env },
  });
}
