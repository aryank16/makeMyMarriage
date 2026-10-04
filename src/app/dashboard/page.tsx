import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, getUserWeddings } from '@/lib/auth/session';
import { pendingInvitesFor } from '@/lib/members/invite';
import { AcceptInviteButton } from './accept-invite';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [weddings, invites] = await Promise.all([
    getUserWeddings(user.id),
    pendingInvitesFor(user.id),
  ]);

  if (weddings.length === 0 && invites.length === 0) redirect('/onboarding');

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Your weddings</h1>
      <p className="mt-1 text-sm text-neutral-500">Signed in as {user.email}</p>

      {invites.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-neutral-500">Invitations</h2>
          <ul className="mt-3 space-y-2">
            {invites.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <div>
                  <p className="font-medium">
                    {i.wedding.brideName} &amp; {i.wedding.groomName}
                  </p>
                  <p className="text-sm text-neutral-500">
                    You have been invited as {i.role.toLowerCase()} ({i.side.toLowerCase()} side)
                  </p>
                </div>
                <AcceptInviteButton membershipId={i.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="mt-8 space-y-2">
        {weddings.map((w) => (
          <li key={w.id}>
            <Link
              href={`/dashboard/${w.id}`}
              className="block rounded-lg border border-neutral-200 p-4 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
            >
              <p className="font-medium">
                {w.brideName} &amp; {w.groomName}
              </p>
              <p className="text-sm text-neutral-500">
                {w.primaryCity}
                {w.weddingDate
                  ? ` · ${w.weddingDate.toLocaleDateString('en-IN', { dateStyle: 'medium' })}`
                  : ' · date not fixed'}
                {' · '}
                {w.role.toLowerCase()}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/onboarding"
        className="mt-6 inline-block text-sm font-medium underline underline-offset-4"
      >
        Plan another wedding
      </Link>
    </main>
  );
}
