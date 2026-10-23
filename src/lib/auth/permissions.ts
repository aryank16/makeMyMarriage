import { z } from 'zod';
import type { Role } from '@prisma/client';

/**
 * Permissions are a scope object per module, never a boolean admin flag.
 *
 * The reason, from the spec: `isAdmin` cannot express "manages 300 guests,
 * never sees money" — which is the single most common real-world need, the
 * cousin who runs the guest list. A role is a named default bundle; the
 * stored JSON on Membership is the source of truth.
 */

export const MODULES = [
  'guests',
  'events',
  'vendors',
  'budget',
  'photos',
  'tasks',
  'members',
] as const;

export type Module = (typeof MODULES)[number];

/** Ordered weakest to strongest. Index comparison drives satisfies(). */
const LEVELS = ['none', 'read', 'write'] as const;
const BUDGET_LEVELS = [
  'none',
  'read_own_side',
  'write_own_side',
  'read',
  'write',
] as const;
const MEMBER_LEVELS = ['none', 'invite', 'manage'] as const;

export type Level = (typeof LEVELS)[number];
export type BudgetLevel = (typeof BUDGET_LEVELS)[number];
export type MemberLevel = (typeof MEMBER_LEVELS)[number];

const levelEnum = z.enum(LEVELS);

export const permissionScopeSchema = z.object({
  guests: levelEnum,
  events: levelEnum,
  vendors: levelEnum,
  photos: levelEnum,
  tasks: levelEnum,
  budget: z.enum(BUDGET_LEVELS),
  members: z.enum(MEMBER_LEVELS),
});

export type PermissionScope = z.infer<typeof permissionScopeSchema>;

/**
 * What each role may do.
 *
 * Two roles, per the spec. Both can run the whole wedding — guests, events,
 * vendors, money, photos, tasks — because a family splitting the work does
 * not want to discover that the person holding the guest list cannot also
 * pay the caterer.
 *
 * The single difference is `members`. Only an Admin can bring someone in,
 * remove them, or change a role, which keeps control of who has access in
 * the hands of the people whose wedding it is.
 *
 * The scope object stays even though both rows now look alike apart from one
 * field: it is what requirePermission reads, every stored membership already
 * carries one, and a third role later changes this table instead of the
 * checks scattered through the app.
 */
export const ROLE_DEFAULTS: Record<Role, PermissionScope> = {
  ADMIN: {
    guests: 'write',
    events: 'write',
    vendors: 'write',
    budget: 'write',
    photos: 'write',
    tasks: 'write',
    members: 'manage',
  },
  MANAGER: {
    guests: 'write',
    events: 'write',
    vendors: 'write',
    budget: 'write',
    photos: 'write',
    tasks: 'write',
    members: 'none',
  },
};

function rank(scale: readonly string[], value: string): number {
  const i = scale.indexOf(value);
  if (i === -1) throw new Error(`Unknown permission level: ${value}`);
  return i;
}

/** Does `held` meet or exceed `needed` for this module? */
export function satisfies(
  module: Module,
  held: string,
  needed: string,
): boolean {
  const scale =
    module === 'budget'
      ? BUDGET_LEVELS
      : module === 'members'
        ? MEMBER_LEVELS
        : LEVELS;
  return rank(scale, held) >= rank(scale, needed);
}

export function parseScope(value: unknown): PermissionScope {
  return permissionScopeSchema.parse(value);
}

