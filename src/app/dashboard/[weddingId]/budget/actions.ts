'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { requirePermission, AuthorizationError } from '@/lib/auth/require-permission';
import { rupeesToPaise } from '@/lib/money';

export async function addExpenseAction(formData: FormData) {
  const user = await requireUser();
  const weddingId = String(formData.get('weddingId'));
  const back = `/dashboard/${weddingId}/budget`;
  const fail = (m: string) => redirect(`${back}?error=${encodeURIComponent(m)}`);

  const title = String(formData.get('title') ?? '').trim();
  if (!title) fail('Say what the money went on.');

  const amount = rupeesToPaise(String(formData.get('amount') ?? ''));
  if (amount === null) fail('Amount must be a number, like 25000 or 2500.50.');
  if (amount !== null && amount <= 0n) fail('Amount must be more than zero.');

  const dateRaw = String(formData.get('date') ?? '').trim();
  const date = dateRaw ? new Date(`${dateRaw}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(date.getTime())) fail('That date is not valid.');

  const vendorId = String(formData.get('vendorId') ?? '').trim() || null;

  try {
    // write_own_side is the weakest level that may add spending. Which side
    // the money belongs to is no longer modelled — the PRD dropped sides.
    const ctx = await requirePermission(user.id, weddingId, 'budget', 'write_own_side');

    // A vendor id arrives from a form the browser controls, so it is checked
    // against this wedding rather than trusted.
    if (vendorId) {
      const owned = await prisma.vendor.count({
        where: { id: vendorId, weddingId: ctx.weddingId },
      });
      if (owned === 0) fail('That vendor is not part of this wedding.');
    }

    await prisma.expense.create({
      data: {
        weddingId: ctx.weddingId,
        title,
        amount: amount as bigint,
        category: String(formData.get('category') ?? '').trim() || 'Other',
        date,
        vendorId,
        notes: String(formData.get('notes') ?? '').trim() || null,
      },
    });
  } catch (e) {
    if (e instanceof AuthorizationError) fail(e.message);
    throw e;
  }

  revalidatePath(back);
  redirect(back);
}
