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
  it('makes the creator an accepted ADMIN in the same transaction', async () => {
    const user = await makeUser();
    const wedding = await createWedding(user.id, base, prisma);

    const m = await prisma.membership.findUnique({
      where: { weddingId_userId: { weddingId: wedding.id, userId: user.id } },
    });
    expect(m?.role).toBe('ADMIN');
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
      { email: 'mum@example.com', name: 'Sunita', role: 'MANAGER', side: 'BRIDE' },
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

  it('refuses a manager any ability to invite', async () => {
    const { owner, wedding } = await setup();
    const { membership, user: manager } = await inviteMember(
      owner.id,
      wedding.id,
      { email: 'dad@example.com', name: 'Rakesh', role: 'MANAGER', side: 'GROOM' },
      prisma,
    );
    await acceptInvite(manager.id, membership.id, prisma);

    // Only an admin decides who has access. A manager runs the wedding but
    // cannot widen the circle, whichever role they try to hand out.
    for (const role of ['ADMIN', 'MANAGER'] as const) {
      await expect(
        inviteMember(
          manager.id,
          wedding.id,
          { email: `${role.toLowerCase()}@example.com`, name: 'X', role, side: 'GROOM' },
          prisma,
        ),
        `a manager should not be able to invite an ${role}`,
      ).rejects.toBeInstanceOf(AuthorizationError);
    }
  });

  it('lets an admin invite another admin', async () => {
    const { owner, wedding } = await setup();
    await expect(
      inviteMember(
        owner.id,
        wedding.id,
        { email: 'coadmin@example.com', name: 'Co admin', role: 'ADMIN', side: 'SHARED' },
        prisma,
      ),
    ).resolves.toBeTruthy();
  });


  it('refuses a role the enum no longer has, rather than crashing', async () => {
    const { owner, wedding } = await setup();

    /* The real trigger is a tab opened before the roles were collapsed: it
     * still offers PARENT. That used to escape as a ZodError and become a
     * 500, because the route only catches InviteError and AuthorizationError. */
    await expect(
      inviteMember(
        owner.id, wedding.id,
        { email: 'stale@example.com', name: 'Stale', role: 'PARENT' as never, side: 'BRIDE' },
        prisma,
      ),
    ).rejects.toBeInstanceOf(InviteError);
    expect(await prisma.membership.count({ where: { weddingId: wedding.id } })).toBe(1);
  });

  it('refuses an address that is not an address', async () => {
    const { owner, wedding } = await setup();

    await expect(
      inviteMember(
        owner.id, wedding.id,
        { email: 'not-an-email', name: 'Nope', role: 'MANAGER', side: 'BRIDE' },
        prisma,
      ),
    ).rejects.toBeInstanceOf(InviteError);
  });

  it('refuses a duplicate invitation', async () => {
    const { owner, wedding } = await setup();
    const input = { email: 'dup@example.com', name: 'Dup', role: 'MANAGER' as const, side: 'BRIDE' as const };
    await inviteMember(owner.id, wedding.id, input, prisma);
    await expect(inviteMember(owner.id, wedding.id, input, prisma)).rejects.toBeInstanceOf(InviteError);
  });

  it('refuses to let someone else accept an invitation they were sent', async () => {
    const { owner, wedding } = await setup();
    const { membership } = await inviteMember(
      owner.id,
      wedding.id,
      { email: 'target@example.com', name: 'Target', role: 'MANAGER', side: 'BRIDE' },
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
      { email: existing.email, name: 'Already here', role: 'MANAGER', side: 'BRIDE' },
      prisma,
    );
    expect(user.id).toBe(existing.id);
  });

  it('lists pending invitations for the invitee', async () => {
    const { owner, wedding } = await setup();
    const { user } = await inviteMember(
      owner.id,
      wedding.id,
      { email: 'pending@example.com', name: 'Pending', role: 'MANAGER', side: 'GROOM' },
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

    const invite = async (email: string, role: 'ADMIN' | 'MANAGER', side: 'BRIDE' | 'GROOM') => {
      const { membership, user } = await inviteMember(
        brideDad.id, wedding.id,
        { email, name: email, role, side },
        prisma,
      );
      await acceptInvite(user.id, membership.id, prisma);
      return user;
    };

    const groomDad = await invite('groomdad@example.com', 'MANAGER', 'GROOM');
    const cousin = await invite('cousin@example.com', 'MANAGER', 'BRIDE');

    // Every accepted organizer sees the full guest list and every event.
    for (const u of [brideDad, groomDad, cousin]) {
      await expect(requirePermission(u.id, wedding.id, 'guests', 'write', prisma)).resolves.toBeTruthy();
      await expect(requirePermission(u.id, wedding.id, 'events', 'write', prisma)).resolves.toBeTruthy();
    }
    const events = await prisma.event.findMany({ where: { weddingId: wedding.id } });
    expect(events).toHaveLength(4);

    // Both families keep one expense log. Splitting money by side was the old
    // seven-role model; with two roles there is nothing left to partition, and
    // the PRD wants every organizer looking at the same total.
    for (const u of [brideDad, groomDad, cousin]) {
      await expect(
        requirePermission(u.id, wedding.id, 'budget', 'write', prisma),
      ).resolves.toBeTruthy();
    }

    // Managing people is the only thing the two roles do not share. The father
    // who created the wedding is its admin; the organizers he invited are not,
    // so neither can invite anyone themselves.
    const brideCtx = await requirePermission(brideDad.id, wedding.id, 'members', 'manage', prisma);
    expect(brideCtx.membership.role).toBe('ADMIN');
    for (const u of [groomDad, cousin]) {
      await expect(
        requirePermission(u.id, wedding.id, 'members', 'invite', prisma),
      ).rejects.toBeInstanceOf(AuthorizationError);
    }

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
