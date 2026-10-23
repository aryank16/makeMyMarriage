import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/require-permission';
import { satisfies } from '@/lib/auth/permissions';
import { ROLE_DEFAULTS } from '@/lib/auth/permissions';
import { emailIsConfigured } from '@/lib/email/send';
import InviteMemberDialog from '@/components/weddings/invite-member-dialog';
import InviteOrganizerForm from '@/components/weddings/invite-organizer-form';
import InviteResultBanner from '@/components/weddings/invite-result-banner';

const IST = 'Asia/Kolkata';
const LOCALE = 'en-IN';

/** create.ts writes epoch 0 for a function whose date is not known yet. */
const NO_DATE = 0;
const hasDate = (d: Date) => d.getTime() !== NO_DATE;

function formatWhen(d: Date) {
  if (!hasDate(d)) return 'date not set';
  return d.toLocaleString(LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: IST,
  });
}

/**
 * Whole days from today until `target`, counted in IST.
 *
 * Compared at midnight rather than by subtracting timestamps: a wedding
 * tomorrow morning is "1 day", not "0 days" because fewer than 24 hours
 * remain.
 */
function daysUntil(target: Date) {
  const midnight = (d: Date) => {
    const ist = new Date(d.toLocaleString('en-US', { timeZone: IST }));
    return Date.UTC(ist.getFullYear(), ist.getMonth(), ist.getDate());
  };
  return Math.round((midnight(target) - midnight(new Date())) / 86_400_000);
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-surface border-standard card-radius p-4 sm:p-6">
      <div className="font-serif text-[32px] leading-none text-ink tabular-nums">
        {value}
      </div>
      {/* Three cards across a 375px page leave about 60px of content each,
        * which "ORGANIZERS" does not fit at the desktop size. */}
      <div className="mt-2 text-[10px] sm:text-[12px] font-medium uppercase tracking-normal sm:tracking-[0.08em] text-ink-muted">
        {label}
      </div>
    </div>
  );
}

export default async function WeddingOverview({
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

  const ctx = await requirePermission(user.id, weddingId, 'events', 'read');

  const [wedding, events, guestCount, memberCount] = await Promise.all([
    prisma.wedding.findUniqueOrThrow({
      where: { id: ctx.weddingId },
      select: { weddingDate: true },
    }),
    prisma.event.findMany({
      where: { weddingId: ctx.weddingId },
      orderBy: { startAt: 'asc' },
    }),
    prisma.guest.count({ where: { weddingId: ctx.weddingId } }),
    prisma.membership.count({
      where: { weddingId: ctx.weddingId, acceptedAt: { not: null } },
    }),
  ]);

  // The shortcut only appears for someone who could use it; the server
  // action re-checks anyway, so this is about not dangling a dead button.
  const canInvite = satisfies('members', ctx.scope.members, 'invite');
  const assignableRoles = Object.keys(ROLE_DEFAULTS).filter(
    (r) => r !== 'ADMIN' || ctx.scope.members === 'manage',
  );

  const countdown = wedding.weddingDate ? daysUntil(wedding.weddingDate) : null;

  // The soonest function still ahead of us, ignoring any without a date.
  const nextEvent = events.find((e) => hasDate(e.startAt) && daysUntil(e.startAt) >= 0);
  const nextIn = nextEvent ? daysUntil(nextEvent.startAt) : null;

  return (
    <div>
      <InviteResultBanner invited={invited} status={status} error={error} />

      {canInvite && (
        <div className="mb-6 flex justify-end">
          <InviteMemberDialog>
            <InviteOrganizerForm
              weddingId={weddingId}
              assignableRoles={assignableRoles}
              defaultSide={ctx.side}
              mailerReady={emailIsConfigured()}
              returnTo={`/dashboard/${weddingId}`}
              chrome={false}
            />
          </InviteMemberDialog>
        </div>
      )}

      <section className="w-full bg-bone-deep border-standard card-radius p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="flex items-baseline gap-2.5">
          {countdown === null ? (
            <span className="text-[16px] text-ink">
              The wedding date is not fixed yet
            </span>
          ) : countdown > 0 ? (
            <>
              <span className="font-serif text-[32px] leading-none text-emerald tabular-nums">
                {countdown}
              </span>
              <span className="text-[16px] text-ink">
                {countdown === 1 ? 'day to the wedding' : 'days to the wedding'}
              </span>
            </>
          ) : countdown === 0 ? (
            <span className="text-[16px] text-ink">The wedding is today</span>
          ) : (
            <span className="text-[16px] text-ink">
              The wedding has taken place
            </span>
          )}
        </p>

        {nextEvent && nextIn !== null && (
          <p className="text-[14px] text-ink-muted">
            {nextIn === 0
              ? `${nextEvent.name} is today`
              : `${nextEvent.name} is first, in ${nextIn} ${nextIn === 1 ? 'day' : 'days'}`}
          </p>
        )}
      </section>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-6 mb-10">
        <Stat value={events.length} label="Functions" />
        <Stat value={guestCount} label="Guests" />
        <Stat value={memberCount} label="Organizers" />
      </div>

      <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.08em] text-ink-muted">
        Schedule
      </h2>

      {events.length === 0 ? (
        <div className="bg-surface border-standard card-radius p-8 text-center">
          <p className="text-[15px] text-ink-muted">No functions yet.</p>
        </div>
      ) : (
        <div className="bg-surface border-standard card-radius overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-bone border-b border-line">
                <th className="py-3 pl-5 pr-3 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-muted">
                  Function
                </th>
                <th className="py-3 px-3 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-muted whitespace-nowrap">
                  Date &amp; time
                </th>
                <th className="py-3 px-3 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-muted">
                  Venue
                </th>
                <th className="py-3 pl-3 pr-5 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-muted text-right">
                  Host
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, i) => (
                <tr
                  key={event.id}
                  className={i === events.length - 1 ? '' : 'border-b border-line'}
                >
                  <td className="py-4 pl-5 pr-3 text-[15px] font-medium text-ink">
                    {event.name}
                  </td>
                  <td className="py-4 px-3 text-[14px] text-ink-muted whitespace-nowrap">
                    {formatWhen(event.startAt)}
                  </td>
                  <td className="py-4 px-3 text-[14px] text-ink-muted">
                    {[event.venueName, event.venueCity].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="py-4 pl-3 pr-5 text-[14px] text-ink-muted text-right capitalize">
                    {event.hostSide.toLowerCase()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
