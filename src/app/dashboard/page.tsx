import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUserWeddings } from '@/lib/auth/session';
import { pendingInvitesFor } from '@/lib/members/invite';
import { weddingDeletionSummary } from '@/lib/weddings/delete';
import SignOutButton from '@/components/auth/sign-out-button';
import { AcceptInviteButton } from './accept-invite';
import { deleteWeddingAction } from './actions';

export const metadata: Metadata = {
  title: 'Your wedding · MakeMyMarriage',
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-serif text-[24px] text-ink tabular-nums leading-none">
        {value}
      </div>
      {/* Tighter on a phone: three columns inside a 375px card leave about
        * 74px each, and "ORGANIZERS" at 12px with 0.08em tracking does not
        * fit in that. */}
      <div className="mt-2 text-[11px] sm:text-[12px] font-medium uppercase tracking-[0.04em] sm:tracking-[0.08em] text-ink-muted">
        {label}
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ delete?: string; error?: string }>;
}) {
  const { delete: del, error } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [weddings, invites] = await Promise.all([
    getUserWeddings(user.id),
    pendingInvitesFor(user.id),
  ]);

  /* Only fetched when a delete is actually being confirmed. The summary
   * re-checks that this person is an admin of this wedding, so a hand-typed
   * id for somebody else's wedding never renders a confirmation screen. */
  const deleting =
    del && weddings.some((w) => w.id === del && w.role === 'ADMIN')
      ? await weddingDeletionSummary(user.id, del)
      : null;

  if (weddings.length === 0 && invites.length === 0) redirect('/onboarding');

  /* The design shows a single wedding, which is where the PRD is heading —
   * one user, one wedding. The schema still permits several, so the label
   * follows the data rather than asserting something untrue. */
  const single = weddings.length <= 1;

  return (
    <div className="min-h-screen flex flex-col bg-bone">
      <header className="w-full h-[72px] border-b border-line px-6 sm:px-8 flex items-center justify-between shrink-0">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <Image
            src="/logo.svg"
            alt="MakeMyMarriage"
            width={320}
            height={80}
            priority
            className="h-7 w-auto"
          />
        </Link>

        <div className="flex items-center gap-4 text-[14px]">
          <span className="text-ink-muted hidden sm:inline">{user.email}</span>
          <span className="text-line hidden sm:inline">·</span>
          <SignOutButton className="text-[14px] text-ink-muted hover:text-ink transition-colors disabled:opacity-60" />
        </div>
      </header>

      <main className="flex-1 w-full max-w-[720px] mx-auto px-6 pt-12 pb-24">
        <div className="mb-10">
          <h1 className="font-serif text-[36px] leading-[1.15] text-ink">
            {single ? 'Your wedding' : 'Your weddings'}
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-muted">
            Signed in as {user.email}
          </p>
        </div>

        {invites.length > 0 && (
          <section className="mb-10 space-y-4">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="relative overflow-hidden bg-surface border-standard card-radius p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent"
                />
                <div className="sm:pl-2 sm:pr-4">
                  <div className="mb-1 text-[12px] font-medium uppercase tracking-[0.08em] text-accent">
                    Invitation
                  </div>
                  <div className="font-serif text-[22px] leading-snug text-ink">
                    {invite.wedding.brideName} &amp; {invite.wedding.groomName}
                  </div>
                  <p className="mt-0.5 text-[14px] text-ink-muted">
                    {invite.invitedByName
                      ? `${invite.invitedByName} invited you to help as ${invite.role.toLowerCase()}.`
                      : `You have been invited to help as ${invite.role.toLowerCase()}.`}
                  </p>
                </div>
                <AcceptInviteButton membershipId={invite.id} />
              </div>
            ))}
          </section>
        )}

        {weddings.length > 0 && (
          <>
            <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.08em] text-ink-muted">
              {single ? 'Your wedding' : 'Your weddings'}
            </h2>

            <ul className="space-y-4">
              {weddings.map((wedding) => (
                <li key={wedding.id}>
                  {/* The card was a single <Link>, which left nowhere to put
                    * an action: a link inside a link is invalid, and the
                    * inner one would be swallowed by the outer. The card is
                    * now a plain box with the link stretched across it, so
                    * Delete can sit on top of that overlay. */}
                  <div className="group relative bg-surface border-standard card-radius p-5 sm:p-7 transition-colors hover:border-accent">
                    <Link
                      href={`/dashboard/${wedding.id}`}
                      aria-label={`Open ${wedding.brideName} & ${wedding.groomName}`}
                      className="absolute inset-0 card-radius no-underline"
                    />

                    <span className="absolute top-5 right-5 sm:top-7 sm:right-7 inline-flex items-center rounded-full border border-line bg-bone px-3 py-1 text-[12px] font-medium text-accent">
                      {wedding.role.toLowerCase()}
                    </span>

                    <div className="font-serif text-[30px] leading-tight text-ink pr-20">
                      {wedding.brideName} &amp; {wedding.groomName}
                    </div>
                    <div className="mt-1.5 text-[15px] text-ink-muted">
                      {wedding.primaryCity}
                      {' · '}
                      {wedding.weddingDate
                        ? wedding.weddingDate.toLocaleDateString('en-IN', DATE_FORMAT)
                        : 'date not fixed'}
                    </div>

                    <div className="my-6 h-px w-full bg-line" />

                    <div className="flex items-end justify-between gap-4">
                      <div className="grid flex-1 grid-cols-3 gap-4 sm:gap-6">
                        <Stat value={wedding.counts.functions} label="Functions" />
                        <Stat value={wedding.counts.guests} label="Guests" />
                        <Stat value={wedding.counts.organizers} label="Organizers" />
                      </div>

                      {/* Admins only, and quiet: it sits below the fold of
                        * the card, away from the tap target that opens it. */}
                      {wedding.role === 'ADMIN' && (
                        <Link
                          href={`/dashboard?delete=${wedding.id}#delete-wedding`}
                          className="relative shrink-0 text-[13px] text-ink-muted underline decoration-line underline-offset-2 hover:text-accent"
                        >
                          Delete
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {deleting && (
          <section
            id="delete-wedding"
            className="mt-10 scroll-mt-6 border border-accent bg-surface card-radius p-5 sm:p-7"
          >
            <h2 className="font-serif text-[26px] leading-tight text-ink">
              Delete {deleting.brideName} &amp; {deleting.groomName}?
            </h2>

            <p className="mt-3 text-[15px] leading-[1.6] text-ink">
              This deletes the wedding and everything in it, for every
              organizer — not just for you. The invitation links you have
              already sent will stop working for your guests.
            </p>

            <ul className="mt-4 space-y-1 text-[14px] leading-[1.6] text-ink-muted">
              <li>
                {deleting.counts.functions}{' '}
                {deleting.counts.functions === 1 ? 'function' : 'functions'} and
                their schedule
              </li>
              <li>
                {deleting.counts.guests}{' '}
                {deleting.counts.guests === 1 ? 'guest' : 'guests'} and every
                invitation link
              </li>
              <li>
                {deleting.counts.organizers}{' '}
                {deleting.counts.organizers === 1 ? 'organizer loses' : 'organizers lose'}{' '}
                access
              </li>
              <li>
                {deleting.counts.expenses}{' '}
                {deleting.counts.expenses === 1 ? 'expense' : 'expenses'} and{' '}
                {deleting.counts.vendors}{' '}
                {deleting.counts.vendors === 1 ? 'vendor' : 'vendors'}
              </li>
            </ul>

            <p className="mt-4 text-[14px] text-ink-muted">
              This cannot be undone.
            </p>

            {error && (
              <p
                role="alert"
                className="mt-4 card-radius border border-accent bg-bone px-4 py-3 text-[14px] text-accent"
              >
                {error}
              </p>
            )}

            <form action={deleteWeddingAction} className="mt-5 space-y-4">
              <input type="hidden" name="weddingId" value={del} />

              <div>
                <label
                  htmlFor="confirmation"
                  className="block text-[14px] font-medium text-ink mb-2"
                >
                  Type{' '}
                  <span className="font-serif text-[16px]">
                    {deleting.brideName}
                  </span>{' '}
                  to confirm
                </label>
                <input
                  id="confirmation"
                  name="confirmation"
                  required
                  autoComplete="off"
                  // Nothing should be pre-filled here, and no browser should
                  // helpfully remember it.
                  placeholder={deleting.brideName}
                  className="input-field"
                />
              </div>

              <div className="flex flex-col sm:flex-row-reverse gap-3">
                <button type="submit" className="btn-primary btn-block sm:flex-1">
                  Delete this wedding
                </button>
                <Link
                  href="/dashboard"
                  className="btn-block border-standard card-radius px-5 py-3 text-center text-[15px] text-ink-muted hover:text-ink sm:flex-1"
                >
                  Keep it
                </Link>
              </div>
            </form>
          </section>
        )}

        {/* The design puts "Wedding settings" here. That route does not exist
          * yet, and a link to a 404 is worse than none, so the slot holds the
          * action that does work until settings ships. */}
        <div className="mt-4">
          <Link
            href="/onboarding"
            className="inline-block text-[15px] text-accent hover:text-accent-hover transition-colors"
          >
            Plan another wedding
          </Link>
        </div>
      </main>
    </div>
  );
}
