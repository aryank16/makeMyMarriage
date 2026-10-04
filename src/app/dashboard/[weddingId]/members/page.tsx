import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/require-permission';
import { ROLE_DEFAULTS } from '@/lib/auth/permissions';
import { inviteAction } from './actions';

const ROLE_SUMMARY: Record<string, string> = {
  OWNER: 'Everything, including removing other organizers',
  COUPLE: 'Everything except removing organizers',
  PARENT: 'Guests, events, vendors, own side of the budget',
  PLANNER: 'Guests, events, vendors, both budgets (read only)',
  COORDINATOR: 'Guests and photos. No access to money',
  CONTRIBUTOR: 'Can view guests and add photos',
  VIEWER: 'Can view the schedule only',
};

export default async function MembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ weddingId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { weddingId } = await params;
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const ctx = await requirePermission(user.id, weddingId, 'members', 'invite');

  const members = await prisma.membership.findMany({
    where: { weddingId: ctx.weddingId },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });

  const assignableRoles = Object.keys(ROLE_DEFAULTS).filter(
    (r) => r !== 'OWNER' || ctx.scope.members === 'manage',
  );

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-sm font-medium text-neutral-500">Organizers</h2>
        <ul className="mt-3 divide-y divide-neutral-200 dark:divide-neutral-800">
          {members.map((m) => (
            <li key={m.id} className="flex items-baseline justify-between py-3">
              <div>
                <p className="font-medium">
                  {m.user.name}
                  {!m.acceptedAt && (
                    <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-normal text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                      invited
                    </span>
                  )}
                </p>
                <p className="text-sm text-neutral-500">{m.user.email}</p>
              </div>
              <div className="text-right text-sm">
                <p>{m.role.toLowerCase()}</p>
                <p className="text-neutral-500">{m.side.toLowerCase()} side</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-medium text-neutral-500">Invite someone</h2>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <form action={inviteAction} className="mt-3 space-y-3">
          <input type="hidden" name="weddingId" value={weddingId} />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="name"
              required
              placeholder="Name"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="Email"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              name="role"
              defaultValue="PARENT"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              {assignableRoles.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0) + r.slice(1).toLowerCase()} — {ROLE_SUMMARY[r]}
                </option>
              ))}
            </select>
            <select
              name="side"
              defaultValue={ctx.side}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="BRIDE">Bride&apos;s side</option>
              <option value="GROOM">Groom&apos;s side</option>
              <option value="SHARED">Both</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Send invitation
          </button>
        </form>
        <p className="mt-2 text-xs text-neutral-500">
          Budget access is limited to each person&apos;s own side by default. They see
          nothing of the other family&apos;s spending unless that side shares it.
        </p>
      </section>
    </div>
  );
}
