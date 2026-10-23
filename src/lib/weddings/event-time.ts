/**
 * Functions are stored as UTC instants and shown in Asia/Kolkata. The
 * conversion lives here so the add form, the edit form and the table cannot
 * drift apart — a wedding is one place in one timezone, and an off-by-5:30
 * on the muhurat is not a rounding error.
 */

const IST_OFFSET_MINUTES = 330;

/** create.ts writes epoch 0 for a function whose date is not known yet. */
export function hasDate(d: Date) {
  return d.getTime() !== 0;
}

/** IST wall-clock date + time -> UTC instant. */
export function istToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MINUTES * 60 * 1000);
}

/**
 * The inverse, in the shape `<input type="date">` and `<input type="time">`
 * want. Returns empty strings for the not-set sentinel so an edit form shows
 * blank fields rather than 1 January 1970.
 */
export function utcToIstParts(d: Date): { date: string; time: string } {
  if (!hasDate(d)) return { date: '', time: '' };

  const ist = new Date(d.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    // getUTC* on the shifted instant reads the IST wall clock.
    date: `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`,
    time: `${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`,
  };
}

/** How a function's date reads in the tables. */
export function whenLabel(d: Date) {
  if (!hasDate(d)) return 'date not set';
  return d.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
}
