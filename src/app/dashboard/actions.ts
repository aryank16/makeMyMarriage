'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { acceptInvite } from '@/lib/members/invite';

export async function acceptInviteAction(membershipId: string) {
  const user = await requireUser();
  await acceptInvite(user.id, membershipId);
  revalidatePath('/dashboard');
}
