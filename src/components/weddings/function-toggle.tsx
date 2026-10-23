import type { EventPreset } from '@/lib/weddings/event-presets';

/** "2d before", "wedding day", "1d after" — the same wording the design uses. */
export function timingLabel(offsetDays: number) {
  if (offsetDays === 0) return 'wedding day';
  return offsetDays < 0 ? `${-offsetDays}d before` : `${offsetDays}d after`;
}

/**
 * One function in the onboarding checklist.
 *
 * A real checkbox inside a label, hidden visually rather than replaced, so
 * the form still posts correctly with no JavaScript and the control keeps
 * its native keyboard behaviour. The selected look is drawn with CSS off
 * `:has(:checked)` — nothing here needs client state.
 *
 * Because the input itself is invisible, the focus ring is painted on the
 * card; without it a keyboard user would tab through eight cards with no
 * idea where they are.
 */
export default function FunctionToggle({ preset }: { preset: EventPreset }) {
  return (
    <label
      className="group flex items-center justify-between gap-3 p-3.5 bg-surface border border-line rounded-[10px] cursor-pointer select-none transition-colors
        hover:border-ink-muted/40
        has-[:checked]:bg-bone has-[:checked]:border-accent
        has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
    >
      <span className="flex items-center gap-3 min-w-0">
        <input
          type="checkbox"
          name="eventKeys"
          value={preset.key}
          defaultChecked={preset.common}
          className="sr-only"
        />
        <span
          aria-hidden="true"
          className="w-[18px] h-[18px] shrink-0 rounded-[4px] border border-line flex items-center justify-center transition-colors
            group-has-[:checked]:bg-accent group-has-[:checked]:border-accent"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3 text-surface opacity-0 transition-opacity group-has-[:checked]:opacity-100"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <span className="text-[14px] text-ink truncate">{preset.label}</span>
      </span>

      <span className="text-[12px] text-ink-muted tabular-nums shrink-0">
        {timingLabel(preset.offsetDays)}
      </span>
    </label>
  );
}
