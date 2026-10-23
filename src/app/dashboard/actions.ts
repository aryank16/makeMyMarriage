'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { acceptInvite } from '@/lib/members/invite';
import { AuthorizationError, NotAMemberError } from '@/lib/auth/require-permission';
import { WeddingDeleteError, deleteWedding } from '@/lib/weddings/delete';

export async function acceptInviteAction(membershipId: string) {
  const user = await requireUser();
  await acceptInvite(user.id, membershipId);
  revalidatePath('/dashboard');
}

export async function deleteWeddingAction(formData: FormData) {
  const user = await requireUser();
  const weddingId = String(formData.get('weddingId') ?? '');
  const confirmation = String(formData.get('confirmation') ?? '');

  try {
    await deleteWedding(user.id, weddingId, confirmation);
  } catch (e) {
    if (e instanceof WeddingDeleteError || e instanceof AuthorizationError) {
      // Back to the confirmation, which still names the wedding and says
      // what typing it wrong means.
      redirect(
        `/dashboard?delete=${encodeURIComponent(weddingId)}&error=${encodeURIComponent(e.message)}`,
      );
    }
    /* A non-member gets the chokepoint's 404, and saying so on the dashboard
     * would be noise — the wedding is simply not theirs and not listed. */
    if (e instanceof NotAMemberError) redirect('/dashboard');
    throw e;
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
