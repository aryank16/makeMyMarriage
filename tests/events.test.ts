import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  EventError,
  createEvent,
  deleteEvent,
  updateEvent,
  type EventFields,
} from '../src/lib/weddings/events';
import {
  hasDate,
  istToUtc,
  utcToIstParts,
  whenLabel,
} from '../src/lib/weddings/event-time';
import { AuthorizationError, NotAMemberError } from '../src/lib/auth/require-permission';
import { makeTenant, makeUser, prisma, resetDb } from './helpers';

beforeAll(resetDb);
beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});

const fields = (over: Partial<EventFields> = {}): EventFields => ({
  name: 'Sangeet',
  type: 'SANGEET',
  startAt: istToUtc('2026-11-20', '19:00'),
  venueName: 'The Oberoi Udaivilas',
  venueCity: 'Udaipur',
  hostSide: 'SHARED',
  ...over,
});

describe('event times', () => {
  it('round-trips an IST wall clock through UTC storage', () => {
    // The one that matters: a 7pm sangeet must come back as 7pm, not 1:30pm.
    const stored = istToUtc('2026-11-20', '19:00');
    expect(stored.toISOString()).toBe('2026-11-20T13:30:00.000Z');
    expect(utcToIstParts(stored)).toEqual({ date: '2026-11-20', time: '19:00' });
  });

  it('round-trips a time that crosses midnight in UTC', () => {
    // A 2am muhurat is the previous day in UTC; the edit form must still
    // show the Indian date the couple picked.
    const stored = istToUtc('2026-11-21', '02:00');
    expect(stored.toISOString()).toBe('2026-11-20T20:30:00.000Z');
    expect(utcToIstParts(stored)).toEqual({ date: '2026-11-21', time: '02:00' });
  });

  it('treats epoch 0 as "no date yet" and leaves the form blank', () => {
    expect(hasDate(new Date(0))).toBe(false);
    expect(utcToIstParts(new Date(0))).toEqual({ date: '', time: '' });
    expect(whenLabel(new Date(0))).toBe('date not set');
  });

  it('defaults a missing time to midnight rather than to now', () => {
    expect(utcToIstParts(istToUtc('2026-11-20', ''))).toEqual({
      date: '2026-11-20',
      time: '00:00',
    });
  });
});

describe('field validation', () => {
  /* These all arrive from a <select> or a text field, so none of them is
   * trustworthy. Before this they reached Prisma and came back as a
   * PrismaClientValidationError, which the route rethrew as a 500. */

  it('refuses a function type the enum has never held', async () => {
    const { user, wedding } = await makeTenant();

    await expect(
      createEvent(user.id, wedding.id, fields({ type: 'NOT_A_TYPE' as never }), prisma),
    ).rejects.toBeInstanceOf(EventError);
    expect(await prisma.event.count()).toBe(0);
  });

  it('refuses a host side the enum has never held', async () => {
    const { user, wedding } = await makeTenant();

    await expect(
      createEvent(user.id, wedding.id, fields({ hostSide: 'NEITHER' as never }), prisma),
    ).rejects.toBeInstanceOf(EventError);
    expect(await prisma.event.count()).toBe(0);
  });

  it('refuses a date that is not a real one', async () => {
    const { user, wedding } = await makeTenant();

    await expect(
      createEvent(user.id, wedding.id, fields({ startAt: new Date('not-a-date') }), prisma),
    ).rejects.toBeInstanceOf(EventError);
    expect(await prisma.event.count()).toBe(0);
  });

  it('still accepts the epoch-0 marker for a date that is not fixed', async () => {
    const { user, wedding } = await makeTenant();

    const event = await createEvent(
      user.id, wedding.id, fields({ startAt: new Date(0) }), prisma,
    );

    expect(hasDate(event.startAt)).toBe(false);
  });

  it('trims the name it stores rather than storing the padding', async () => {
    const { user, wedding } = await makeTenant();

    const event = await createEvent(
      user.id, wedding.id, fields({ name: '  Sangeet  ' }), prisma,
    );

    expect(event.name).toBe('Sangeet');
  });

  it('applies the same checks on edit, not only on create', async () => {
    const { user, wedding } = await makeTenant();
    const event = await createEvent(user.id, wedding.id, fields(), prisma);

    await expect(
      updateEvent(user.id, wedding.id, event.id, fields({ type: 'NOT_A_TYPE' as never }), prisma),
    ).rejects.toBeInstanceOf(EventError);

    const after = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.type).toBe('SANGEET');
  });
});

