import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  GuestInviteError,
  inviteGuest,
  markGuestInvited,
  normalisePhone,
} from '../src/lib/guests/invite';
import { guestShareMessage } from '../src/lib/guests/share';
import { AuthorizationError, NotAMemberError } from '../src/lib/auth/require-permission';
import { makeTenant, makeUser, prisma, resetDb } from './helpers';

/**
 * Guests are invited, not merely recorded.
 *
 * The rule that shapes all of this: one of email or phone must be there. A
 * name on its own is a note to self, and the point of the guest list is that
 * every row can be sent somewhere.
 */

beforeAll(resetDb);
beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});

const guest = (over: Record<string, unknown> = {}) => ({
  name: 'Ramesh & Sunita Sharma',
  allowedGuests: 2,
  email: 'ramesh@example.com',
  ...over,
});

describe('normalisePhone', () => {
  it('accepts the shapes people actually type', () => {
    for (const input of [
      '9810000001',
      '98100 00001',
      '098100-00001',
      '+91 98100 00001',
      '+919810000001',
      '919810000001',
    ]) {
      expect(normalisePhone(input), input).toBe('+919810000001');
    }
  });

  it('rejects anything that is not an Indian mobile', () => {
    // Landlines, short numbers, long numbers, and the 0-5 leading digits that
    // no Indian mobile uses.
    for (const input of ['1234567890', '981000000', '98100000012', '', 'not a number']) {
      expect(normalisePhone(input), input).toBeNull();
    }
  });
});

