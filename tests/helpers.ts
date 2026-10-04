import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Role, type Side } from '@prisma/client';
import { ROLE_DEFAULTS, type PermissionScope } from '../src/lib/auth/permissions';

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
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
  return prisma.user.create({
    data: { name, phone: `+9198${randomBytes(4).readUInt32BE(0) % 100000000}` },
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
