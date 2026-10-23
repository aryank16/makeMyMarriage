import type { Event } from '@prisma/client';
import Link from 'next/link';
import { Field } from '@/components/weddings/section';
import { utcToIstParts } from '@/lib/weddings/event-time';

export const EVENT_TYPES = [
  'MEHENDI', 'HALDI', 'SANGEET', 'BARAAT', 'WEDDING',
  'VIDAAI', 'RECEPTION', 'ROKA', 'ENGAGEMENT', 'CUSTOM',
] as const;

export const typeLabel = (v: string) =>
  v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ');

/**
 * One form for adding and for editing.
 *
 * Two copies would be two places to forget a field, and the edit form is the
 * one that would be forgotten — so the add form is the edit form with nothing
 * filled in.
 */
export default function EventForm({
  weddingId,
  action,
  event,
  cancelHref,
}: {
  weddingId: string;
  action: (formData: FormData) => void | Promise<void>;
  /** Absent when adding. */
  event?: Event;
  /** Absent when adding — there is nothing to cancel back to. */
  cancelHref?: string;
}) {
  const { date, time } = event
    ? utcToIstParts(event.startAt)
    : { date: '', time: '' };

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="weddingId" value={weddingId} />
      {event && <input type="hidden" name="eventId" value={event.id} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name" htmlFor="name">
          <input
            id="name"
            name="name"
            required
            placeholder="Sangeet"
            defaultValue={event?.name ?? ''}
            className="input-field"
          />
        </Field>
        <Field label="Type" htmlFor="type">
          <select
            id="type"
            name="type"
            defaultValue={event?.type ?? 'CUSTOM'}
            className="input-field"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{typeLabel(t)}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date" htmlFor="date" hint="Leave blank if it is not fixed yet.">
          <input id="date" name="date" type="date" defaultValue={date} className="input-field" />
        </Field>
        <Field label="Start time" htmlFor="time">
          <input id="time" name="time" type="time" defaultValue={time} className="input-field" />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Venue" htmlFor="venueName">
          <input
            id="venueName"
            name="venueName"
            placeholder="The Oberoi Udaivilas"
            defaultValue={event?.venueName ?? ''}
            className="input-field"
          />
        </Field>
        <Field label="City" htmlFor="venueCity">
          <input
            id="venueCity"
            name="venueCity"
            placeholder="Udaipur"
            defaultValue={event?.venueCity ?? ''}
            className="input-field"
          />
        </Field>
      </div>

      <Field label="Hosted by" htmlFor="hostSide">
        <select
          id="hostSide"
          name="hostSide"
          defaultValue={event?.hostSide ?? 'SHARED'}
          className="input-field"
        >
          <option value="BRIDE">Bride&apos;s side</option>
          <option value="GROOM">Groom&apos;s side</option>
          <option value="SHARED">Both</option>
        </select>
      </Field>

      <div className="flex flex-col sm:flex-row-reverse gap-3">
        <button type="submit" className="btn-primary btn-block">
          {event ? 'Save changes' : 'Add function'}
        </button>
        {cancelHref && (
          <Link
            href={cancelHref}
            className="btn-block border-standard card-radius px-5 py-3 text-center text-[15px] text-ink-muted hover:text-ink"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