describe('inviteGuest', () => {
  it('refuses a guest with neither an email nor a phone', async () => {
    const { user, wedding } = await makeTenant();

    await expect(
      inviteGuest(user.id, wedding.id, guest({ email: undefined }), prisma),
    ).rejects.toBeInstanceOf(GuestInviteError);
    expect(await prisma.guest.count()).toBe(0);
  });

  it('adds the guest and mints a link immediately, before any email is sent', async () => {
    const { user, wedding } = await makeTenant();

    const created = await inviteGuest(user.id, wedding.id, guest(), prisma);

    expect(created.email).toBe('ramesh@example.com');
    expect(created.allowedGuests).toBe(2);
    expect(created.inviteToken).toBeTruthy();
    // The row is on the list the moment it is created; whether a message went
    // out is a separate fact.
    expect(created.invitedAt).toBeNull();
  });

  it('accepts a phone number on its own and stores it E.164', async () => {
    const { user, wedding } = await makeTenant();

    const created = await inviteGuest(
      user.id,
      wedding.id,
      guest({ email: undefined, phone: '098100-00001' }),
      prisma,
    );

    expect(created.phone).toBe('+919810000001');
    expect(created.email).toBeNull();
    expect(created.inviteToken).toBeTruthy();
  });

  it('rejects a phone number it cannot parse rather than storing junk', async () => {
    const { user, wedding } = await makeTenant();

    await expect(
      inviteGuest(user.id, wedding.id, guest({ email: undefined, phone: '12345' }), prisma),
    ).rejects.toBeInstanceOf(GuestInviteError);
    expect(await prisma.guest.count()).toBe(0);
  });

  it('refuses the same email twice in one wedding', async () => {
    const { user, wedding } = await makeTenant();
    await inviteGuest(user.id, wedding.id, guest(), prisma);

    await expect(
      inviteGuest(user.id, wedding.id, guest({ name: 'Ramesh' }), prisma),
    ).rejects.toBeInstanceOf(GuestInviteError);
    expect(await prisma.guest.count()).toBe(1);
  });

  it('catches a duplicate phone even when it was typed differently', async () => {
    const { user, wedding } = await makeTenant();
    await inviteGuest(
      user.id,
      wedding.id,
      guest({ email: undefined, phone: '+91 98100 00001' }),
      prisma,
    );

    // Same person, same number, nothing in common as a string.
    await expect(
      inviteGuest(user.id, wedding.id, guest({ email: undefined, phone: '9810000001' }), prisma),
    ).rejects.toBeInstanceOf(GuestInviteError);
    expect(await prisma.guest.count()).toBe(1);
  });

  it('lets the same person be a guest at two different weddings', async () => {
    const a = await makeTenant();
    const b = await makeTenant();

    await inviteGuest(a.user.id, a.wedding.id, guest(), prisma);
    await expect(
      inviteGuest(b.user.id, b.wedding.id, guest(), prisma),
    ).resolves.toBeTruthy();
    expect(await prisma.guest.count()).toBe(2);
  });

  it('gives every guest a different token', async () => {
    const { user, wedding } = await makeTenant();
    await inviteGuest(user.id, wedding.id, guest({ email: 'a@example.com' }), prisma);
    await inviteGuest(user.id, wedding.id, guest({ email: 'b@example.com' }), prisma);

    const tokens = (await prisma.guest.findMany({ select: { inviteToken: true } }))
      .map((g) => g.inviteToken);
    expect(new Set(tokens).size).toBe(2);
  });

  it('lets a manager invite guests — both roles run the guest list', async () => {
    const { wedding } = await makeTenant();
    const manager = await makeUser('Manager');
    await prisma.membership.create({
      data: {
        weddingId: wedding.id,
        userId: manager.id,
        role: 'MANAGER',
        side: 'SHARED',
        permissions: { guests: 'write', events: 'write', vendors: 'write', budget: 'write', photos: 'write', tasks: 'write', members: 'none' },
        acceptedAt: new Date(),
      },
    });

    await expect(
      inviteGuest(manager.id, wedding.id, guest(), prisma),
    ).resolves.toBeTruthy();
  });

  it('refuses someone who is not a member of the wedding', async () => {
    const { wedding } = await makeTenant();
    const stranger = await makeUser('Stranger');

    await expect(
      inviteGuest(stranger.id, wedding.id, guest(), prisma),
    ).rejects.toBeInstanceOf(NotAMemberError);
    expect(await prisma.guest.count()).toBe(0);
  });

  it('refuses a member whose invitation is still unaccepted', async () => {
    const { wedding } = await makeTenant();
    const pending = await makeUser('Pending');
    await prisma.membership.create({
      data: {
        weddingId: wedding.id,
        userId: pending.id,
        role: 'ADMIN',
        side: 'SHARED',
        permissions: { guests: 'write', events: 'write', vendors: 'write', budget: 'write', photos: 'write', tasks: 'write', members: 'manage' },
        acceptedAt: null,
      },
    });

    /* NotAMemberError, not AuthorizationError: until they accept, the
     * chokepoint answers as though the wedding does not exist, so an
     * unaccepted invitation cannot be used to confirm an id. */
    await expect(
      inviteGuest(pending.id, wedding.id, guest(), prisma),
    ).rejects.toBeInstanceOf(NotAMemberError);
    expect(await prisma.guest.count()).toBe(0);
  });

  it('refuses a member narrowed to read-only on guests', async () => {
    const { wedding } = await makeTenant();
    const reader = await makeUser('Reader');
    await prisma.membership.create({
      data: {
        weddingId: wedding.id,
        userId: reader.id,
        role: 'MANAGER',
        side: 'SHARED',
        // Neither role ships with this, but the column allows a narrowed
        // scope, and the chokepoint has to keep biting when it is set.
        permissions: { guests: 'read', events: 'write', vendors: 'write', budget: 'write', photos: 'write', tasks: 'write', members: 'none' },
        acceptedAt: new Date(),
      },
    });

    await expect(
      inviteGuest(reader.id, wedding.id, guest(), prisma),
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(await prisma.guest.count()).toBe(0);
  });

  it('refuses an invitation that admits nobody, or a crowd', async () => {
    const { user, wedding } = await makeTenant();

    for (const allowedGuests of [0, -1, 51, 1.5, Number.NaN]) {
      await expect(
        inviteGuest(user.id, wedding.id, guest({ allowedGuests }), prisma),
        String(allowedGuests),
      ).rejects.toBeInstanceOf(GuestInviteError);
    }
    expect(await prisma.guest.count()).toBe(0);
  });

  it('writes an audit entry naming the guest', async () => {
    const { user, wedding } = await makeTenant();
    const created = await inviteGuest(user.id, wedding.id, guest(), prisma);

    const entries = await prisma.auditLog.findMany({
      where: { weddingId: wedding.id, action: 'guest.invite' },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].entityId).toBe(created.id);
    expect(entries[0].actorId).toBe(user.id);
  });
});

describe('markGuestInvited', () => {
  it('records that a message actually went out', async () => {
    const { user, wedding } = await makeTenant();
    const created = await inviteGuest(user.id, wedding.id, guest(), prisma);

    const updated = await markGuestInvited(created.id, prisma);

    expect(updated.invitedAt).toBeInstanceOf(Date);
  });
});

describe('guestShareMessage', () => {
  const details = {
    guestName: 'Ramesh & Sunita Sharma',
    brideName: 'Priya',
    groomName: 'Arjun',
    city: 'Jaipur',
    token: 'tok_abc',
  };

  it('is ready to send: it names the guest, the couple, the date and the link', () => {
    const message = guestShareMessage({
      ...details,
      weddingDate: new Date('2026-11-21T00:00:00Z'),
      allowedGuests: 2,
    });

    expect(message).toContain('Ramesh & Sunita Sharma');
    expect(message).toContain('Priya & Arjun');
    expect(message).toContain('November 2026');
    expect(message).toContain('Jaipur');
    expect(message).toContain('2 people');
    expect(message).toContain('/i/tok_abc');
  });

  it('says nothing about a date that is not fixed yet', () => {
    const message = guestShareMessage({
      ...details,
      weddingDate: null,
      allowedGuests: 1,
    });

    expect(message).toContain('Priya & Arjun');
    expect(message).not.toContain('undefined');
    expect(message).not.toContain('Invalid Date');
    // A single guest is not told their invitation is for one person.
    expect(message).not.toContain('1 people');
  });
});
