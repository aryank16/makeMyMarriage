import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createWedding } from '../src/lib/weddings/create';
import { EVENT_PRESETS, eventDateFrom } from '../src/lib/weddings/event-presets';
import { isValidSlug, slugify } from '../src/lib/weddings/slug';
import {
  InviteError,
  acceptInvite,
  inviteMember,
  pendingInvitesFor,
} from '../src/lib/members/invite';
import {
  requirePermission,
  visibleBudgetSides,
  NotAMemberError,
  AuthorizationError,
} from '../src/lib/auth/require-permission';
import { makeUser, prisma, resetDb } from './helpers';

beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});

const WEDDING_DAY = new Date('2026-11-20T00:00:00.000Z');

const base = {
  brideName: 'Priya',
  groomName: 'Arjun',
  weddingDate: WEDDING_DAY,
  primaryCity: 'Jaipur',
  creatorSide: 'BRIDE' as const,
  eventKeys: [],
};

describe('slugs', () => {
  it('builds a slug from both names', () => {
    expect(slugify('Priya', 'Arjun')).toBe('priya-arjun');
    expect(slugify('Priya Sharma', 'Arjun  Mehta')).toBe('priya-sharma-arjun-mehta');
  });

  it('rejects reserved words that would shadow real routes', () => {
    for (const r of ['admin', 'login', 'dashboard', 'api', 'w', 'i']) {
      expect(isValidSlug(r), r).toBe(false);
    }
  });
});

describe('createWedding', () => {
  it('makes the creator an accepted OWNER in the same transaction', async () => {
    const user = await makeUser();
    const wedding = await createWedding(user.id, base, prisma);

    const m = await prisma.membership.findUnique({
      where: { weddingId_userId: { weddingId: wedding.id, userId: user.id } },
    });
    expect(m?.role).toBe('OWNER');
    expect(m?.acceptedAt).not.toBeNull();
    expect(m?.side).toBe('BRIDE');

    // And it works end to end through the chokepoint.
    const ctx = await requirePermission(user.id, wedding.id, 'members', 'manage', prisma);
    expect(ctx.weddingId).toBe(wedding.id);
  });

  it('creates the common presets when none are chosen', async () => {
    const user = await makeUser();
    const wedding = await createWedding(user.id, base, prisma);
    const events = await prisma.event.findMany({ where: { weddingId: wedding.id } });

    const expected = EVENT_PRESETS.filter((p) => p.common).length;
    expect(events).toHaveLength(expected);
    expect(events.map((e) => e.type)).toContain('WEDDING');
  });

  it('creates exactly the chosen events, ordered by date', async () => {
    const user = await makeUser();
    const wedding = await createWedding(
      user.id,
      { ...base, eventKeys: ['reception', 'mehendi', 'wedding'] },
      prisma,
    );
    const events = await prisma.event.findMany({
      where: { weddingId: wedding.id },
      orderBy: { sortOrder: 'asc' },
    });

    expect(events.map((e) => e.type)).toEqual(['MEHENDI', 'WEDDING', 'RECEPTION']);
  });

  it('places mehendi two days before the wedding', async () => {
    const user = await makeUser();
    const wedding = await createWedding(
      user.id,
      { ...base, eventKeys: ['mehendi', 'wedding'] },
      prisma,
    );
    const [mehendi, weddingEvent] = await prisma.event.findMany({
      where: { weddingId: wedding.id },
      orderBy: { sortOrder: 'asc' },
    });

    const days =
      (weddingEvent.startAt.getTime() - mehendi.startAt.getTime()) / 86400000;
    expect(days).toBeGreaterThan(1.5);
    expect(days).toBeLessThan(2.5);
  });

  it('gives a second couple with the same names a distinct slug', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const first = await createWedding(a.id, base, prisma);
    const second = await createWedding(b.id, base, prisma);

    expect(first.slug).toBe('priya-arjun');
    expect(second.slug).not.toBe(first.slug);
  });

  it('still creates events when the date is not fixed yet', async () => {
    const user = await makeUser();
    const wedding = await createWedding(
      user.id,
      { ...base, weddingDate: null, eventKeys: ['wedding'] },
      prisma,
    );
    const events = await prisma.event.findMany({ where: { weddingId: wedding.id } });
    expect(events).toHaveLength(1);
    expect(wedding.weddingDate).toBeNull();
  });

  it('records the creation in the audit log', async () => {
    const user = await makeUser();
    const wedding = await createWedding(user.id, base, prisma);
    const logs = await prisma.auditLog.findMany({ where: { weddingId: wedding.id } });
    expect(logs.map((l) => l.action)).toContain('wedding.create');
  });
});

