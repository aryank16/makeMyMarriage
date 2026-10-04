import { z } from 'zod';
import type { Role, Side } from '@prisma/client';

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
 * Role default bundles. Budget defaults to own-side only for every family
 * role: a shared workspace must not disclose one family's itemised spend to
 * the other by default. The hired planner is the single cross-side exception,
 * because that is the job.
 */
export const ROLE_DEFAULTS: Record<Role, PermissionScope> = {
  OWNER: {
    guests: 'write',
    events: 'write',
    vendors: 'write',
    budget: 'write_own_side',
    photos: 'write',
    tasks: 'write',
    members: 'manage',
  },
  COUPLE: {
    guests: 'write',
    events: 'write',
    vendors: 'write',
    budget: 'write_own_side',
    photos: 'write',
    tasks: 'write',
    members: 'invite',
  },
  PARENT: {
    guests: 'write',
    events: 'write',
    vendors: 'write',
    budget: 'write_own_side',
    photos: 'write',
    tasks: 'write',
    members: 'invite',
  },
  PLANNER: {
    guests: 'write',
    events: 'write',
    vendors: 'write',
    budget: 'read',
    photos: 'write',
    tasks: 'write',
    members: 'none',
  },
  COORDINATOR: {
    guests: 'write',
    events: 'read',
    vendors: 'read',
    budget: 'none',
    photos: 'write',
    tasks: 'write',
    members: 'none',
  },
  CONTRIBUTOR: {
    guests: 'read',
    events: 'read',
    vendors: 'none',
    budget: 'none',
    photos: 'write',
    tasks: 'read',
    members: 'none',
  },
  VIEWER: {
    guests: 'none',
    events: 'read',
    vendors: 'none',
    budget: 'none',
    photos: 'read',
    tasks: 'read',
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

/**
 * Which budget sides this member may see, before accounting for other
 * memberships that have opted into sharing. SHARED is always visible to
 * anyone with any budget access at all.
 */
export function ownBudgetSides(
  level: BudgetLevel,
  side: Side,
): Side[] {
  if (level === 'none') return [];
  if (level === 'read' || level === 'write') {
    return ['BRIDE', 'GROOM', 'SHARED'];
  }
  return side === 'SHARED' ? ['SHARED'] : [side, 'SHARED'];
}
