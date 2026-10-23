import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  WeddingDeleteError,
  deleteWedding,
  weddingDeletionSummary,
} from '../src/lib/weddings/delete';
import { createEvent } from '../src/lib/weddings/events';
import { inviteGuest } from '../src/lib/guests/invite';
import { AuthorizationError, NotAMemberError } from '../src/lib/auth/require-permission';
import { makeMembership, makeTenant, makeUser, prisma, resetDb } from './helpers';

/**
 * Deleting a wedding is the only irreversible action in the product, and the
 * only one gated on the role itself rather than on a permission level.
 */

beforeAll(resetDb);
beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});

/** A wedding with a function, a guest, a vendor and an expense in it. */
async function populated() {
  const { user, wedding } = await makeTenant();
  await createEvent(
    user.id,
    wedding.id,
    {
      name: 'Sangeet',
      type: 'SANGEET',
      startAt: new Date('2026-11-20T13:30:00Z'),
      venueName: null,
      venueCity: null,
      hostSide: 'SHARED',
    },
    prisma,
  );
  await inviteGuest(
    user.id,
    wedding.id,
    { name: 'Bua', email: 'bua@example.com', allowedGuests: 2 },
    prisma,
  );
  const vendor = await prisma.vendor.create({
    data: { weddingId: wedding.id, name: 'Studio Kiran', category: 'PHOTOGRAPHY' },
  });
  await prisma.expense.create({
    data: {
      weddingId: wedding.id,
      title: 'Advance',
      category: 'Photography',
      amount: 2500000n,
      date: new Date(),
      vendorId: vendor.id,
    },
  });
  return { user, wedding };
}

describe('weddingDeletionSummary', () => {
  it('counts what would be destroyed', async () => {
    const { user, wedding } = await populated();

    const summary = await weddingDeletionSummary(user.id, wedding.id, prisma);

    expect(summary.counts).toEqual({
      functions: 1,
      guests: 1,
      organizers: 1,
      expenses: 1,
      vendors: 1,
    });
    expect(summary.brideName).toBe('A');
  });

  it('refuses a manager', async () => {
    const { wedding } = await makeTenant();
    const manager = await makeUser('Manager');
    await makeMembership({ weddingId: wedding.id, userId: manager.id, role: 'MANAGER' });

    await expect(
      weddingDeletionSummary(manager.id, wedding.id, prisma),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe('deleteWedding', () => {
  it('deletes the wedding and everything hanging off it', async () => {
    const { user, wedding } = await populated();

    await deleteWedding(user.id, wedding.id, 'A', prisma);

    expect(await prisma.wedding.count()).toBe(0);
    expect(await prisma.event.count()).toBe(0);
    expect(await prisma.guest.count()).toBe(0);
    expect(await prisma.vendor.count()).toBe(0);
    expect(await prisma.expense.count()).toBe(0);
    expect(await prisma.membership.count()).toBe(0);
    // The people survive; only their membership of this wedding goes.
    expect(await prisma.user.count()).toBe(1);
  });

  it('refuses a manager, who may do everything else', async () => {
    const { wedding } = await makeTenant();
    const manager = await makeUser('Manager');
    await makeMembership({ weddingId: wedding.id, userId: manager.id, role: 'MANAGER' });

    await expect(
      deleteWedding(manager.id, wedding.id, 'A', prisma),
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(await prisma.wedding.count()).toBe(1);
  });

  it('refuses an admin of a different wedding', async () => {
    const mine = await makeTenant();
    const theirs = await makeTenant();

    await expect(
      deleteWedding(mine.user.id, theirs.wedding.id, 'A', prisma),
    ).rejects.toBeInstanceOf(NotAMemberError);
    expect(await prisma.wedding.count()).toBe(2);
  });

  it('refuses a member whose invitation is still unaccepted', async () => {
    const { wedding } = await makeTenant();
    const pending = await makeUser('Pending');
    await makeMembership({
      weddingId: wedding.id,
      userId: pending.id,
      role: 'ADMIN',
      accepted: false,
    });

    await expect(
      deleteWedding(pending.id, wedding.id, 'A', prisma),
    ).rejects.toBeInstanceOf(NotAMemberError);
    expect(await prisma.wedding.count()).toBe(1);
  });

  it('refuses a confirmation that does not match the bride', async () => {
    const { user, wedding } = await makeTenant();

    await expect(
      deleteWedding(user.id, wedding.id, 'B', prisma),
    ).rejects.toBeInstanceOf(WeddingDeleteError);
    await expect(
      deleteWedding(user.id, wedding.id, '', prisma),
    ).rejects.toBeInstanceOf(WeddingDeleteError);
    expect(await prisma.wedding.count()).toBe(1);
  });

  it('forgives case and stray whitespace in the confirmation', async () => {
    const { user, wedding } = await makeTenant();

    // Typed on a phone, where the keyboard capitalises the first letter.
    await deleteWedding(user.id, wedding.id, '  a  ', prisma);

    expect(await prisma.wedding.count()).toBe(0);
  });

  it('leaves the other wedding alone', async () => {
    const mine = await makeTenant();
    const other = await makeTenant();

    await deleteWedding(mine.user.id, mine.wedding.id, 'A', prisma);

    expect(await prisma.wedding.count()).toBe(1);
    const left = await prisma.wedding.findFirstOrThrow();
    expect(left.id).toBe(other.wedding.id);
  });

  it('removes the co-organizers’ access too, without deleting them', async () => {
    const { user, wedding } = await makeTenant();
    const manager = await makeUser('Manager');
    await makeMembership({ weddingId: wedding.id, userId: manager.id, role: 'MANAGER' });

    await deleteWedding(user.id, wedding.id, 'A', prisma);

    expect(await prisma.membership.count()).toBe(0);
    expect(await prisma.user.count()).toBe(2);
  });
});
