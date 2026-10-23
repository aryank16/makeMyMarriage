import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/require-permission';
import { satisfies } from '@/lib/auth/permissions';
import { formatPaise } from '@/lib/money';
import {
  SectionHeading,
  EmptyState,
  FormCard,
  Field,
  TableCard,
  Th,
  Td,
} from '@/components/weddings/section';
import { addExpenseAction } from './actions';

/* Suggestions, not a closed set — the column is free text so nobody is stuck
 * when their spending does not fit a list someone else wrote. */
const CATEGORIES = [
  'Venue', 'Catering', 'Decor', 'Photography', 'Makeup',
  'Music and DJ', 'Invitations', 'Jewellery', 'Clothing',
  'Transport', 'Accommodation', 'Other',
];

export default async function BudgetPage({
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

  const ctx = await requirePermission(user.id, weddingId, 'budget', 'read_own_side');
  const canWrite = satisfies('budget', ctx.scope.budget, 'write_own_side');

  const [expenses, vendors] = await Promise.all([
    prisma.expense.findMany({
      where: { weddingId: ctx.weddingId },
      include: { vendor: { select: { name: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.vendor.findMany({
      where: { weddingId: ctx.weddingId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0n);

  // Spending per category, biggest first — the question people actually ask.
  const byCategory = [...
    expenses.reduce((map, e) => {
      map.set(e.category, (map.get(e.category) ?? 0n) + e.amount);
      return map;
    }, new Map<string, bigint>())
  ].sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0));

  return (
    <div className="space-y-10">
      <section>
        <SectionHeading>Spent so far</SectionHeading>
        <div className="bg-surface border-standard card-radius p-5 sm:p-6">
          <p className="font-serif text-[32px] leading-none text-ink tabular-nums">
            {formatPaise(total)}
          </p>
          <p className="mt-2 text-[13px] uppercase tracking-[0.08em] text-ink-muted">
            across {expenses.length} {expenses.length === 1 ? 'entry' : 'entries'}
          </p>

          {byCategory.length > 0 && (
            <ul className="mt-5 pt-5 border-t border-line space-y-2">
              {byCategory.map(([category, amount]) => (
                <li key={category} className="flex items-baseline justify-between gap-4 text-[14px]">
                  <span className="text-ink-muted">{category}</span>
                  <span className="text-ink tabular-nums">{formatPaise(amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <SectionHeading>Expenses</SectionHeading>
        {expenses.length === 0 ? (
          <EmptyState>Nothing logged yet.</EmptyState>
        ) : (
          <TableCard>
            <thead>
              <tr className="bg-bone border-b border-line">
                <Th>What</Th>
                <Th>Category</Th>
                <Th>Vendor</Th>
                <Th>Date</Th>
                <Th align="right">Amount</Th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e, i) => (
                <tr key={e.id} className={i === expenses.length - 1 ? '' : 'border-b border-line'}>
                  <Td strong>{e.title}</Td>
                  <Td>{e.category}</Td>
                  <Td>{e.vendor?.name ?? '—'}</Td>
                  <Td>
                    {e.date.toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
                    })}
                  </Td>
                  <Td align="right">{formatPaise(e.amount)}</Td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </section>

      {canWrite && (
        <FormCard title="Log an expense" error={error}>
          <form action={addExpenseAction} className="space-y-5">
            <input type="hidden" name="weddingId" value={weddingId} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="What was it for" htmlFor="title">
                <input id="title" name="title" required placeholder="Advance to the caterer" className="input-field" />
              </Field>
              <Field label="Amount" htmlFor="amount" hint="In rupees.">
                <input id="amount" name="amount" required inputMode="decimal" placeholder="25000" className="input-field" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Category" htmlFor="category">
                <select id="category" name="category" defaultValue="Other" className="input-field">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date" htmlFor="date" hint="Defaults to today.">
                <input id="date" name="date" type="date" className="input-field" />
              </Field>
            </div>

            <Field label="Vendor" htmlFor="vendorId" hint="Optional — link it to someone on the vendor list.">
              <select id="vendorId" name="vendorId" defaultValue="" className="input-field">
                <option value="">No vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </Field>

            <button type="submit" className="btn-primary btn-block">Log expense</button>
          </form>
        </FormCard>
      )}
    </div>
  );
}
