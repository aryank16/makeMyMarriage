'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  RECOVERY_COOKIE,
  RECOVERY_COOKIE_OPTIONS,
} from '@/lib/auth/recovery';
import { newPasswordSchema, fieldErrors } from '@/lib/auth/credentials';
import { describeAuthError } from '@/lib/auth/supabase-errors';

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

  const parsed = newPasswordSchema.safeParse({
    password: String(formData.get('password') ?? ''),
    confirm: String(formData.get('confirm') ?? ''),
  });
  if (!parsed.success) {
    // This form shows one message, so take the first that applies. The final
    // fallback is not reachable today — every rule in newPasswordSchema
    // carries a password or confirm path — but without it a rule added later
    // under a different path would render an empty alert.
    const errors = fieldErrors(parsed.error);
    return {
      error:
        errors.password ??
        errors.confirm ??
        errors.form ??
        'Check the password and try again.',
    };
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

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  // Supabase still rejects passwords its own policy considers weak, and says
  // so in developer wording — map it like everywhere else.
  if (error) return { error: describeAuthError(error) };

  cookieStore.set(RECOVERY_COOKIE, '', {
    ...RECOVERY_COOKIE_OPTIONS,
    maxAge: 0,
  });

  redirect('/dashboard');
}
