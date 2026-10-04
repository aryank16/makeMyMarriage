import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AuthorizationError,
  NotAMemberError,
  requirePermission,
  visibleBudgetSides,
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
      role: 'PARENT',
      accepted: false,
    });

    await expect(
      require_(pending.id, wedding.id, 'guests', 'read'),
    ).rejects.toBeInstanceOf(NotAMemberError);
  });
});

describe('module scopes', () => {
  it('lets a coordinator manage guests', async () => {
    const { user, wedding } = await makeTenant('COORDINATOR', 'BRIDE');
    const ctx = await require_(user.id, wedding.id, 'guests', 'write');
    expect(ctx.scope.guests).toBe('write');
  });

  it('refuses a coordinator any access to the budget', async () => {
    // The cousin who runs the guest list and never sees money.
    const { user, wedding } = await makeTenant('COORDINATOR', 'BRIDE');
    await expect(
      require_(user.id, wedding.id, 'budget', 'read_own_side'),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('refuses a contributor write access to guests but allows photos', async () => {
    const { user, wedding } = await makeTenant('CONTRIBUTOR');
    await expect(
      require_(user.id, wedding.id, 'guests', 'write'),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(
      require_(user.id, wedding.id, 'photos', 'write'),
    ).resolves.toBeTruthy();
  });

  it('refuses a viewer any sight of the guest list', async () => {
    const { user, wedding } = await makeTenant('VIEWER');
    await expect(
      require_(user.id, wedding.id, 'guests', 'read'),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('refuses a planner the ability to invite members', async () => {
    const { user, wedding } = await makeTenant('PLANNER');
    await expect(
      require_(user.id, wedding.id, 'members', 'invite'),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('lets only the owner manage members', async () => {
    const owner = await makeTenant('OWNER');
    await expect(
      require_(owner.user.id, owner.wedding.id, 'members', 'manage'),
    ).resolves.toBeTruthy();

    const parent = await makeTenant('PARENT');
    await expect(
      require_(parent.user.id, parent.wedding.id, 'members', 'manage'),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('honours an explicit permission override over the role default', async () => {
    // The stored JSON is the source of truth; the role is only a default.
    const owner = await makeUser();
    const wedding = await makeWedding(owner.id);
    const restricted = await makeUser('Restricted parent');
    await makeMembership({
      weddingId: wedding.id,
      userId: restricted.id,
      role: 'PARENT',
      permissions: { ...ROLE_DEFAULTS.PARENT, budget: 'none', guests: 'read' },
    });

    await expect(
      require_(restricted.id, wedding.id, 'budget', 'read_own_side'),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(
      require_(restricted.id, wedding.id, 'guests', 'write'),
    ).rejects.toBeInstanceOf(AuthorizationError);
    await expect(
      require_(restricted.id, wedding.id, 'guests', 'read'),
    ).resolves.toBeTruthy();
  });
});

describe('budget side scoping', () => {
  it("hides the other family's spend from a bride-side parent", async () => {
    const { user, wedding } = await makeTenant('PARENT', 'BRIDE');
    const ctx = await require_(user.id, wedding.id, 'budget', 'read_own_side');
    const sides = await visibleBudgetSides(ctx, prisma);

    expect(sides.sort()).toEqual(['BRIDE', 'SHARED']);
    expect(sides).not.toContain('GROOM');
  });

  it('gives a hired planner both sides, because that is the job', async () => {
    const { user, wedding } = await makeTenant('PLANNER', 'SHARED');
    const ctx = await require_(user.id, wedding.id, 'budget', 'read');
    const sides = await visibleBudgetSides(ctx, prisma);

    expect(sides.sort()).toEqual(['BRIDE', 'GROOM', 'SHARED']);
  });

  it("reveals the other side only once that side opts into sharing", async () => {
    const brideParent = await makeUser('Bride side parent');
    const wedding = await makeWedding(brideParent.id);
    await makeMembership({
      weddingId: wedding.id,
      userId: brideParent.id,
      role: 'PARENT',
      side: 'BRIDE',
    });

    const ctxBefore = await require_(
      brideParent.id,
      wedding.id,
      'budget',
      'read_own_side',
    );
    expect(await visibleBudgetSides(ctxBefore, prisma)).not.toContain('GROOM');

    const groomParent = await makeUser('Groom side parent');
    await makeMembership({
      weddingId: wedding.id,
      userId: groomParent.id,
      role: 'PARENT',
      side: 'GROOM',
      sharesBudget: true,
    });

    const ctxAfter = await require_(
      brideParent.id,
      wedding.id,
      'budget',
      'read_own_side',
    );
    expect(await visibleBudgetSides(ctxAfter, prisma)).toContain('GROOM');
  });

  it('gives no budget sides at all to someone with no budget access', async () => {
    const { user, wedding } = await makeTenant('COORDINATOR', 'BRIDE');
    const ctx = await require_(user.id, wedding.id, 'guests', 'write');
    expect(await visibleBudgetSides(ctx, prisma)).toEqual([]);
  });

  it('does not leak sharing across weddings', async () => {
    const a = await makeTenant('PARENT', 'BRIDE');
    const b = await makeTenant('PARENT', 'BRIDE');
    const sharer = await makeUser('Groom side, other wedding');
    await makeMembership({
      weddingId: b.wedding.id,
      userId: sharer.id,
      role: 'PARENT',
      side: 'GROOM',
      sharesBudget: true,
    });

    const ctx = await require_(a.user.id, a.wedding.id, 'budget', 'read_own_side');
    expect(await visibleBudgetSides(ctx, prisma)).not.toContain('GROOM');
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
        role: 'OWNER',
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
