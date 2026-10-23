import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { parseScope, satisfies, type Module } from '@/lib/auth/permissions';
import SignOutButton from '@/components/auth/sign-out-button';
import WeddingTabs, { type WeddingTab } from '@/components/weddings/wedding-tabs';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

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
  const { wedding } = membership;

  // The nav shows exactly what requirePermission would allow. A tab the user
  // would get a 403 from should never be rendered.
  const tabs: WeddingTab[] = (
    [
      { href: '', label: 'Overview', module: 'events', level: 'read' },
      { href: '/events', label: 'Events', module: 'events', level: 'read' },
      { href: '/guests', label: 'Guests', module: 'guests', level: 'read' },
      { href: '/vendors', label: 'Vendors', module: 'vendors', level: 'read' },
      { href: '/budget', label: 'Budget', module: 'budget', level: 'read_own_side' },
      { href: '/members', label: 'Organizers', module: 'members', level: 'invite' },
    ] satisfies { href: string; label: string; module: Module; level: string }[]
  )
    .filter((t) => satisfies(t.module, scope[t.module], t.level))
    .map(({ href, label }) => ({ href, label }));

  return (
    <div className="min-h-screen flex flex-col bg-bone">
      <header className="h-[72px] w-full border-b border-line px-6 sm:px-8 flex items-center justify-between shrink-0">
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

      <main className="w-full max-w-[1000px] mx-auto px-6 pt-10 pb-24">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            All weddings
          </Link>
        </div>

        <div className="flex items-start sm:items-center justify-between gap-4 pb-6">
          <div>
            <h1 className="font-serif text-[30px] leading-none text-ink mb-2">
              {wedding.brideName} &amp; {wedding.groomName}
            </h1>
            <p className="text-[15px] leading-none text-ink-muted">
              {wedding.primaryCity}
              {' · '}
              {wedding.weddingDate
                ? wedding.weddingDate.toLocaleDateString('en-IN', DATE_FORMAT)
                : 'date not fixed'}
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-line bg-bone px-3.5 py-1 text-[12px] font-medium text-accent">
            {membership.role.toLowerCase()}
          </span>
        </div>

        <WeddingTabs weddingId={weddingId} tabs={tabs} />

        {children}
      </main>
    </div>
  );
}
