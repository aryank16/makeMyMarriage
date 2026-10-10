/**
 * Marks a sign-out this tab started deliberately.
 *
 * Signing out clears the cookie, which AuthWatcher notices and answers with
 * router.refresh(). On a protected route that refresh is turned by the proxy
 * into /login?next=<the page you just left> — and because it lands after the
 * sign-out action's own clean redirect, that is the URL you are left looking
 * at. It puts the wedding id in the address bar and points "next" back at a
 * page the person just chose to leave, so the next person to sign in on that
 * machine gets sent there.
 *
 * Module state, not React state: AuthWatcher and the sign-out button are
 * separate components with no common ancestor holding this, and it must be
 * readable synchronously from inside an event listener.
 */
let signingOut = false;

export function beginSignOut() {
  signingOut = true;
}

export function isSigningOut() {
  return signingOut;
}

/** Called once the sign-out navigation is done, so the flag cannot stick. */
export function endSignOut() {
  signingOut = false;
}
