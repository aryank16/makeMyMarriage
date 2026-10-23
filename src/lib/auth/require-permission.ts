import type { Membership, PrismaClient, Side } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/db';
import {
  type Module,
  type PermissionScope,
  parseScope,
  satisfies,
} from './permissions';

/**
 * THE AUTHORIZATION CHOKEPOINT.
 *
 * Every tenant-scoped query and every mutation passes through here. No route
 * handler may query Prisma for wedding data without first calling this and
 * using the weddingId it returns.
 *
 * The weddingId is resolved from the caller's membership, never trusted from
 * a client-supplied parameter — that is what makes cross-tenant reads
 * impossible rather than merely discouraged.
 */

export class AuthorizationError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotAMemberError extends Error {
  readonly status = 404;
  constructor(message = 'Wedding not found') {
    // 404, not 403: a non-member must not be able to learn that a wedding
    // exists by probing ids.
    super(message);
    this.name = 'NotAMemberError';
  }
}

export type AuthContext = {
  membership: Membership;
  weddingId: string;
  userId: string;
  scope: PermissionScope;
  side: Side;
};

export async function requirePermission(
  userId: string,
  weddingId: string,
  module: Module,
  level: string,
  client: PrismaClient = defaultPrisma,
): Promise<AuthContext> {
  const membership = await client.membership.findUnique({
    where: { weddingId_userId: { weddingId, userId } },
  });

  if (!membership || !membership.acceptedAt) throw new NotAMemberError();

  const scope = parseScope(membership.permissions);
  const held = scope[module];

  if (!satisfies(module, held, level)) {
    throw new AuthorizationError(
      `Requires ${module}:${level}, member holds ${module}:${held}`,
    );
  }

  return {
    membership,
    weddingId: membership.weddingId,
    userId,
    scope,
    side: membership.side,
  };
}
