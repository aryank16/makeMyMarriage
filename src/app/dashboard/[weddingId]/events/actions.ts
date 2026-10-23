'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/session';
import { AuthorizationError } from '@/lib/auth/require-permission';
import { istToUtc } from '@/lib/weddings/event-time';
import { EventError, createEvent, deleteEvent, updateEvent } from '@/lib/weddings/events';
import type { EventFields } from '@/lib/weddings/events';
import type { EventType, Side } from '@prisma/client';

/** The fields the add and edit forms share, read once. */
function readForm(formData: FormData): EventFields {
  const date = String(formData.get('date') ?? '').trim();
  const time = String(formData.get('time') ?? '').trim();

  return {
    name: String(formData.get('name') ?? '').trim(),
    type: (formData.get('type') as EventType) || 'CUSTOM',
    // Epoch 0 is the "date not set yet" sentinel the overview already reads.
    startAt: date ? istToUtc(date, time) : new Date(0),
    venueName: String(formData.get('venueName') ?? '').trim() || null,
    venueCity: String(formData.get('venueCity') ?? '').trim() || null,
    hostSide: (formData.get('hostSide') as Side) || 'SHARED',
  };
}

export async function addEventAction(formData: FormData) {
  const user = await requireUser();
  const weddingId = String(formData.get('weddingId'));
  const back = `/dashboard/${weddingId}/events`;

  try {
    await createEvent(user.id, weddingId, readForm(formData));
  } catch (e) {
    if (e instanceof EventError || e instanceof AuthorizationError) {
      redirect(`${back}?error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }

  revalidatePath(back);
  redirect(back);
}

export async function updateEventAction(formData: FormData) {
  const user = await requireUser();
  const weddingId = String(formData.get('weddingId'));
  const eventId = String(formData.get('eventId') ?? '');
  const back = `/dashboard/${weddingId}/events`;

  try {
    await updateEvent(user.id, weddingId, eventId, readForm(formData));
  } catch (e) {
    if (e instanceof EventError || e instanceof AuthorizationError) {
      // Back to the edit form, not the add form, so the typed changes are
      // still on screen next to the complaint.
      redirect(
        `${back}?edit=${encodeURIComponent(eventId)}&error=${encodeURIComponent(e.message)}`,
      );
    }
    throw e;
  }

  revalidatePath(back);
  revalidatePath(`/dashboard/${weddingId}`);
  redirect(back);
}

export async function deleteEventAction(formData: FormData) {
  const user = await requireUser();
  const weddingId = String(formData.get('weddingId'));
  const eventId = String(formData.get('eventId') ?? '');
  const back = `/dashboard/${weddingId}/events`;

  try {
    await deleteEvent(user.id, weddingId, eventId);
  } catch (e) {
    if (e instanceof EventError || e instanceof AuthorizationError) {
      redirect(`${back}?error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }

  revalidatePath(back);
  // The overview counts functions and names the next one.
  revalidatePath(`/dashboard/${weddingId}`);
  redirect(back);
}
