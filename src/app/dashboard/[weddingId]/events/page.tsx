import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/require-permission';
import { satisfies } from '@/lib/auth/permissions';
import { whenLabel } from '@/lib/weddings/event-time';
import {
  SectionHeading,
  EmptyState,
  FormCard,
  TableCard,
  Th,
  Td,
} from '@/components/weddings/section';
import EventForm, { typeLabel } from '@/components/weddings/event-form';
import { addEventAction, updateEventAction, deleteEventAction } from './actions';

export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ weddingId: string }>;
  searchParams: Promise<{ error?: string; edit?: string; delete?: string }>;
}) {
  const { weddingId } = await params;
  const { error, edit, delete: del } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const ctx = await requirePermission(user.id, weddingId, 'events', 'read');
  const canWrite = satisfies('events', ctx.scope.events, 'write');

  const events = await prisma.event.findMany({
    where: { weddingId: ctx.weddingId },
    orderBy: [{ startAt: 'asc' }, { sortOrder: 'asc' }],
  });

  const base = `/dashboard/${weddingId}/events`;

  /* Which function the form is pointed at, if any. Read from the list that
   * was already fetched and scoped to this wedding, so an id for someone
   * else's function simply finds nothing. */
  const editing = canWrite && edit ? events.find((e) => e.id === edit) : undefined;
  const deleting = canWrite && del ? events.find((e) => e.id === del) : undefined;

  /* Only counted when something is actually being deleted — the warning has
   * to be specific to be worth reading, and this is two queries nobody needs
   * on every page view. */
  const doomed = deleting
    ? await prisma.$transaction([
        prisma.rsvp.count({ where: { eventId: deleting.id } }),
        prisma.vendorEvent.count({ where: { eventId: deleting.id } }),
      ])
    : null;

  return (
    <div className="space-y-10">
      <section>
        <SectionHeading>Functions</SectionHeading>
        {events.length === 0 ? (
          <EmptyState>No functions yet.</EmptyState>
        ) : (
          <TableCard>
            <thead>
              <tr className="bg-bone border-b border-line">
                <Th>Function</Th>
                <Th>Date &amp; time</Th>
                <Th>Venue</Th>
                <Th align="right">Host</Th>
                {canWrite && <Th align="right">Edit</Th>}
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr
                  key={e.id}
                  className={i === events.length - 1 ? '' : 'border-b border-line'}
                >
                  <Td strong>{e.name}</Td>
                  <Td>{whenLabel(e.startAt)}</Td>
                  <Td>
                    {[e.venueName, e.venueCity].filter(Boolean).join(', ') || '—'}
                  </Td>
                  <Td align="right">{typeLabel(e.hostSide)}</Td>
                  {canWrite && (
                    <Td align="right">
                      <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                        <Link
                          href={`${base}?edit=${e.id}#event-form`}
                          className="text-[13px] text-ink-muted underline decoration-line underline-offset-2 hover:text-ink"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`${base}?delete=${e.id}#event-form`}
                          className="text-[13px] text-accent underline decoration-line underline-offset-2 hover:decoration-accent"
                        >
                          Delete
                        </Link>
                      </span>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </section>

      {canWrite && (
        <section id="event-form" className="scroll-mt-6">
          {deleting && doomed ? (
            /* A confirmation step rather than a browser confirm(): it can say
             * what else goes with it, which a dialog box cannot, and it works
             * without client JavaScript like the rest of these screens. */
            <FormCard title={`Delete ${deleting.name}?`} error={error}>
              <p className="text-[15px] leading-[1.6] text-ink">
                This removes the function from the schedule, including the copy
                your guests see on their invitation link.
              </p>

              {(doomed[0] > 0 || doomed[1] > 0) && (
                <ul className="mt-3 space-y-1 text-[14px] leading-[1.6] text-ink-muted">
                  {doomed[0] > 0 && (
                    <li>
                      {doomed[0] === 1
                        ? '1 guest response for this function is deleted with it.'
                        : `${doomed[0]} guest responses for this function are deleted with it.`}
                    </li>
                  )}
                  {doomed[1] > 0 && (
                    <li>
                      {doomed[1] === 1
                        ? '1 vendor is no longer booked for it, but stays on your vendor list.'
                        : `${doomed[1]} vendors are no longer booked for it, but stay on your vendor list.`}
                    </li>
                  )}
                </ul>
              )}

              <p className="mt-3 text-[14px] text-ink-muted">This cannot be undone.</p>

              <div className="mt-5 flex flex-col sm:flex-row-reverse gap-3">
                <form action={deleteEventAction} className="sm:flex-1">
                  <input type="hidden" name="weddingId" value={weddingId} />
                  <input type="hidden" name="eventId" value={deleting.id} />
                  <button type="submit" className="btn-primary btn-block">
                    Delete {deleting.name}
                  </button>
                </form>
                <Link
                  href={base}
                  className="btn-block border-standard card-radius px-5 py-3 text-center text-[15px] text-ink-muted hover:text-ink sm:flex-1"
                >
                  Keep it
                </Link>
              </div>
            </FormCard>
          ) : editing ? (
            <FormCard title={`Edit ${editing.name}`} error={error}>
              {/* Keyed so switching between add and edit — or between two
                  functions — remounts the form. React applies a <select>'s
                  defaultValue at mount only, so without this the Type and
                  Hosted by dropdowns keep whatever the previous render
                  selected while the text fields update, and saving silently
                  rewrites them. */}
              <EventForm
                key={editing.id}
                weddingId={weddingId}
                action={updateEventAction}
                event={editing}
                cancelHref={base}
              />
            </FormCard>
          ) : (
            <FormCard title="Add a function" error={error}>
              <EventForm key="new" weddingId={weddingId} action={addEventAction} />
            </FormCard>
          )}
        </section>
      )}
    </div>
  );
}
