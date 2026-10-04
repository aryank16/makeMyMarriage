import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { parseScope, satisfies, type Module } from '@/lib/auth/permissions';

export default async function WeddingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ weddingId: string }>;
}) {
  const { weddingId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const membership = await prisma.membership.findUnique({
    where: { weddingId_userId: { weddingId, userId: user.id } },
    include: { wedding: true },
  });
  // 404 rather than 403: a non-member must not learn that this wedding exists.
  if (!membership?.acceptedAt) notFound();

  const scope = parseScope(membership.permissions);

  // The nav shows exactly what requirePermission would allow. A tab the user
  // would get a 403 from should never be rendered.
  const tabs = ([
    { href: '', label: 'Overview', module: 'events', level: 'read' },
    { href: '/events', label: 'Events', module: 'events', level: 'read' },
    { href: '/guests', label: 'Guests', module: 'guests', level: 'read' },
    { href: '/vendors', label: 'Vendors', module: 'vendors', level: 'read' },
    { href: '/budget', label: 'Budget', module: 'budget', level: 'read_own_side' },
    { href: '/members', label: 'Organizers', module: 'members', level: 'invite' },
  ] satisfies { href: string; label: string; module: Module; level: string }[]).filter(
    (t) => satisfies(t.module, scope[t.module], t.level),
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="flex items-baseline justify-between">
        <div>
          <Link href="/dashboard" className="text-xs text-neutral-500 hover:underline">
            ← All weddings
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {membership.wedding.brideName} &amp; {membership.wedding.groomName}
          </h1>
        </div>
        <span className="text-xs text-neutral-500">
          {membership.role.toLowerCase()} · {membership.side.toLowerCase()} side
        </span>
      </header>

      <nav className="mt-6 flex gap-4 border-b border-neutral-200 text-sm dark:border-neutral-800">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={`/dashboard/${weddingId}${t.href}`}
            className="-mb-px border-b-2 border-transparent pb-2 hover:border-neutral-400"
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">{children}</div>
    </div>
  );
}
