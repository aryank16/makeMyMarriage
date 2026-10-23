'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type WeddingTab = { href: string; label: string };

/**
 * The section tabs for one wedding.
 *
 * A client component only because it needs the current path to mark the
 * active tab; the tab list itself is decided on the server, so a section the
 * member cannot open is never rendered here.
 */
export default function WeddingTabs({
  weddingId,
  tabs,
}: {
  weddingId: string;
  tabs: WeddingTab[];
}) {
  const pathname = usePathname();
  const base = `/dashboard/${weddingId}`;

  return (
    <nav className="relative border-b border-line mb-8 overflow-x-auto">
      <div className="flex gap-7 min-w-max">
        {tabs.map((tab) => {
          const href = `${base}${tab.href}`;
          // Overview is the base path, so it has to match exactly — otherwise
          // it would stay lit on every sub-page.
          const active =
            tab.href === '' ? pathname === base : pathname.startsWith(href);

          return (
            <Link
              key={tab.href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`relative pb-3 text-[15px] whitespace-nowrap transition-colors ${
                active ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-accent" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
