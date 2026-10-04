import type { PrismaClient, Role, Side } from '@prisma/client';
import { z } from 'zod';
import { prisma as defaultPrisma } from '@/lib/db';
import { ROLE_DEFAULTS } from '@/lib/auth/permissions';
import { requirePermission } from '@/lib/auth/require-permission';

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(80),
  role: z.enum([
    'OWNER', 'COUPLE', 'PARENT', 'PLANNER', 'COORDINATOR', 'CONTRIBUTOR', 'VIEWER',
  ]),
  side: z.enum(['BRIDE', 'GROOM', 'SHARED']),
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
 * Only OWNER may grant OWNER. Otherwise anyone with `members: invite` could
 * promote themselves by inviting an alias.
 */
export async function inviteMember(
  actorId: string,
  weddingId: string,
  input: InviteInput,
  client: PrismaClient = defaultPrisma,
) {
  const data = inviteSchema.parse(input);
  const ctx = await requirePermission(actorId, weddingId, 'members', 'invite', client);

  if (data.role === 'OWNER' && ctx.scope.members !== 'manage') {
    throw new InviteError('Only an owner can grant owner access');
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
export async function pendingInvitesFor(userId: string, client: PrismaClient = defaultPrisma) {
  return client.membership.findMany({
    where: { userId, acceptedAt: null },
    include: { wedding: true },
  });
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
