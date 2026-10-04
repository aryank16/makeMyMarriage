import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Role, type Side } from '@prisma/client';
import { ROLE_DEFAULTS, type PermissionScope } from '../src/lib/auth/permissions';

/**
 * Tests run against a SEPARATE DATABASE, never a separate schema.
 *
 * Prisma hard-qualifies table names with the datasource schema at client
 * generation time, so model queries ignore `search_path` completely. A
 * `?schema=` parameter or `-c search_path=` changes raw SQL but leaves
 * `deleteMany()` pointing at `public` — which means these tests silently
 * truncate the development database. That is not hypothetical; it happened
 * twice while building this.
 *
 * The guard below is the backstop. Do not remove it.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set');

const dbName = new URL(connectionString).pathname.replace(/^\//, '');
if (!/test/i.test(dbName)) {
  throw new Error(
    `Refusing to run tests against database "${dbName}": the name must ` +
      'contain "test". Tests truncate every table.',
  );
}

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

export async function resetDb() {
  await prisma.$transaction([
    prisma.rsvp.deleteMany(),
    prisma.guest.deleteMany(),
    prisma.household.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.budgetCategory.deleteMany(),
    prisma.vendor.deleteMany(),
    prisma.event.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.wedding.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function makeUser(name = 'Test User') {
  const unique = randomUUID();
  return prisma.user.create({
    data: {
      name,
      email: `${unique}@test.local`,
      phone: `+9198${randomBytes(4).readUInt32BE(0) % 100000000}`,
    },
  });
}

export async function makeWedding(createdById: string, slug = randomUUID()) {
  return prisma.wedding.create({
    data: {
      slug,
      brideName: 'A',
      groomName: 'B',
      primaryCity: 'Jaipur',
      createdById,
    },
  });
}

export async function makeMembership(opts: {
  weddingId: string;
  userId: string;
  role: Role;
  side?: Side;
  accepted?: boolean;
  sharesBudget?: boolean;
  permissions?: PermissionScope;
}) {
  return prisma.membership.create({
    data: {
      weddingId: opts.weddingId,
      userId: opts.userId,
      role: opts.role,
      side: opts.side ?? 'SHARED',
      sharesBudget: opts.sharesBudget ?? false,
      permissions: opts.permissions ?? ROLE_DEFAULTS[opts.role],
      acceptedAt: opts.accepted === false ? null : new Date(),
    },
  });
}

/** A wedding with an owner, used as the "other tenant" in isolation tests. */
export async function makeTenant(role: Role = 'OWNER', side: Side = 'SHARED') {
  const user = await makeUser();
  const wedding = await makeWedding(user.id);
  const membership = await makeMembership({
    weddingId: wedding.id,
    userId: user.id,
    role,
    side,
  });
  return { user, wedding, membership };
}
