/**
 * Copy for the error codes our auth routes put in the query string.
 *
 * Only codes from this table are ever shown. Echoing an arbitrary `?error=`
 * value back would let anyone place their own text inside a styled, official
 * looking panel on our own domain — a phishing primitive, even though React
 * escapes the markup.
 */
const MESSAGES: Record<string, string> = {
  exchange_failed:
    'That sign-in link did not work. It may have expired or already been used.',
  missing_code: 'That sign-in link was incomplete. Please try again.',
  link_invalid:
    'That reset link did not work. It may have expired, or been opened in a different browser from the one that requested it.',
  no_recovery: 'Request a password reset link to continue.',
};

const FALLBACK = 'Something went wrong. Please try again.';

/** Returns display copy for a code, or null when there is nothing to show. */
export function authErrorMessage(
  raw: string | string[] | undefined | null,
): string | null {
  const code = Array.isArray(raw) ? raw[0] : raw;
  if (!code) return null;
  return MESSAGES[code] ?? FALLBACK;
}
