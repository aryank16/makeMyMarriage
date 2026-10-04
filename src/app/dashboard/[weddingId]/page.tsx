import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/require-permission';

const IST = 'en-IN';
const fmt = (d: Date) =>
  d.getTime() === 0
    ? 'date not set'
    : d.toLocaleString(IST, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      });

export default async function WeddingOverview({
  params,
}: {
  params: Promise<{ weddingId: string }>;
}) {
  const { weddingId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const ctx = await requirePermission(user.id, weddingId, 'events', 'read');

  const [events, guestCount, memberCount] = await Promise.all([
    prisma.event.findMany({
      where: { weddingId: ctx.weddingId },
      orderBy: { startAt: 'asc' },
    }),
    prisma.guest.count({ where: { weddingId: ctx.weddingId } }),
    prisma.membership.count({ where: { weddingId: ctx.weddingId, acceptedAt: { not: null } } }),
  ]);

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-3 gap-4">
        <Stat label="Functions" value={events.length} />
        <Stat label="Guests" value={guestCount} />
        <Stat label="Organizers" value={memberCount} />
      </dl>

      <section>
        <h2 className="text-sm font-medium text-neutral-500">Schedule</h2>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No functions yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800">
            {events.map((e) => (
              <li key={e.id} className="flex items-baseline justify-between py-3">
                <div>
                  <p className="font-medium">{e.name}</p>
                  <p className="text-sm text-neutral-500">
                    {e.venueName ? `${e.venueName}, ` : ''}
                    {e.venueCity ?? ''}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p>{fmt(e.startAt)}</p>
                  <p className="text-neutral-500">{e.hostSide.toLowerCase()} side</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
