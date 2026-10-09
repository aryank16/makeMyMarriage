'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  RECOVERY_COOKIE,
  RECOVERY_COOKIE_OPTIONS,
} from '@/lib/auth/recovery';

const MIN_LENGTH = 8;

export type ResetPasswordState = { error: string } | null;

/**
 * Sets a new password for the recovery session.
 *
 * The check runs on the server because the client cannot be trusted to prove
 * anything: the recovery cookie is httpOnly, so this action is the only place
 * that can both read it and clear it, and clearing it here means one recovery
 * link buys exactly one password change.
 */
export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const cookieStore = await cookies();
  if (!cookieStore.get(RECOVERY_COOKIE)) {
    return {
      error:
        'This password reset has expired. Request a new link to continue.',
    };
  }

  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < MIN_LENGTH) {
    return { error: `Use at least ${MIN_LENGTH} characters.` };
  }
  if (password !== confirm) {
    return { error: 'Those two passwords do not match.' };
  }

  const supabase = await createClient();

  // Re-check the session server-side rather than trusting that the page
  // rendered for a signed-in user a moment ago.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        'This password reset has expired. Request a new link to continue.',
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  cookieStore.set(RECOVERY_COOKIE, '', {
    ...RECOVERY_COOKIE_OPTIONS,
    maxAge: 0,
  });

  redirect('/dashboard');
}
