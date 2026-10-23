import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AuthorizationError,
  NotAMemberError,
  requirePermission,
} from '../src/lib/auth/require-permission';
import {
  MODULES,
  ROLE_DEFAULTS,
  permissionScopeSchema,
  satisfies,
} from '../src/lib/auth/permissions';
import {
  makeMembership,
  makeTenant,
  makeUser,
  makeWedding,
  prisma,
  resetDb,
} from './helpers';

beforeAll(resetDb);
beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});

const require_ = (u: string, w: string, m: never | string, l: string) =>
  requirePermission(u, w, m as never, l, prisma);

describe('tenant isolation', () => {
  it('refuses a user who has no membership in the wedding', async () => {
    const { wedding } = await makeTenant();
    const outsider = await makeUser('Outsider');

    await expect(
      require_(outsider.id, wedding.id, 'guests', 'read'),
    ).rejects.toBeInstanceOf(NotAMemberError);
  });

  it('reports a wedding the caller cannot see as 404, not 403', async () => {
    // Otherwise id probing tells an attacker which weddings exist.
    const { wedding } = await makeTenant();
    const outsider = await makeUser('Outsider');

    await expect(
      require_(outsider.id, wedding.id, 'guests', 'read'),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('refuses an owner of one wedding access to another wedding', async () => {
    const a = await makeTenant();
    const b = await makeTenant();

    // Full owner rights in A must grant nothing at all in B.
    await expect(
      require_(a.user.id, b.wedding.id, 'guests', 'read'),
    ).rejects.toBeInstanceOf(NotAMemberError);
  });

  it('returns the weddingId from the membership, not from the argument', async () => {
    const { user, wedding } = await makeTenant();
    const ctx = await require_(user.id, wedding.id, 'guests', 'write');
    expect(ctx.weddingId).toBe(wedding.id);
    expect(ctx.membership.weddingId).toBe(wedding.id);
  });

  it('scoping a guest query by ctx.weddingId never crosses tenants', async () => {
    const a = await makeTenant();
    const b = await makeTenant();

    for (const t of [a, b]) {
      const household = await prisma.household.create({
        data: {
          weddingId: t.wedding.id,
          label: 'Household',
          inviteToken: `tok-${t.wedding.id}`,
        },
      });
      await prisma.guest.create({
        data: {
          weddingId: t.wedding.id,
          householdId: household.id,
          name: `Guest of ${t.wedding.id}`,
          side: 'BRIDE',
        },
      });
    }

    const ctx = await require_(a.user.id, a.wedding.id, 'guests', 'read');
    const guests = await prisma.guest.findMany({
      where: { weddingId: ctx.weddingId },
    });

    expect(guests).toHaveLength(1);
    expect(guests[0].weddingId).toBe(a.wedding.id);
  });

  it('refuses a membership that has been invited but not accepted', async () => {
    const owner = await makeUser();
    const wedding = await makeWedding(owner.id);
    const pending = await makeUser('Not yet accepted');
    await makeMembership({
      weddingId: wedding.id,
      userId: pending.id,
      role: 'MANAGER',
      accepted: false,
    });

    await expect(
      require_(pending.id, wedding.id, 'guests', 'read'),
    ).rejects.toBeInstanceOf(NotAMemberError);
  });
});

describe('the two roles', () => {
  it('lets a manager run the whole wedding', async () => {
    // Both roles plan: a family splitting the work must not discover that
    // whoever holds the guest list cannot also pay the caterer.
    const { user, wedding } = await makeTenant('MANAGER');

    for (const [module, level] of [
      ['guests', 'write'],
      ['events', 'write'],
      ['vendors', 'write'],
      ['budget', 'write'],
      ['photos', 'write'],
      ['tasks', 'write'],
    ] as const) {
      await expect(
        require_(user.id, wedding.id, module, level),
        `a manager should hold ${module}:${level}`,
      ).resolves.toBeTruthy();
    }
  });

  it('refuses a manager any say over who has access', async () => {
    const { user, wedding } = await makeTenant('MANAGER');

    await expect(
      require_(user.id, wedding.id, 'members', 'invite'),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(
      require_(user.id, wedding.id, 'members', 'manage'),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('lets only an admin manage members', async () => {
    const admin = await makeTenant('ADMIN');
    await expect(
      require_(admin.user.id, admin.wedding.id, 'members', 'manage'),
    ).resolves.toBeTruthy();

    const manager = await makeTenant('MANAGER');
    await expect(
      require_(manager.user.id, manager.wedding.id, 'members', 'manage'),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('gives both roles the whole expense log', async () => {
    // Sides are gone: every organizer sees all of the spending.
    for (const role of ['ADMIN', 'MANAGER'] as const) {
      const { user, wedding } = await makeTenant(role);
      await expect(
        require_(user.id, wedding.id, 'budget', 'write'),
        `${role} should see the full budget`,
      ).resolves.toBeTruthy();
    }
  });

  it('honours an explicit permission override over the role default', async () => {
    // The stored JSON is the source of truth; the role is only a default.
    const admin = await makeUser();
    const wedding = await makeWedding(admin.id);
    const restricted = await makeUser('Restricted manager');
    await makeMembership({
      weddingId: wedding.id,
      userId: restricted.id,
      role: 'MANAGER',
      permissions: { ...ROLE_DEFAULTS.MANAGER, budget: 'none', guests: 'read' },
    });

    await expect(
      require_(restricted.id, wedding.id, 'budget', 'read'),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(
      require_(restricted.id, wedding.id, 'guests', 'write'),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(
      require_(restricted.id, wedding.id, 'guests', 'read'),
    ).resolves.toBeTruthy();
  });
});


describe('permission scope integrity', () => {
  it('every role default is a valid scope covering every module', () => {
    for (const [role, scope] of Object.entries(ROLE_DEFAULTS)) {
      expect(() => permissionScopeSchema.parse(scope), role).not.toThrow();
      for (const m of MODULES) {
        expect(scope[m], `${role}.${m}`).toBeDefined();
      }
    }
  });

  it('ranks levels so that stronger satisfies weaker', () => {
    expect(satisfies('guests', 'write', 'read')).toBe(true);
    expect(satisfies('guests', 'read', 'write')).toBe(false);
    expect(satisfies('guests', 'none', 'read')).toBe(false);
    expect(satisfies('budget', 'write_own_side', 'read_own_side')).toBe(true);
    expect(satisfies('budget', 'read_own_side', 'read')).toBe(false);
    expect(satisfies('budget', 'write', 'write_own_side')).toBe(true);
    expect(satisfies('members', 'manage', 'invite')).toBe(true);
    expect(satisfies('members', 'invite', 'manage')).toBe(false);
  });

  it('rejects a malformed stored scope rather than defaulting open', async () => {
    const owner = await makeUser();
    const wedding = await makeWedding(owner.id);
    await prisma.membership.create({
      data: {
        weddingId: wedding.id,
        userId: owner.id,
        role: 'ADMIN',
        side: 'SHARED',
        permissions: { guests: 'superuser' },
        acceptedAt: new Date(),
      },
    });

    await expect(
      require_(owner.id, wedding.id, 'guests', 'read'),
    ).rejects.toThrow();
  });
});
