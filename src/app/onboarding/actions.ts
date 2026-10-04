'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { createWedding } from '@/lib/weddings/create';

export async function createWeddingAction(formData: FormData) {
  const user = await requireUser();
  const rawDate = String(formData.get('weddingDate') ?? '').trim();

  const wedding = await createWedding(user.id, {
    brideName: String(formData.get('brideName') ?? ''),
    groomName: String(formData.get('groomName') ?? ''),
    weddingDate: rawDate ? new Date(`${rawDate}T00:00:00.000Z`) : null,
    primaryCity: String(formData.get('primaryCity') ?? ''),
    creatorSide: (formData.get('creatorSide') as 'BRIDE' | 'GROOM' | 'SHARED') ?? 'SHARED',
    eventKeys: formData.getAll('eventKeys').map(String),
  });

  redirect(`/dashboard/${wedding.id}`);
}
