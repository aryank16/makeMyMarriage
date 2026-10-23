import type { PrismaClient, Role, Side } from '@prisma/client';
import { z } from 'zod';
import { prisma as defaultPrisma } from '@/lib/db';
import { ROLE_DEFAULTS } from '@/lib/auth/permissions';
import { requirePermission } from '@/lib/auth/require-permission';

export const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('That email address does not look right.'),
  name: z
    .string()
    .trim()
    .min(1, 'Give them a name, or leave it blank and we will use their address.')
    .max(80, 'That name is too long.'),
  role: z.enum(['ADMIN', 'MANAGER'], {
    error: 'Pick a role: Admin or Manager.',
  }),
  side: z.enum(['BRIDE', 'GROOM', 'SHARED'], {
    error: 'Pick a side: the bride\u2019s, the groom\u2019s, or both.',
  }),
});

export type InviteInput = z.infer<typeof inviteSchema>;

export class InviteError extends Error {
  readonly status = 400;
}

/**
 * Invites an organizer. The membership is created unaccepted — it grants
 * nothing until the invitee signs in and accepts, because requirePermission
 * rejects any membership without acceptedAt.
 *
 * Only an admin may grant ADMIN. Otherwise anyone with `members: invite`
 * could promote themselves by inviting an alias.
 */
export async function inviteMember(
  actorId: string,
  weddingId: string,
  input: InviteInput,
  client: PrismaClient = defaultPrisma,
) {
  /* safeParse, not parse: a ZodError thrown from here is neither an
   * InviteError nor an AuthorizationError, so the route rethrows it as a 500.
   * That is reachable without any tampering — a tab opened before the roles
   * were collapsed still offers a role this enum no longer has. Turning it
   * into an InviteError makes it a message under the form. */
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) throw new InviteError(parsed.error.issues[0].message);
  const data = parsed.data;

  const ctx = await requirePermission(actorId, weddingId, 'members', 'invite', client);

  if (data.role === 'ADMIN' && ctx.scope.members !== 'manage') {
    throw new InviteError('Only an admin can grant admin access');
  }

  // They may already exist: invited to another wedding, or already a user.
  const user =
    (await client.user.findUnique({ where: { email: data.email } })) ??
    (await client.user.create({ data: { email: data.email, name: data.name } }));

  const existing = await client.membership.findUnique({
    where: { weddingId_userId: { weddingId, userId: user.id } },
  });
  if (existing) {
    throw new InviteError(
      existing.acceptedAt
        ? 'That person is already a member of this wedding'
        : 'That person has already been invited',
    );
  }

  const membership = await client.membership.create({
    data: {
      weddingId,
      userId: user.id,
      role: data.role as Role,
      side: data.side as Side,
      permissions: ROLE_DEFAULTS[data.role as Role],
      invitedById: actorId,
      acceptedAt: null,
    },
  });

  await client.auditLog.create({
    data: {
      weddingId,
      actorId,
      action: 'membership.invite',
      entityType: 'Membership',
      entityId: membership.id,
      after: { email: data.email, role: data.role, side: data.side },
    },
  });

  return { membership, user };
}

/** Pending invitations for whoever is signed in. */
/**
 * Invitations this user has not accepted, with whoever sent each one.
 *
 * `invitedById` has no relation field on Membership, so the inviters are
 * fetched in one follow-up query rather than one per invitation. It is
 * nullable — an invitation can predate the column, or be created by the
 * system — so `invitedByName` is null in that case and the caller words it
 * impersonally.
 */
export async function pendingInvitesFor(userId: string, client: PrismaClient = defaultPrisma) {
  const invites = await client.membership.findMany({
    where: { userId, acceptedAt: null },
    include: { wedding: true },
  });

  const inviterIds = [...new Set(invites.map((i) => i.invitedById).filter((id): id is string => Boolean(id)))];
  if (inviterIds.length === 0) {
    return invites.map((invite) => ({ ...invite, invitedByName: null }));
  }

  const inviters = await client.user.findMany({
    where: { id: { in: inviterIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(inviters.map((u) => [u.id, u.name]));

  return invites.map((invite) => ({
    ...invite,
    invitedByName: invite.invitedById ? (nameById.get(invite.invitedById) ?? null) : null,
  }));
}

export async function acceptInvite(
  userId: string,
  membershipId: string,
  client: PrismaClient = defaultPrisma,
) {
  const membership = await client.membership.findUnique({ where: { id: membershipId } });
  // Scoped to the caller: a membership id must never be acceptable by anyone
  // who happens to know it.
  if (!membership || membership.userId !== userId) {
    throw new InviteError('Invitation not found');
  }
  if (membership.acceptedAt) return membership;

  const accepted = await client.membership.update({
    where: { id: membershipId },
    data: { acceptedAt: new Date() },
  });

  await client.auditLog.create({
    data: {
      weddingId: membership.weddingId,
      actorId: userId,
      action: 'membership.accept',
      entityType: 'Membership',
      entityId: membershipId,
    },
  });

  return accepted;
}
