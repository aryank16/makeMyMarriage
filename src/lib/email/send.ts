/**
 * Transactional email.
 *
 * Posted straight to the provider's HTTP API rather than through an SDK:
 * one fetch, no dependency, and swapping provider means changing this file
 * alone. Supabase's mailer is deliberately not used — it is for auth only and
 * is capped at roughly two messages an hour for the whole project.
 *
 * Sending never throws. An invitation that reached the database but failed to
 * reach an inbox is still a real invitation: the person can accept it the
 * moment they sign in. Losing the membership because the mail provider was
 * down would be the worse outcome, so callers get a result and decide what to
 * tell the user.
 */

const ENDPOINT = 'https://api.resend.com/emails';

/**
 * Why a send failed, in terms the UI can act on.
 *
 * `sandbox_restricted` is the one that costs people an afternoon: with the
 * provider's shared test sender, mail is delivered only to the account
 * owner's own address and every other recipient is refused. Nothing in the
 * app is wrong when that happens, so it must not read like a generic error.
 */
export type RejectCode =
  | 'sandbox_restricted'
  | 'unverified_domain'
  | 'bad_sender'
  | 'other';

export type SendResult =
  | { sent: true; id: string | null }
  | {
      sent: false;
      reason: 'not_configured' | 'rejected' | 'unreachable';
      code?: RejectCode;
      detail?: string;
    };

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** Read per call, not at module load, so a key added later needs no rebuild. */
function config() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  return apiKey && from ? { apiKey, from } : null;
}

export function emailIsConfigured() {
  return config() !== null;
}

export async function sendEmail(email: Email): Promise<SendResult> {
  const cfg = config();
  if (!cfg) return { sent: false, reason: 'not_configured' };

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: cfg.from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });

    if (!response.ok) {
      // The body carries the provider's reason — an unverified sending
      // domain, a malformed From, a revoked key. Worth classifying, and it
      // contains no secret.
      const detail = (await response.text()).slice(0, 300);
      return { sent: false, reason: 'rejected', code: classify(detail), detail };
    }

    const body: unknown = await response.json().catch(() => null);
    const id =
      body && typeof body === 'object' && 'id' in body && typeof body.id === 'string'
        ? body.id
        : null;
    return { sent: true, id };
  } catch (thrown) {
    return {
      sent: false,
      reason: 'unreachable',
      detail: thrown instanceof Error ? thrown.message : undefined,
    };
  }
}

/**
 * Reads the provider's rejection into one of our codes.
 *
 * Matched on wording because the provider returns the same 403 and the same
 * `validation_error` name for several different problems, so the status code
 * alone cannot tell them apart. The raw text is never shown to anyone — it
 * names the account owner's address — only the code it maps to.
 */
function classify(detail: string): RejectCode {
  const d = detail.toLowerCase();
  if (d.includes('only send testing emails')) return 'sandbox_restricted';
  if (d.includes('domain is not verified') || d.includes('verify a domain')) {
    return 'unverified_domain';
  }
  if (d.includes('invalid `from`') || d.includes('from` field')) return 'bad_sender';
  return 'other';
}
