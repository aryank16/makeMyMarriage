import type { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/require-permission';

export class WeddingDeleteError extends Error {
  readonly status = 400;
}

/**
 * What a delete would destroy, for the confirmation screen.
 *
 * Counted rather than described, because "this deletes everything" is not
 * something anyone can weigh. Seeing "148 guests" is what makes someone stop
 * and check they picked the right wedding.
 */
export async function weddingDeletionSummary(
  actorId: string,
  weddingId: string,
  client: PrismaClient = defaultPrisma,
) {
  const ctx = await requireWeddingAdmin(actorId, weddingId, client);

  const [wedding, functions, guests, organizers, expenses, vendors] = await Promise.all([
    client.wedding.findUniqueOrThrow({
      where: { id: ctx.weddingId },
      select: { brideName: true, groomName: true, primaryCity: true, weddingDate: true },
    }),
    client.event.count({ where: { weddingId: ctx.weddingId } }),
    client.guest.count({ where: { weddingId: ctx.weddingId } }),
    client.membership.count({ where: { weddingId: ctx.weddingId, acceptedAt: { not: null } } }),
    client.expense.count({ where: { weddingId: ctx.weddingId } }),
    client.vendor.count({ where: { weddingId: ctx.weddingId } }),
  ]);

  return { ...wedding, counts: { functions, guests, organizers, expenses, vendors } };
}

/**
 * Proves the actor may delete this wedding.
 *
 * `members: manage` first, so a manager is refused by the same chokepoint as
 * everywhere else and a non-member cannot learn the wedding exists. Then the
 * role itself: deleting a wedding is the one thing not expressible as a
 * permission level, and the rule is simply that admins do it.
 */
async function requireWeddingAdmin(
  actorId: string,
  weddingId: string,
  client: PrismaClient,
) {
  const ctx = await requirePermission(actorId, weddingId, 'members', 'manage', client);
  if (ctx.membership.role !== 'ADMIN') {
    throw new WeddingDeleteError('Only an admin can delete a wedding.');
  }
  return ctx;
}

/**
 * Deletes a wedding and everything hanging off it.
 *
 * `confirmation` must be the bride's name, typed by hand. There is no undo
 * and no trash: every guest, every rupee logged and every invitation link
 * goes, and the links stop working for the guests already holding them. A
 * single misplaced click should not be able to do that, so this asks the
 * person to name the wedding they mean — which also distinguishes it from
 * the other wedding on their dashboard.
 */
export async function deleteWedding(
  actorId: string,
  weddingId: string,
  confirmation: string,
  client: PrismaClient = defaultPrisma,
) {
  const ctx = await requireWeddingAdmin(actorId, weddingId, client);

  const wedding = await client.wedding.findUniqueOrThrow({
    where: { id: ctx.weddingId },
    select: { brideName: true, groomName: true },
  });

  const typed = confirmation.trim().toLocaleLowerCase();
  if (typed !== wedding.brideName.trim().toLocaleLowerCase()) {
    throw new WeddingDeleteError(
      `Type ${wedding.brideName} exactly to confirm you mean this wedding.`,
    );
  }

  /* Every child row cascades from this one delete — events, guests, RSVPs,
   * vendors, expenses, tasks, photos, memberships and the audit log all
   * declare onDelete: Cascade on their wedding relation. Which also means
   * the audit trail goes with it: there is nowhere left to write "this was
   * deleted", so the record of it is the absence. */
  await client.wedding.delete({ where: { id: ctx.weddingId } });

  return { brideName: wedding.brideName, groomName: wedding.groomName };
}
