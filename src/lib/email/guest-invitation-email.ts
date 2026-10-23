import type { Email } from './send';

/* Same constraints as the organizer invitation: inline styles only, single
 * column, no web fonts — Gmail strips <style> blocks and @font-face. */
const INK = '#1A1613';
const MUTED = '#6B625A';
const ACCENT = '#A1472F';
const BONE = '#FAF7F2';
const LINE = '#E4DCD1';
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export type GuestInvitationEmailInput = {
  to: string;
  guestName: string;
  brideName: string;
  groomName: string;
  /** Already formatted for display, or null while the date is unfixed. */
  weddingDate: string | null;
  city: string;
  allowedGuests: number;
  /** Absolute URL of the guest's own invitation page. */
  inviteUrl: string;
};

/**
 * The invitation a guest receives. Distinct from the organizer one: a guest
 * is not being asked to sign in or to plan anything, so there is no account,
 * no role and no dashboard in it — only the couple, the place, and their own
 * link.
 */
export function guestInvitationEmail(input: GuestInvitationEmailInput): Email {
  const couple = `${input.brideName} & ${input.groomName}`;
  const subject = `You are invited to the wedding of ${couple}`;

  const occasion = input.weddingDate
    ? `${couple} are getting married on ${input.weddingDate} in ${input.city}.`
    : `${couple} are getting married in ${input.city}.`;

  const admits =
    input.allowedGuests > 1
      ? `This invitation is for ${input.allowedGuests} people.`
      : null;

  const text = [
    `Dear ${input.guestName},`,
    '',
    occasion,
    ...(admits ? ['', admits] : []),
    '',
    'All the functions, timings and venues are here:',
    input.inviteUrl,
    '',
    'Keep this link — it is yours.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:${BONE};">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px;font-family:${SANS};color:${INK};">
      <p style="margin:0 0 28px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${ACCENT};">
        You are invited
      </p>

      <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:normal;color:${INK};">
        The wedding of ${escapeHtml(couple)}
      </h1>

      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:${MUTED};">
        Dear ${escapeHtml(input.guestName)}, ${escapeHtml(occasion)}
        ${admits ? escapeHtml(admits) : ''}
      </p>

      <p style="margin:0 0 28px;">
        <a href="${escapeHtml(input.inviteUrl)}"
           style="display:inline-block;background-color:${ACCENT};color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:500;padding:14px 28px;border-radius:10px;">
          See the functions
        </a>
      </p>

      <hr style="border:none;border-top:1px solid ${LINE};margin:32px 0;" />

      <p style="margin:0;font-size:13px;line-height:1.6;color:${MUTED};">
        Keep this link &mdash; it is yours, and it will always show the latest
        schedule.
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
