import { appUrl } from '@/lib/app-url';

/** Where a guest's invitation lives. Public — the token is the credential. */
export function guestInviteUrl(token: string) {
  return `${appUrl()}/i/${token}`;
}

export type ShareDetails = {
  guestName: string;
  brideName: string;
  groomName: string;
  weddingDate: Date | null;
  city: string;
  allowedGuests: number;
  token: string;
};

/**
 * The message an organizer pastes into WhatsApp.
 *
 * Written to be sent as-is: it opens with the guest's name, says who is
 * getting married and when, and ends with the link. Most of an Indian guest
 * list is reached on WhatsApp rather than by email, so for a guest with only
 * a phone number this text *is* the invitation — the app cannot send it, but
 * it can make sure the organizer does not have to compose it sixty times.
 */
export function guestShareMessage(d: ShareDetails) {
  const couple = `${d.brideName} & ${d.groomName}`;
  const when = d.weddingDate
    ? d.weddingDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : null;

  const lines = [
    `Dear ${d.guestName},`,
    '',
    when
      ? `We would be honoured to have you with us for the wedding of ${couple} on ${when} in ${d.city}.`
      : `We would be honoured to have you with us for the wedding of ${couple} in ${d.city}.`,
    '',
    d.allowedGuests > 1
      ? `Your invitation is for ${d.allowedGuests} people. All the functions and timings are here:`
      : 'All the functions and timings are here:',
    guestInviteUrl(d.token),
  ];

  return lines.join('\n');
}
