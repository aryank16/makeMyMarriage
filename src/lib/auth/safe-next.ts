const DEFAULT_NEXT = '/dashboard';

/* Landing back on an auth screen after authenticating is never right: at best
 * it loops, at worst the sign-in form stays mounted with its pending state
 * stuck and every control disabled. */
const BLOCKED_PREFIXES = ['/login', '/signup', '/forgot-password', '/auth'];

/**
 * Validates a post-sign-in redirect target.
 *
 * `next` reaches us from the query string, so it is attacker-controlled and
 * has two consumers that must agree: the login page, which hands it to
 * router.push, and /auth/callback, which concatenates it onto the origin.
 * Anything that is not a plain same-site path collapses to the default.
 */
export function safeNext(raw: string | string[] | undefined | null): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return DEFAULT_NEXT;

  // Must be a same-site absolute path. This rejects protocol-relative
  // ("//host") and absolute ("https://host") targets — the latter would make
  // `${origin}${next}` an unparseable string and throw inside the callback.
  if (!value.startsWith('/')) return DEFAULT_NEXT;
  if (value.startsWith('//')) return DEFAULT_NEXT;

  // Browsers normalise backslashes to forward slashes in URLs, so "/\evil.com"
  // is another spelling of "//evil.com".
  if (value.includes('\\')) return DEFAULT_NEXT;

  // Control characters, including CR and LF, have no business in a Location.
  if (/[\u0000-\u001f\u007f]/.test(value)) return DEFAULT_NEXT;

  const path = value.split(/[?#]/)[0];
  if (BLOCKED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return DEFAULT_NEXT;
  }

  return value;
}
