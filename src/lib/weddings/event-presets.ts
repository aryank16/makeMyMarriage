import type { EventType, Side } from '@prisma/client';

/**
 * Conventional event offsets, in days from the wedding day.
 *
 * These are defaults, not rules. Regional practice varies enormously and the
 * user edits them freely — the point is that a couple selecting "Mehendi"
 * gets a sensible date rather than a blank form. Offsets follow common North
 * Indian practice; see the spec.
 */
export type EventPreset = {
  key: string;
  label: string;
  type: EventType;
  offsetDays: number;
  defaultHour: number;
  hostSide: Side;
  /** Selected by default in onboarding — the near-universal events. */
  common: boolean;
};

export const EVENT_PRESETS: EventPreset[] = [
  { key: 'roka', label: 'Roka / Engagement', type: 'ENGAGEMENT', offsetDays: -60, defaultHour: 19, hostSide: 'SHARED', common: false },
  { key: 'mehendi', label: 'Mehendi', type: 'MEHENDI', offsetDays: -2, defaultHour: 16, hostSide: 'BRIDE', common: true },
  { key: 'haldi', label: 'Haldi', type: 'HALDI', offsetDays: -1, defaultHour: 11, hostSide: 'BRIDE', common: true },
  { key: 'sangeet', label: 'Sangeet', type: 'SANGEET', offsetDays: -1, defaultHour: 19, hostSide: 'SHARED', common: true },
  { key: 'baraat', label: 'Baraat', type: 'BARAAT', offsetDays: 0, defaultHour: 17, hostSide: 'GROOM', common: false },
  { key: 'wedding', label: 'Wedding ceremony', type: 'WEDDING', offsetDays: 0, defaultHour: 20, hostSide: 'SHARED', common: true },
  { key: 'vidaai', label: 'Vidaai', type: 'VIDAAI', offsetDays: 1, defaultHour: 10, hostSide: 'BRIDE', common: false },
  { key: 'reception', label: 'Reception', type: 'RECEPTION', offsetDays: 1, defaultHour: 19, hostSide: 'GROOM', common: true },
];

export function presetByKey(key: string): EventPreset | undefined {
  return EVENT_PRESETS.find((p) => p.key === key);
}

/**
 * Apply an offset to the wedding date in Asia/Kolkata terms, returning UTC.
 * Everything is stored UTC and rendered in IST; see the spec's timezone note.
 */
export function eventDateFrom(
  weddingDate: Date,
  offsetDays: number,
  hour: number,
): Date {
  const d = new Date(weddingDate);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  // IST is UTC+5:30, so an IST wall-clock hour is hour - 5.5 in UTC.
  d.setUTCHours(hour, 0, 0, 0);
  d.setUTCMinutes(d.getUTCMinutes() - 330);
  return d;
}
