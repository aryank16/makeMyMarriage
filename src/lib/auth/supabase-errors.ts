/**
 * Turns a Supabase auth failure into something worth showing a person.
 *
 * Two reasons not to render error.message directly. It is written for
 * developers ("Invalid login credentials", "AuthApiError"), and it changes
 * between Supabase releases, so copy silently drifts. Matching on the stable
 * `code` and falling back to our own wording keeps the surface predictable.
 */

export type AuthFailure = {
  code?: string | null;
  message?: string | null;
  status?: number | null;
  /** supabase-js sets this to AuthRetryableFetchError when the request never landed. */
  name?: string | null;
};

const GENERIC = 'Something went wrong. Please try again.';

export const NETWORK_ERROR =
  'Could not reach the server. Check your connection and try again.';

/** Keyed on Supabase's `code`, which is stable across message rewordings. */
const BY_CODE: Record<string, string> = {
  invalid_credentials: 'That email or password is not right.',
  email_not_confirmed:
    'Confirm your email first — open the link we sent you, then sign in.',
  email_address_invalid: 'That email address is not valid.',
  email_exists: 'That email address is already registered.',
  weak_password:
    'That password is too easy to guess. Try a longer or less common one.',
  same_password: 'That is already your password. Choose a different one.',
  over_request_rate_limit:
    'Too many attempts. Wait a minute and try again.',
  over_email_send_rate_limit:
    'We have sent several emails already. Wait a few minutes before asking for another.',
  signup_disabled: 'New accounts are closed at the moment.',
  provider_disabled: 'That sign-in method is not available yet.',
  validation_failed: 'Check the details above and try again.',
  user_banned: 'This account has been suspended. Get in touch with us.',
  session_expired: 'Your session expired. Please sign in again.',
};

/* Older Supabase builds, and a few endpoints, still answer without a `code`.
 * These substrings are matched case-insensitively against the message only
 * when no code is present. */
const BY_MESSAGE: [RegExp, string][] = [
  [/invalid login credentials/i, BY_CODE.invalid_credentials],
  [/email not confirmed/i, BY_CODE.email_not_confirmed],
  [/already registered|already exists/i, BY_CODE.email_exists],
  [/rate limit|too many requests/i, BY_CODE.over_request_rate_limit],
  [/password should be at least/i, BY_CODE.weak_password],
  [/is invalid/i, BY_CODE.email_address_invalid],
  [/provider is not enabled|unsupported provider/i, BY_CODE.provider_disabled],
];

/** Matches what a browser says when the request never left: Chrome's "Failed
 * to fetch", Safari's "Load failed", Firefox's "NetworkError when attempting". */
const LOOKS_LIKE_NETWORK = /failed to fetch|load failed|network ?error/i;

export function describeAuthError(error: AuthFailure | null | undefined) {
  if (!error) return GENERIC;

  /* supabase-js swallows a dead connection and hands it back as a returned
   * error rather than a thrown one, so this never reaches the catch block.
   * Without this branch an offline user is told "Something went wrong",
   * which sends them hunting for a mistake they did not make. */
  if (
    error.name === 'AuthRetryableFetchError' ||
    (error.message && LOOKS_LIKE_NETWORK.test(error.message))
  ) {
    return NETWORK_ERROR;
  }

  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];

  if (error.message) {
    for (const [pattern, copy] of BY_MESSAGE) {
      if (pattern.test(error.message)) return copy;
    }
  }

  // 429 without a recognised code is still unambiguously rate limiting.
  if (error.status === 429) return BY_CODE.over_request_rate_limit;

  return GENERIC;
}

/**
 * For the catch block. A failed fetch is a thrown TypeError, not an
 * AuthError, and it is the difference between "wrong password" and "you are
 * offline" — worth telling apart.
 */
export function describeThrown(thrown: unknown) {
  if (
    thrown instanceof TypeError ||
    (thrown instanceof Error && /fetch|network/i.test(thrown.message))
  ) {
    return NETWORK_ERROR;
  }
  return GENERIC;
}
