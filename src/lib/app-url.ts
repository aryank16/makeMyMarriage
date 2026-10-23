/**
 * The app's own origin, for links that leave the app and have to come back:
 * invitation emails, and the guest links organizers paste into WhatsApp.
 *
 * Falls back to localhost so a developer gets a working link rather than a
 * broken one, and strips a trailing slash so callers can concatenate paths
 * without producing a double slash.
 */
export function appUrl() {
  return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}