describe('updateEvent', () => {
  it('edits a function in place', async () => {
    const { user, wedding } = await makeTenant();
    const event = await createEvent(user.id, wedding.id, fields(), prisma);

    await updateEvent(
      user.id,
      wedding.id,
      event.id,
      fields({ name: 'Sangeet & Cocktails', venueCity: 'Jaipur' }),
      prisma,
    );

    const after = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.name).toBe('Sangeet & Cocktails');
    expect(after.venueCity).toBe('Jaipur');
    expect(await prisma.event.count()).toBe(1);
  });

  it('can clear a date that turned out not to be fixed', async () => {
    const { user, wedding } = await makeTenant();
    const event = await createEvent(user.id, wedding.id, fields(), prisma);

    await updateEvent(user.id, wedding.id, event.id, fields({ startAt: new Date(0) }), prisma);

    const after = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(hasDate(after.startAt)).toBe(false);
  });

  it('refuses to edit a function belonging to another wedding', async () => {
    const mine = await makeTenant();
    const theirs = await makeTenant();
    const target = await createEvent(theirs.user.id, theirs.wedding.id, fields(), prisma);

    /* The id is passed with MY wedding, which I am a member of. Without the
     * weddingId in the where clause this would rename their sangeet. */
    await expect(
      updateEvent(mine.user.id, mine.wedding.id, target.id, fields({ name: 'Hijacked' }), prisma),
    ).rejects.toBeInstanceOf(EventError);

    const after = await prisma.event.findUniqueOrThrow({ where: { id: target.id } });
    expect(after.name).toBe('Sangeet');
  });

  it('refuses a blank name', async () => {
    const { user, wedding } = await makeTenant();
    const event = await createEvent(user.id, wedding.id, fields(), prisma);

    await expect(
      updateEvent(user.id, wedding.id, event.id, fields({ name: '   ' }), prisma),
    ).rejects.toBeInstanceOf(EventError);

    const after = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.name).toBe('Sangeet');
  });

  it('refuses someone who is not a member', async () => {
    const { user, wedding } = await makeTenant();
    const event = await createEvent(user.id, wedding.id, fields(), prisma);
    const stranger = await makeUser('Stranger');

    await expect(
      updateEvent(stranger.id, wedding.id, event.id, fields({ name: 'Hijacked' }), prisma),
    ).rejects.toBeInstanceOf(NotAMemberError);
  });

  it('refuses a member narrowed to read-only on events', async () => {
    const { user, wedding } = await makeTenant();
    const event = await createEvent(user.id, wedding.id, fields(), prisma);
    const reader = await makeUser('Reader');
    await prisma.membership.create({
      data: {
        weddingId: wedding.id,
        userId: reader.id,
        role: 'MANAGER',
        side: 'SHARED',
        permissions: { guests: 'write', events: 'read', vendors: 'write', budget: 'write', photos: 'write', tasks: 'write', members: 'none' },
        acceptedAt: new Date(),
      },
    });

    await expect(
      updateEvent(reader.id, wedding.id, event.id, fields({ name: 'Nope' }), prisma),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe('deleteEvent', () => {
  it('removes the function', async () => {
    const { user, wedding } = await makeTenant();
    const event = await createEvent(user.id, wedding.id, fields(), prisma);

    await deleteEvent(user.id, wedding.id, event.id, prisma);

    expect(await prisma.event.count()).toBe(0);
  });

  it('takes the guest responses with it', async () => {
    const { user, wedding } = await makeTenant();
    const event = await createEvent(user.id, wedding.id, fields(), prisma);
    const guest = await prisma.guest.create({
      data: { weddingId: wedding.id, name: 'Bua', side: 'SHARED', tags: [] },
    });
    await prisma.rsvp.create({
      data: { weddingId: wedding.id, guestId: guest.id, eventId: event.id },
    });

    await deleteEvent(user.id, wedding.id, event.id, prisma);

    expect(await prisma.rsvp.count()).toBe(0);
    // The guest stays on the list — only their answer to this one function
    // is gone.
    expect(await prisma.guest.count()).toBe(1);
  });

  it('unbooks vendors without deleting them', async () => {
    const { user, wedding } = await makeTenant();
    const event = await createEvent(user.id, wedding.id, fields(), prisma);
    const vendor = await prisma.vendor.create({
      data: { weddingId: wedding.id, name: 'Studio Kiran', category: 'PHOTOGRAPHY' },
    });
    await prisma.vendorEvent.create({ data: { vendorId: vendor.id, eventId: event.id } });

    await deleteEvent(user.id, wedding.id, event.id, prisma);

    expect(await prisma.vendorEvent.count()).toBe(0);
    expect(await prisma.vendor.count()).toBe(1);
  });

  it('refuses to delete a function belonging to another wedding', async () => {
    const mine = await makeTenant();
    const theirs = await makeTenant();
    const target = await createEvent(theirs.user.id, theirs.wedding.id, fields(), prisma);

    await expect(
      deleteEvent(mine.user.id, mine.wedding.id, target.id, prisma),
    ).rejects.toBeInstanceOf(EventError);
    expect(await prisma.event.count()).toBe(1);
  });

  it('refuses someone who is not a member', async () => {
    const { user, wedding } = await makeTenant();
    const event = await createEvent(user.id, wedding.id, fields(), prisma);
    const stranger = await makeUser('Stranger');

    await expect(
      deleteEvent(stranger.id, wedding.id, event.id, prisma),
    ).rejects.toBeInstanceOf(NotAMemberError);
    expect(await prisma.event.count()).toBe(1);
  });

  it('complains rather than throwing when the function is already gone', async () => {
    const { user, wedding } = await makeTenant();
    const event = await createEvent(user.id, wedding.id, fields(), prisma);
    await deleteEvent(user.id, wedding.id, event.id, prisma);

    // Two organizers with the page open, both clicking delete.
    await expect(
      deleteEvent(user.id, wedding.id, event.id, prisma),
    ).rejects.toBeInstanceOf(EventError);
  });
});
