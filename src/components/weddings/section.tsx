import type { ReactNode } from 'react';

/** The small uppercase rule the dashboard uses above every block. */
export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-[13px] font-medium uppercase tracking-[0.08em] text-ink-muted">
      {children}
    </h2>
  );
}

/** Shown in place of a table when there is nothing yet. */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface border-standard card-radius p-8 text-center">
      <p className="text-[15px] text-ink-muted">{children}</p>
    </div>
  );
}

/** The card every "add something" form sits in. */
export function FormCard({
  title,
  error,
  children,
}: {
  title: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <SectionHeading>{title}</SectionHeading>
      {error && (
        <p
          role="alert"
          className="mb-4 card-radius border border-accent bg-surface px-4 py-3 text-[14px] text-accent"
        >
          {error}
        </p>
      )}
      <div className="bg-surface border-standard card-radius p-5 sm:p-6">
        {children}
      </div>
    </section>
  );
}

/** A labelled control. Mirrors TextField, but usable with plain inputs and selects. */
export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[14px] font-medium text-ink mb-2">
        {label}
      </label>
      {children}
      {hint && <p className="mt-2 text-[13px] text-ink-muted">{hint}</p>}
    </div>
  );
}

/** Wraps a table so it scrolls inside its card rather than the page. */
export function TableCard({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface border-standard card-radius overflow-x-auto">
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  );
}

export function Th({
  children,
  align = 'left',
}: {
  children: ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`py-3 px-3 first:pl-5 last:pr-5 text-[12px] font-medium uppercase tracking-[0.08em] text-ink-muted whitespace-nowrap ${
        align === 'right' ? 'text-right' : ''
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = 'left',
  strong = false,
}: {
  children: ReactNode;
  align?: 'left' | 'right';
  strong?: boolean;
}) {
  return (
    <td
      className={`py-4 px-3 first:pl-5 last:pr-5 text-[14px] ${
        strong ? 'text-[15px] font-medium text-ink' : 'text-ink-muted'
      } ${align === 'right' ? 'text-right' : ''}`}
    >
      {children}
    </td>
  );
}
