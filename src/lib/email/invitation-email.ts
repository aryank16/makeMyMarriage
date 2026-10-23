import type { Email } from './send';

/* Kept in step with the brand, but written for mail clients: inline styles
 * only, a table-free single column, and no web fonts — Gmail strips <style>
 * blocks and @font-face, so anything set there would silently fall back. */
const INK = '#1A1613';
const MUTED = '#6B625A';
const ACCENT = '#A1472F';
const BONE = '#FAF7F2';
const LINE = '#E4DCD1';
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export type InvitationEmailInput = {
  to: string;
  /** Who sent it, for the opening line. */
  inviterName: string;
  brideName: string;
  groomName: string;
  /** Lower-cased already, e.g. "parent". */
  roleLabel: string;
  /** Absolute URL of the sign-in page. */
  signInUrl: string;
};

export function invitationEmail(input: InvitationEmailInput): Email {
  const couple = `${input.brideName} & ${input.groomName}`;
  const subject = `${input.inviterName} invited you to help plan ${couple}`;

  /* The address matters, so it is stated in the body. Membership is matched
   * on email: signing up with a different one leaves the invitation
   * unclaimed, which is the single most likely way this goes wrong. */
  const text = [
    `${input.inviterName} has invited you to help plan ${couple} on MakeMyMarriage, as ${input.roleLabel}.`,
    '',
    `Sign in with ${input.to} and the invitation will be waiting on your dashboard:`,
    input.signInUrl,
    '',
    'If you do not have an account yet, create one with that same address.',
    '',
    'If you were not expecting this, you can ignore this email — nothing is shared with you until you accept.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:${BONE};">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px;font-family:${SANS};color:${INK};">
      <p style="margin:0 0 28px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${ACCENT};">
        Invitation
      </p>

      <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:normal;color:${INK};">
        ${escapeHtml(input.inviterName)} invited you to help plan ${escapeHtml(couple)}
      </h1>

      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${MUTED};">
        You have been added as ${escapeHtml(input.roleLabel)}. Sign in with
        <strong style="color:${INK};">${escapeHtml(input.to)}</strong> and the invitation
        will be waiting on your dashboard.
      </p>

      <p style="margin:0 0 28px;">
        <a href="${escapeHtml(input.signInUrl)}"
           style="display:inline-block;background-color:${ACCENT};color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:500;padding:14px 28px;border-radius:10px;">
          Sign in to accept
        </a>
      </p>

      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:${MUTED};">
        No account yet? Create one with that same address and the invitation will appear.
      </p>

      <hr style="border:none;border-top:1px solid ${LINE};margin:32px 0;" />

      <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">
        If you were not expecting this, you can ignore this email. Nothing is shared
        with you until you accept.
      </p>
    </div>
  </body>
</html>`;

  return { to: input.to, subject, html, text };
}

/** Names come from user input and land in markup, so they are escaped. */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
