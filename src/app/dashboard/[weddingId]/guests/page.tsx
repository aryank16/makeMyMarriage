import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/require-permission';
import { satisfies } from '@/lib/auth/permissions';
import { emailIsConfigured } from '@/lib/email/send';
import { guestInviteUrl, guestShareMessage } from '@/lib/guests/share';
import {
  SectionHeading,
  EmptyState,
  FormCard,
  Field,
  TableCard,
  Th,
  Td,
} from '@/components/weddings/section';
import GuestShare from '@/components/weddings/guest-share';
import InviteResultBanner from '@/components/weddings/invite-result-banner';
import { inviteGuestAction } from './actions';

export default async function GuestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ weddingId: string }>;
  searchParams: Promise<{ error?: string; invited?: string; status?: string }>;
}) {
  const { weddingId } = await params;
  const { error, invited, status } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const ctx = await requirePermission(user.id, weddingId, 'guests', 'read');
  const canWrite = satisfies('guests', ctx.scope.guests, 'write');

  const [wedding, guests] = await Promise.all([
    prisma.wedding.findUniqueOrThrow({
      where: { id: ctx.weddingId },
      select: { brideName: true, groomName: true, weddingDate: true, primaryCity: true },
    }),
    prisma.guest.findMany({
      where: { weddingId: ctx.weddingId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // One row is one invitation; the heads it admits is what the caterer needs.
  const heads = guests.reduce((sum, g) => sum + g.allowedGuests, 0);
  const emailed = guests.filter((g) => g.invitedAt).length;
  const mailerReady = emailIsConfigured();

  return (
    <div className="space-y-10">
      <section>
        <SectionHeading>Guest list</SectionHeading>

        <InviteResultBanner invited={invited} status={status} error={error} kind="guest" />

        {guests.length === 0 ? (
          <EmptyState>
            Nobody invited yet. Add an email address or a phone number below and
            the guest appears here with their own invitation link.
          </EmptyState>
        ) : (
          <>
            <p className="mb-3 text-[14px] text-ink-muted">
              {guests.length} {guests.length === 1 ? 'invitation' : 'invitations'}
              {' · '}
              <span className="text-ink">{heads}</span> people invited in total
              {emailed > 0 && ` · ${emailed} emailed`}
            </p>

            <TableCard>
              <thead>
                <tr className="bg-bone border-b border-line">
                  <Th>Guest</Th>
                  <Th>Contact</Th>
                  <Th align="right">Admits</Th>
                  <Th>Invitation</Th>
                  <Th align="right">Share</Th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g, i) => {
                  const share = g.inviteToken
                    ? {
                        link: guestInviteUrl(g.inviteToken),
                        message: guestShareMessage({
                          guestName: g.name,
                          brideName: wedding.brideName,
                          groomName: wedding.groomName,
                          weddingDate: wedding.weddingDate,
                          city: wedding.primaryCity,
                          allowedGuests: g.allowedGuests,
                          token: g.inviteToken,
                        }),
                      }
                    : null;

                  return (
                    <tr
                      key={g.id}
                      className={i === guests.length - 1 ? '' : 'border-b border-line'}
                    >
                      <Td strong>{g.name}</Td>
                      <Td>{[g.phone, g.email].filter(Boolean).join(' · ') || '—'}</Td>
                      <Td align="right">{g.allowedGuests}</Td>
                      <Td>
                        {g.invitedAt ? (
                          <span className="text-ink">
                            Emailed{' '}
                            {g.invitedAt.toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              timeZone: 'Asia/Kolkata',
                            })}
                          </span>
                        ) : (
                          /* The row exists and the link is live, so this is not
                           * "pending" — the only thing missing is telling them. */
                          <span className="text-ink-muted">Link ready to send</span>
                        )}
                      </Td>
                      <Td align="right">
                        {share ? (
                          <GuestShare
                            link={share.link}
                            message={share.message}
                            whatsappUrl={
                              g.phone
                                ? `https://wa.me/${g.phone.replace(/\D/g, '')}?text=${encodeURIComponent(share.message)}`
                                : null
                            }
                          />
                        ) : (
                          '—'
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableCard>
          </>
        )}
      </section>

      {canWrite && (
        <FormCard title="Invite a guest">
          <form action={inviteGuestAction} className="space-y-5">
            <input type="hidden" name="weddingId" value={weddingId} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" htmlFor="name">
                <input
                  id="name"
                  name="name"
                  required
                  placeholder="Ramesh &amp; Sunita Sharma"
                  className="input-field"
                />
              </Field>
              <Field
                label="How many are invited"
                htmlFor="allowedGuests"
                hint="One row per invitation — a couple is one row admitting two."
              >
                <input
                  id="allowedGuests"
                  name="allowedGuests"
                  type="number"
                  min={1}
                  max={50}
                  defaultValue={1}
                  className="input-field"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Phone"
                htmlFor="phone"
                hint="Indian mobile. Used for the WhatsApp message."
              >
                <input
                  id="phone"
                  name="phone"
                  inputMode="tel"
                  placeholder="98100 00001"
                  className="input-field"
                />
              </Field>
              <Field
                label="Email"
                htmlFor="email"
                hint={
                  mailerReady
                    ? 'The invitation is emailed straight away.'
                    : 'Email delivery is not configured yet, so nothing will be sent.'
                }
              >
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="ramesh@example.com"
                  className="input-field"
                />
              </Field>
            </div>

            <p className="text-[13px] leading-[1.6] text-ink-muted">
              One of the two is enough. With an email we send the invitation
              ourselves; with a phone number you get the message and the link
              ready to paste into WhatsApp.
            </p>

            <Field label="Notes" htmlFor="notes" hint="Optional — how you know them, anything to remember.">
              <input id="notes" name="notes" placeholder="Bride's side, Jaipur" className="input-field" />
            </Field>

            <button type="submit" className="btn-primary btn-block">
              Invite guest
            </button>
          </form>
        </FormCard>
      )}
    </div>
  );
}
