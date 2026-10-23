import { EventType, Side, type PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { prisma as defaultPrisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/require-permission';

export class EventError extends Error {
  readonly status = 400;
}

export type EventFields = {
  name: string;
  type: EventType;
  startAt: Date;
  venueName: string | null;
  venueCity: string | null;
  hostSide: Side;
};

/**
 * Everything the form can get wrong, checked here rather than at the database.
 *
 * The type and the host side arrive as plain strings from a <select>, and the
 * start time as a Date built from a text field, so none of them are trustworthy
 * however the form is drawn: an edited option or a stale tab reaches this with
 * a value the enum has never held. Prisma would reject it, but as a
 * PrismaClientValidationError the route cannot tell from an AuthorizationError
 * — so it escapes as a 500 and the organizer loses everything they typed.
 * Caught here, it is a sentence under the field instead.
 */
const eventFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Give the function a name.')
    .max(80, 'That name is too long for the schedule.'),
  type: z.enum(EventType, {
    error: 'That is not a kind of function we know about.',
  }),
  // z.date() rejects an Invalid Date, which is what an unparseable date field
  // produces. Epoch 0 is deliberately valid: it is the "not fixed yet" marker.
  startAt: z.date({ error: 'That date is not a real one.' }),
  venueName: z.string().trim().max(120, 'That venue name is too long.').nullable(),
  venueCity: z.string().trim().max(80, 'That city name is too long.').nullable(),
  hostSide: z.enum(Side, {
    error: 'Pick who is hosting: the bride\u2019s side, the groom\u2019s side, or both.',
  }),
});

/** Throws EventError naming the first thing wrong, or returns clean fields. */
function validate(fields: EventFields): EventFields {
  const parsed = eventFieldsSchema.safeParse(fields);
  if (!parsed.success) throw new EventError(parsed.error.issues[0].message);
  return parsed.data;
}

export async function createEvent(
  actorId: string,
  weddingId: string,
  fields: EventFields,
  client: PrismaClient = defaultPrisma,
) {
  const clean = validate(fields);
  const ctx = await requirePermission(actorId, weddingId, 'events', 'write', client);
  const count = await client.event.count({ where: { weddingId: ctx.weddingId } });

  return client.event.create({
    data: { ...clean, weddingId: ctx.weddingId, sortOrder: count },
  });
}

/**
 * Edits a function.
 *
 * `updateMany` rather than `update`, scoped by weddingId: the id arrives from
 * a form field, so it is attacker-controlled. Matching on the wedding too
 * means an id belonging to another wedding updates nothing, instead of
 * quietly editing a stranger's schedule — the chokepoint proves the actor
 * belongs to *this* wedding, not that the row does.
 */
export async function updateEvent(
  actorId: string,
  weddingId: string,
  eventId: string,
  fields: EventFields,
  client: PrismaClient = defaultPrisma,
) {
  const clean = validate(fields);
  const ctx = await requirePermission(actorId, weddingId, 'events', 'write', client);

  const { count } = await client.event.updateMany({
    where: { id: eventId, weddingId: ctx.weddingId },
    data: clean,
  });
  if (count === 0) throw new EventError('That function no longer exists.');
}

/** Same scoping as the update, and the same reason for it. */
export async function deleteEvent(
  actorId: string,
  weddingId: string,
  eventId: string,
  client: PrismaClient = defaultPrisma,
) {
  const ctx = await requirePermission(actorId, weddingId, 'events', 'write', client);

  const { count } = await client.event.deleteMany({
    where: { id: eventId, weddingId: ctx.weddingId },
  });
  if (count === 0) throw new EventError('That function no longer exists.');
}
