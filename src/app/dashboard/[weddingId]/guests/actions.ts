'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { AuthorizationError } from '@/lib/auth/require-permission';
import { GuestInviteError, inviteGuest, markGuestInvited } from '@/lib/guests/invite';
import { guestInviteUrl } from '@/lib/guests/share';
import { sendEmail } from '@/lib/email/send';
import { guestInvitationEmail } from '@/lib/email/guest-invitation-email';

export async function inviteGuestAction(formData: FormData) {
  const user = await requireUser();
  const weddingId = String(formData.get('weddingId'));
  const back = `/dashboard/${weddingId}/guests`;

  const email = String(formData.get('email') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();

  /* parseInt on an empty field gives NaN, which the schema rejects with its
   * own wording — so the raw value goes straight through rather than being
   * silently defaulted to 1. Someone who clears the field meant something. */
  const allowedRaw = String(formData.get('allowedGuests') ?? '').trim();

  let guest;
  try {
    guest = await inviteGuest(user.id, weddingId, {
      name: String(formData.get('name') ?? ''),
      email: email || undefined,
      phone: phone || undefined,
      allowedGuests: allowedRaw === '' ? 1 : Number(allowedRaw),
      notes: String(formData.get('notes') ?? '') || undefined,
    });
  } catch (e) {
    if (e instanceof GuestInviteError || e instanceof AuthorizationError) {
      redirect(`${back}?error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }

  /* The guest exists and has a link from here on. Everything below is about
   * telling them, and a failure there is reported rather than thrown — the
   * invitation is real either way, and the organizer can always share the
   * link by hand. */
  revalidatePath(back);

  if (!guest.email || !guest.inviteToken) {
    // Phone only: nothing to send. The row carries the link for WhatsApp.
    redirect(`${back}?invited=${encodeURIComponent(guest.name)}&status=share_by_hand`);
  }

  const wedding = await prisma.wedding.findUniqueOrThrow({
    where: { id: weddingId },
    select: { brideName: true, groomName: true, weddingDate: true, primaryCity: true },
  });

  const result = await sendEmail(
    guestInvitationEmail({
      to: guest.email,
      guestName: guest.name,
      brideName: wedding.brideName,
      groomName: wedding.groomName,
      weddingDate:
        wedding.weddingDate?.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Asia/Kolkata',
        }) ?? null,
      city: wedding.primaryCity,
      allowedGuests: guest.allowedGuests,
      inviteUrl: guestInviteUrl(guest.inviteToken),
    }),
  );

  if (result.sent) await markGuestInvited(guest.id);

  revalidatePath(back);

  /* Carry the provider's reason through as a code, not as its text: the
   * rejection message names the account owner's address, which has no
   * business in a URL. */
  const status = result.sent
    ? 'sent'
    : result.reason === 'not_configured'
      ? 'no_mailer'
      : result.reason === 'rejected'
        ? (result.code ?? 'send_failed')
        : 'send_failed';

  redirect(`${back}?invited=${encodeURIComponent(guest.email)}&status=${status}`);
}