describe('event date offsets', () => {
  it('renders an IST wall-clock hour correctly in UTC', () => {
    // 11:00 IST on the wedding day is 05:30 UTC.
    const d = eventDateFrom(WEDDING_DAY, 0, 11);
    expect(d.toISOString()).toBe('2026-11-20T05:30:00.000Z');
  });
});

describe('organizer invitations', () => {
  async function setup() {
    const owner = await makeUser('Owner');
    const wedding = await createWedding(owner.id, base, prisma);
    return { owner, wedding };
  }

  it('creates an invitation that grants nothing until accepted', async () => {
    const { owner, wedding } = await setup();
    const { membership, user } = await inviteMember(
      owner.id,
      wedding.id,
      { email: 'mum@example.com', name: 'Sunita', role: 'PARENT', side: 'BRIDE' },
      prisma,
    );

    expect(membership.acceptedAt).toBeNull();
    await expect(
      requirePermission(user.id, wedding.id, 'guests', 'read', prisma),
    ).rejects.toBeInstanceOf(NotAMemberError);

    await acceptInvite(user.id, membership.id, prisma);
    await expect(
      requirePermission(user.id, wedding.id, 'guests', 'read', prisma),
    ).resolves.toBeTruthy();
  });

  it('refuses a non-owner the ability to grant owner access', async () => {
    const { owner, wedding } = await setup();
    const { membership, user: parent } = await inviteMember(
      owner.id,
      wedding.id,
      { email: 'dad@example.com', name: 'Rakesh', role: 'PARENT', side: 'GROOM' },
      prisma,
    );
    await acceptInvite(parent.id, membership.id, prisma);

    // A PARENT has members:invite, so they can invite — but not as OWNER.
    await expect(
      inviteMember(
        parent.id,
        wedding.id,
        { email: 'x@example.com', name: 'X', role: 'OWNER', side: 'GROOM' },
        prisma,
      ),
    ).rejects.toBeInstanceOf(InviteError);

    await expect(
      inviteMember(
        parent.id,
        wedding.id,
        { email: 'y@example.com', name: 'Y', role: 'COORDINATOR', side: 'GROOM' },
        prisma,
      ),
    ).resolves.toBeTruthy();
  });

  it('refuses a coordinator the ability to invite at all', async () => {
    const { owner, wedding } = await setup();
    const { membership, user: coord } = await inviteMember(
      owner.id,
      wedding.id,
      { email: 'cousin@example.com', name: 'Vikram', role: 'COORDINATOR', side: 'BRIDE' },
      prisma,
    );
    await acceptInvite(coord.id, membership.id, prisma);

    await expect(
      inviteMember(
        coord.id,
        wedding.id,
        { email: 'z@example.com', name: 'Z', role: 'VIEWER', side: 'BRIDE' },
        prisma,
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('refuses a duplicate invitation', async () => {
    const { owner, wedding } = await setup();
    const input = { email: 'dup@example.com', name: 'Dup', role: 'PARENT' as const, side: 'BRIDE' as const };
    await inviteMember(owner.id, wedding.id, input, prisma);
    await expect(inviteMember(owner.id, wedding.id, input, prisma)).rejects.toBeInstanceOf(InviteError);
  });

  it('refuses to let someone else accept an invitation they were sent', async () => {
    const { owner, wedding } = await setup();
    const { membership } = await inviteMember(
      owner.id,
      wedding.id,
      { email: 'target@example.com', name: 'Target', role: 'PARENT', side: 'BRIDE' },
      prisma,
    );
    const attacker = await makeUser('Attacker');

    await expect(acceptInvite(attacker.id, membership.id, prisma)).rejects.toBeInstanceOf(InviteError);
  });

  it('reuses an existing user row rather than duplicating by email', async () => {
    const { owner, wedding } = await setup();
    const existing = await makeUser('Already here');
    const { user } = await inviteMember(
      owner.id,
      wedding.id,
      { email: existing.email, name: 'Already here', role: 'PARENT', side: 'BRIDE' },
      prisma,
    );
    expect(user.id).toBe(existing.id);
  });

  it('lists pending invitations for the invitee', async () => {
    const { owner, wedding } = await setup();
    const { user } = await inviteMember(
      owner.id,
      wedding.id,
      { email: 'pending@example.com', name: 'Pending', role: 'PARENT', side: 'GROOM' },
      prisma,
    );
    const pending = await pendingInvitesFor(user.id, prisma);
    expect(pending).toHaveLength(1);
    expect(pending[0].wedding.id).toBe(wedding.id);
  });
});

describe('THE PHASE 1 GATE', () => {
  it('two families share one wedding and see appropriately different things', async () => {
    const brideDad = await makeUser("Bride's father");
    const wedding = await createWedding(
      brideDad.id,
      { ...base, creatorSide: 'BRIDE', eventKeys: ['mehendi', 'sangeet', 'wedding', 'reception'] },
      prisma,
    );

    const invite = async (email: string, role: 'PARENT' | 'COORDINATOR', side: 'BRIDE' | 'GROOM') => {
      const { membership, user } = await inviteMember(
        brideDad.id, wedding.id,
        { email, name: email, role, side },
        prisma,
      );
      await acceptInvite(user.id, membership.id, prisma);
      return user;
    };

    const groomDad = await invite('groomdad@example.com', 'PARENT', 'GROOM');
    const cousin = await invite('cousin@example.com', 'COORDINATOR', 'BRIDE');

    // Both fathers see the full guest list and every event.
    for (const u of [brideDad, groomDad]) {
      await expect(requirePermission(u.id, wedding.id, 'guests', 'write', prisma)).resolves.toBeTruthy();
      await expect(requirePermission(u.id, wedding.id, 'events', 'write', prisma)).resolves.toBeTruthy();
    }
    const events = await prisma.event.findMany({ where: { weddingId: wedding.id } });
    expect(events).toHaveLength(4);

    // Neither father can see the other family's spend.
    const brideCtx = await requirePermission(brideDad.id, wedding.id, 'budget', 'read_own_side', prisma);
    const groomCtx = await requirePermission(groomDad.id, wedding.id, 'budget', 'read_own_side', prisma);
    expect(await visibleBudgetSides(brideCtx, prisma)).not.toContain('GROOM');
    expect(await visibleBudgetSides(groomCtx, prisma)).not.toContain('BRIDE');

    // The cousin runs the guest list and sees no money at all.
    await expect(requirePermission(cousin.id, wedding.id, 'guests', 'write', prisma)).resolves.toBeTruthy();
    await expect(
      requirePermission(cousin.id, wedding.id, 'budget', 'read_own_side', prisma),
    ).rejects.toBeInstanceOf(AuthorizationError);

    // And nobody reaches a different wedding.
    const stranger = await makeUser('Stranger');
    const otherWedding = await createWedding(stranger.id, base, prisma);
    for (const u of [brideDad, groomDad, cousin]) {
      await expect(
        requirePermission(u.id, otherWedding.id, 'events', 'read', prisma),
      ).rejects.toBeInstanceOf(NotAMemberError);
    }
  });
});
