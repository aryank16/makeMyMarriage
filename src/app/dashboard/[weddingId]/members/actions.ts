'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { InviteError, inviteMember } from '@/lib/members/invite';
import { AuthorizationError } from '@/lib/auth/require-permission';
import { sendEmail } from '@/lib/email/send';
import { invitationEmail } from '@/lib/email/invitation-email';
import { safeNext } from '@/lib/auth/safe-next';
import { appUrl } from '@/lib/app-url';

export async function inviteAction(formData: FormData) {
  const actor = await requireUser();
  const weddingId = String(formData.get('weddingId'));
  const email = String(formData.get('email') ?? '').trim().toLowerCase();

  // Name is optional on the form — the email is what identifies someone. A
  // placeholder keeps the record readable until they sign in and set theirs.
  const typedName = String(formData.get('name') ?? '').trim();
  const name = typedName || email.split('@')[0];

  /* Where to land afterwards. The overview shortcut sends you back to the
   * overview; the Organizers tab keeps you on the tab. It arrives in a form
   * field, so it is attacker-controlled and goes through the same validator
   * as every other redirect target — safeNext falls back to a safe path and
   * refuses anything off-site. */
  const fallback = `/dashboard/${weddingId}/members`;
  const raw = String(formData.get('returnTo') ?? '').trim();
  const back = raw && safeNext(raw) === raw ? raw : fallback;

  let invited;
  try {
    invited = await inviteMember(actor.id, weddingId, {
      email,
      name,
      role: formData.get('role') as never,
      side: formData.get('side') as never,
    });
  } catch (e) {
    if (e instanceof InviteError || e instanceof AuthorizationError) {
      redirect(`${back}?error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }

  /* The membership exists from here on. Mail is attempted separately and its
   * failure is reported rather than thrown: the invitation is already valid
   * and will be waiting when they sign in, so losing it because a provider
   * was down would be the worse outcome. */
  const wedding = await prisma.wedding.findUniqueOrThrow({
    where: { id: weddingId },
    select: { brideName: true, groomName: true },
  });

  const result = await sendEmail(
    invitationEmail({
      to: email,
      inviterName: actor.name,
      brideName: wedding.brideName,
      groomName: wedding.groomName,
      roleLabel: invited.membership.role.toLowerCase(),
      signInUrl: `${appUrl()}/login`,
    }),
  );

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

  redirect(`${back}?invited=${encodeURIComponent(email)}&status=${status}`);
}
