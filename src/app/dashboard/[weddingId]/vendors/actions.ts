'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { requirePermission, AuthorizationError } from '@/lib/auth/require-permission';
import { rupeesToPaise } from '@/lib/money';
import { VendorCategory, VendorStatus } from '@prisma/client';

/* The category and status arrive as plain strings from a <select>, so neither
 * is trustworthy however the form is drawn. `|| 'OTHER'` only covers an empty
 * value; an unknown non-empty one would reach Prisma and come back as a
 * PrismaClientValidationError, which this file cannot tell apart from a real
 * fault and so rethrows as a 500. Checking the value against the enum turns
 * that into an ordinary message. */
const isCategory = (v: string): v is VendorCategory =>
  Object.hasOwn(VendorCategory, v);
const isStatus = (v: string): v is VendorStatus => Object.hasOwn(VendorStatus, v);

export async function addVendorAction(formData: FormData) {
  const user = await requireUser();
  const weddingId = String(formData.get('weddingId'));
  const back = `/dashboard/${weddingId}/vendors`;

  const name = String(formData.get('name') ?? '').trim();
  if (!name) redirect(`${back}?error=${encodeURIComponent('Give the vendor a name.')}`);

  // Blank is fine — a shortlisted vendor has no agreed price yet. A value
  // that is present but unreadable is not, and must not become null silently.
  const category = String(formData.get('category') ?? '').trim() || 'OTHER';
  if (!isCategory(category)) {
    redirect(`${back}?error=${encodeURIComponent('Pick a category from the list.')}`);
  }

  const status = String(formData.get('status') ?? '').trim() || 'SHORTLISTED';
  if (!isStatus(status)) {
    redirect(`${back}?error=${encodeURIComponent('Pick a status from the list.')}`);
  }

  const agreedRaw = String(formData.get('agreedTotal') ?? '').trim();
  let agreedTotal: bigint | null = null;
  if (agreedRaw) {
    agreedTotal = rupeesToPaise(agreedRaw);
    if (agreedTotal === null) {
      redirect(`${back}?error=${encodeURIComponent('Agreed amount must be a number, like 250000 or 2500.50.')}`);
    }
  }

  try {
    const ctx = await requirePermission(user.id, weddingId, 'vendors', 'write');

    await prisma.vendor.create({
      data: {
        weddingId: ctx.weddingId,
        name,
        category,
        status,
        contactPerson: String(formData.get('contactPerson') ?? '').trim() || null,
        phone: String(formData.get('phone') ?? '').trim() || null,
        agreedTotal,
        notes: String(formData.get('notes') ?? '').trim() || null,
      },
    });
  } catch (e) {
    if (e instanceof AuthorizationError) {
      redirect(`${back}?error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }

  revalidatePath(back);
  redirect(back);
}
