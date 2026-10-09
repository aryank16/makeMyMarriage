/**
 * Marker proving the current request came through a password-recovery link.
 *
 * A Supabase session on its own is not that proof: once the recovery code is
 * exchanged the visitor simply looks signed in, and an ordinary signed-in
 * session — a shared laptop, a stolen cookie — would otherwise be enough to
 * silently change the account password. /auth/recovery sets this cookie right
 * after the exchange and the reset form clears it the moment it is used.
 */
export const RECOVERY_COOKIE = 'mm_recovery';

/** Long enough to choose a password, short enough to be useless if left behind. */
export const RECOVERY_COOKIE_MAX_AGE = 15 * 60;

export const RECOVERY_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const;
