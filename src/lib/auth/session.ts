import { cache } from 'react';
import type { User } from '@prisma/client';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

/**
 * Resolves the Supabase session to our own User row, creating it on first
 * sign-in. Supabase owns authentication; this table owns everything else,
 * and `supabaseId` is the only link between them.
 *
 * Wrapped in React's cache() so a single request resolves the user once no
 * matter how many server components ask for it.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) return null;

  return linkAuthUser({
    id: authUser.id,
    email: authUser.email,
    name: authUser.user_metadata?.name as string | undefined,
  });
});

/** The Supabase side of an identity, reduced to what our own table needs. */
export type AuthIdentity = {
  /** auth.users.id */
  id: string;
  email: string;
  /** From user_metadata; absent for an email/password sign-up that skipped it. */
  name?: string | null;
};

/**
 * Resolves a Supabase identity to our User row, creating or claiming it.
 *
 * Split out of getCurrentUser so it can be exercised against a real database
 * without a Supabase session. It is the only code that writes `supabaseId`,
 * and until the first real sign-in it had never run against anything.
 */
export async function linkAuthUser(identity: AuthIdentity): Promise<User> {
  const existing = await prisma.user.findUnique({
    where: { supabaseId: identity.id },
  });
  if (existing) return existing;

  // First sign-in. An account may already exist with this email if they were
  // invited as an organizer before ever logging in — claim that row rather
  // than creating a duplicate.
  const byEmail = await prisma.user.findUnique({
    where: { email: identity.email },
  });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { supabaseId: identity.id },
    });
  }

  // `||` rather than `??`: a blank name is as useless as a missing one.
  const name = identity.name?.trim() || identity.email.split('@')[0];

  return prisma.user.create({
    data: { supabaseId: identity.id, email: identity.email, name },
  });
}

/** For routes that must have a user. Middleware should have redirected already. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

/** Every wedding this user belongs to, newest first. */
export async function getUserWeddings(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId, acceptedAt: { not: null } },
    include: { wedding: true },
    orderBy: { createdAt: 'desc' },
  });
  return memberships.map((m) => ({ ...m.wedding, role: m.role, side: m.side }));
}
