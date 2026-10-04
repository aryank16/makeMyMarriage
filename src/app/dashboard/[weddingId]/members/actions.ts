'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { InviteError, inviteMember } from '@/lib/members/invite';
import { AuthorizationError } from '@/lib/auth/require-permission';

export async function inviteAction(formData: FormData) {
  const user = await requireUser();
  const weddingId = String(formData.get('weddingId'));

  try {
    await inviteMember(user.id, weddingId, {
      email: String(formData.get('email') ?? ''),
      name: String(formData.get('name') ?? ''),
      role: formData.get('role') as never,
      side: formData.get('side') as never,
    });
  } catch (e) {
    if (e instanceof InviteError || e instanceof AuthorizationError) {
      redirect(
        `/dashboard/${weddingId}/members?error=${encodeURIComponent(e.message)}`,
      );
    }
    throw e;
  }

  revalidatePath(`/dashboard/${weddingId}/members`);
}
