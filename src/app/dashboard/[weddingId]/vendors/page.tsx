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
import { addVendorAction } from './actions';

const CATEGORIES = [
  'VENUE', 'CATERING', 'PHOTOGRAPHY', 'VIDEOGRAPHY', 'DECOR', 'MAKEUP',
  'MEHENDI_ARTIST', 'PANDIT', 'MUSIC', 'TRANSPORT', 'INVITATIONS',
  'TROUSSEAU', 'JEWELLERY', 'CHOREOGRAPHER', 'ACCOMMODATION', 'OTHER',
] as const;

const STATUSES = ['SHORTLISTED', 'NEGOTIATING', 'BOOKED', 'COMPLETED', 'CANCELLED'] as const;

const label = (v: string) =>
  v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ');

export default async function VendorsPage({
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

  const ctx = await requirePermission(user.id, weddingId, 'vendors', 'read');
  const canWrite = satisfies('vendors', ctx.scope.vendors, 'write');

  const vendors = await prisma.vendor.findMany({
    where: { weddingId: ctx.weddingId },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  return (
    <div className="space-y-10">
      <section>
        <SectionHeading>Vendors</SectionHeading>
        {vendors.length === 0 ? (
          <EmptyState>No vendors yet.</EmptyState>
        ) : (
          <TableCard>
            <thead>
              <tr className="bg-bone border-b border-line">
                <Th>Vendor</Th>
                <Th>Category</Th>
                <Th>Contact</Th>
                <Th>Status</Th>
                <Th align="right">Agreed</Th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v, i) => (
                <tr key={v.id} className={i === vendors.length - 1 ? '' : 'border-b border-line'}>
                  <Td strong>{v.name}</Td>
                  <Td>{label(v.category)}</Td>
                  <Td>
                    {[v.contactPerson, v.phone].filter(Boolean).join(' · ') || '—'}
                  </Td>
                  <Td>{label(v.status)}</Td>
                  <Td align="right">
                    {v.agreedTotal === null ? '—' : formatPaise(v.agreedTotal)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </section>

      {canWrite && (
        <FormCard title="Add a vendor" error={error}>
          <form action={addVendorAction} className="space-y-5">
            <input type="hidden" name="weddingId" value={weddingId} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" htmlFor="name">
                <input id="name" name="name" required placeholder="Studio Kiran" className="input-field" />
              </Field>
              <Field label="Category" htmlFor="category">
                <select id="category" name="category" defaultValue="OTHER" className="input-field">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{label(c)}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Contact person" htmlFor="contactPerson" hint="Optional.">
                <input id="contactPerson" name="contactPerson" placeholder="Kiran" className="input-field" />
              </Field>
              <Field label="Phone" htmlFor="phone" hint="Optional.">
                <input id="phone" name="phone" placeholder="+91 98300 00000" className="input-field" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Status" htmlFor="status">
                <select id="status" name="status" defaultValue="SHORTLISTED" className="input-field">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{label(s)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Agreed amount" htmlFor="agreedTotal" hint="In rupees. Leave blank until it is settled.">
                <input id="agreedTotal" name="agreedTotal" inputMode="decimal" placeholder="250000" className="input-field" />
              </Field>
            </div>

            <Field label="Notes" htmlFor="notes" hint="Optional.">
              <input id="notes" name="notes" placeholder="Recommended by the Mehtas" className="input-field" />
            </Field>

            <button type="submit" className="btn-primary btn-block">Add vendor</button>
          </form>
        </FormCard>
      )}
    </div>
  );
}
