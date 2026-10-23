import type { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma as defaultPrisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/require-permission';

/**
 * The token a guest's invitation link is built from: /i/{token}.
 *
 * 32 random bytes, base64url. It is the only thing standing between a link
 * and someone's invitation, so it comes from a CSPRNG rather than anything
 * derived from the guest's own details.
 */
export function inviteToken() {
  return randomBytes(32).toString('base64url');
}

/**
 * Indian mobile numbers, stored E.164 so the same person typed two ways
 * dedupes to one row. Accepts the shapes people actually type — 98100 00001,
 * 098100-00001, +91 98100 00001 — and normalises them to +919810000001.
 *
 * Deliberately narrow: a guest list for an Indian wedding is overwhelmingly
 * Indian mobiles, and a permissive regex that stored junk would make the
 * dedupe index useless. A number this cannot parse is rejected with wording
 * that says what it wanted.
 */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  const bare = digits
    .replace(/^\+91/, '')
    .replace(/^91(?=\d{10}$)/, '')
    .replace(/^0/, '');
  if (!/^[6-9]\d{9}$/.test(bare)) return null;
  return `+91${bare}`;
}

export const inviteGuestSchema = z
  .object({
    name: z.string().trim().min(1, 'Give the guest a name.').max(80),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('That email address does not look right.')
      .optional(),
    phone: z.string().trim().optional(),
    allowedGuests: z
      .number()
      .int('How many are invited must be a whole number.')
      .min(1, 'An invitation has to admit at least one person.')
      .max(50, 'Fifty is the most one invitation can admit.'),
    notes: z.string().trim().max(500).optional(),
  })
  /* The decision that makes this an invitation rather than a note to self:
   * one of the two contact details must be there. Without either, there is
   * nobody to send the link to and the row is just a name. */
  .superRefine((value, ctx) => {
    if (!value.email && !value.phone) {
      ctx.addIssue({
        code: 'custom',
        path: ['email'],
        message: 'Add an email address or a phone number — one of the two is needed to invite them.',
      });
    }
  });

export type InviteGuestInput = z.input<typeof inviteGuestSchema>;

export class GuestInviteError extends Error {
  readonly status = 400;
}

/**
 * Adds a guest and mints their invitation link.
 *
 * The row is created the moment this returns, before any email is attempted,
 * which is what lets the table show them as invited straight away. Whether a
 * message actually went out is recorded separately in `invitedAt` by the
 * caller, because an email can fail and a phone-only guest is shared by hand.
 */
export async function inviteGuest(
  actorId: string,
  weddingId: string,
  input: InviteGuestInput,
  client: PrismaClient = defaultPrisma,
) {
  const parsed = inviteGuestSchema.safeParse(input);
  if (!parsed.success) {
    throw new GuestInviteError(parsed.error.issues[0].message);
  }
  const data = parsed.data;

  let phone: string | null = null;
  if (data.phone) {
    phone = normalisePhone(data.phone);
    if (!phone) {
      throw new GuestInviteError(
        'That phone number does not look like an Indian mobile. Ten digits, or +91 and ten digits.',
      );
    }
  }

  const ctx = await requirePermission(actorId, weddingId, 'guests', 'write', client);

  /* Dedupe within the wedding on whichever details were given. Inviting the
   * same aunt twice produces two links and two messages, and the second one
   * reads as a mistake to her — so it is refused here rather than cleaned up
   * later. Scoped to the wedding: the same person is a legitimate guest at
   * two different weddings. */
  const clash = await client.guest.findFirst({
    where: {
      weddingId: ctx.weddingId,
      OR: [
        ...(data.email ? [{ email: data.email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    },
    select: { name: true, email: true, phone: true },
  });
  if (clash) {
    throw new GuestInviteError(
      `${clash.name} is already on the guest list with that ${clash.email === data.email ? 'email address' : 'phone number'}.`,
    );
  }

  const guest = await client.guest.create({
    data: {
      weddingId: ctx.weddingId,
      name: data.name,
      email: data.email ?? null,
      phone,
      allowedGuests: data.allowedGuests,
      notes: data.notes ?? null,
      inviteToken: inviteToken(),
      // Households are gone from the PRD; the column is nullable now.
      householdId: null,
      side: 'SHARED',
      tags: [],
    },
  });

  await client.auditLog.create({
    data: {
      weddingId: ctx.weddingId,
      actorId,
      action: 'guest.invite',
      entityType: 'Guest',
      entityId: guest.id,
      after: { name: guest.name, email: guest.email, phone: guest.phone },
    },
  });

  return guest;
}

/** Records that an invitation message actually went out. */
export async function markGuestInvited(
  guestId: string,
  client: PrismaClient = defaultPrisma,
) {
  return client.guest.update({
    where: { id: guestId },
    data: { invitedAt: new Date() },
  });
}
