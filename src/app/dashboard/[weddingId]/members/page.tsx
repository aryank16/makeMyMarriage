import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/require-permission';
import { ROLE_DEFAULTS } from '@/lib/auth/permissions';
import { emailIsConfigured } from '@/lib/email/send';
import InviteOrganizerForm from '@/components/weddings/invite-organizer-form';
import InviteResultBanner from '@/components/weddings/invite-result-banner';

export default async function MembersPage({
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

  const ctx = await requirePermission(user.id, weddingId, 'members', 'invite');

  const members = await prisma.membership.findMany({
    where: { weddingId: ctx.weddingId },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });

  const assignableRoles = Object.keys(ROLE_DEFAULTS).filter(
    (r) => r !== 'ADMIN' || ctx.scope.members === 'manage',
  );

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.08em] text-ink-muted">
          Organizers
        </h2>

        <ul className="bg-surface border-standard card-radius divide-y divide-line">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-ink">
                  {member.user.name}
                  {!member.acceptedAt && (
                    <span className="ml-2 rounded-full border border-line bg-bone px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em] text-accent align-middle">
                      Invited
                    </span>
                  )}
                </p>
                <p className="text-[14px] text-ink-muted truncate">
                  {member.user.email}
                </p>
              </div>
              <div className="text-right text-[14px] shrink-0">
                <p className="text-ink capitalize">{member.role.toLowerCase()}</p>
                <p className="text-ink-muted capitalize">
                  {member.side.toLowerCase()} side
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.08em] text-ink-muted">
          Invite an organizer
        </h2>

        <InviteResultBanner invited={invited} status={status} error={error} />

        <InviteOrganizerForm
          weddingId={weddingId}
          assignableRoles={assignableRoles}
          defaultSide={ctx.side}
          mailerReady={emailIsConfigured()}
          returnTo={`/dashboard/${weddingId}/members`}
        />
      </section>
    </div>
  );
}
