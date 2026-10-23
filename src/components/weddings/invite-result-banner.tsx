/**
 * What actually happened to the last invitation.
 *
 * Shared so the Organizers tab, the overview shortcut and the guest list all
 * say the same thing. The wording distinguishes "no mailer configured" from
 * "the mailer refused it", because the fix is different and in both cases the
 * invitation itself is valid — only the email is missing.
 *
 * `kind` changes the consolation, not the diagnosis: an organizer with no
 * email still finds the invitation waiting when they sign in, whereas a guest
 * never signs in at all — their link has to be shared by hand instead. Saying
 * the organizer sentence to someone inviting their aunt would be nonsense.
 */
export default function InviteResultBanner({
  invited,
  status,
  error,
  kind = 'organizer',
}: {
  invited?: string;
  status?: string;
  error?: string;
  kind?: 'organizer' | 'guest';
}) {
  const fallback =
    kind === 'guest'
      ? 'Their invitation link is ready on the list — share it on WhatsApp.'
      : 'They will still see the invitation when they sign in with that address.';

  let tone: 'ok' | 'warn' | 'bad';
  let text: string;

  if (error) {
    tone = 'bad';
    text = error;
  } else if (!invited) {
    return null;
  } else if (status === 'sent') {
    tone = 'ok';
    text = `Invitation emailed to ${invited}.`;
  } else if (status === 'share_by_hand') {
    /* Not a failure: a guest added by phone only. Nothing was meant to be
     * sent, so this says what to do next rather than apologising. */
    tone = 'ok';
    text = `${invited} is on the guest list. Nothing was emailed — use WhatsApp or copy their link.`;
  } else if (status === 'no_mailer') {
    tone = 'warn';
    text = `${invited} has been added, but no email was sent — email delivery is not configured yet. ${fallback}`;
  } else if (status === 'sandbox_restricted') {
    tone = 'warn';
    text = `${invited} has been added, but no email was sent: the mail provider is still in test mode, which only delivers to the account owner's own address. Verify a sending domain to email anyone else. ${fallback}`;
  } else if (status === 'unverified_domain') {
    tone = 'warn';
    text = `${invited} has been added, but no email was sent: the sending domain is not verified with the mail provider yet. ${fallback}`;
  } else if (status === 'bad_sender') {
    tone = 'warn';
    text = `${invited} has been added, but no email was sent: the configured From address was rejected. It must look like Name <someone@yourdomain.com>. ${fallback}`;
  } else {
    tone = 'warn';
    text = `${invited} has been added, but the email could not be sent. ${fallback}`;
  }

  const toneClass =
    tone === 'ok'
      ? 'border-line bg-surface text-ink'
      : tone === 'warn'
        ? 'border-accent bg-bone text-ink'
        : 'border-accent bg-surface text-accent';

  return (
    <div
      role="status"
      className={`mb-4 card-radius border px-4 py-3 text-[14px] leading-[1.5] ${toneClass}`}
    >
      {text}
    </div>
  );
}
