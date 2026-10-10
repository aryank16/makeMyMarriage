import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { EVENT_PRESETS } from '@/lib/weddings/event-presets';
import AuthWatcher from '@/components/auth/auth-watcher';
import { createWeddingAction } from './actions';

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <AuthWatcher />
      <h1 className="text-2xl font-semibold tracking-tight">Set up your wedding</h1>
      <p className="mt-1 text-sm text-neutral-500">
        You can change all of this later.
      </p>

      <form action={createWeddingAction} className="mt-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Field name="brideName" label="Bride's name" required />
          <Field name="groomName" label="Groom's name" required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field name="weddingDate" label="Wedding date" type="date" />
          <Field name="primaryCity" label="City" required placeholder="Jaipur" />
        </div>
        <p className="-mt-4 text-xs text-neutral-500">
          Leave the date blank if it is not fixed yet.
        </p>

        <fieldset>
          <legend className="text-sm font-medium">Which side are you on?</legend>
          <div className="mt-2 flex gap-4 text-sm">
            {[
              ['BRIDE', "Bride's side"],
              ['GROOM', "Groom's side"],
              ['SHARED', 'Both'],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="creatorSide"
                  value={value}
                  defaultChecked={value === 'BRIDE'}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">Your functions</legend>
          <p className="mt-1 text-xs text-neutral-500">
            Dates are filled in automatically from the wedding day. Adjust them afterwards.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {EVENT_PRESETS.map((p) => (
              <label
                key={p.key}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
              >
                <input
                  type="checkbox"
                  name="eventKeys"
                  value={p.key}
                  defaultChecked={p.common}
                />
                <span>{p.label}</span>
                <span className="ml-auto text-xs text-neutral-400">
                  {p.offsetDays === 0
                    ? 'wedding day'
                    : p.offsetDays < 0
                      ? `${-p.offsetDays}d before`
                      : `${p.offsetDays}d after`}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Create wedding
        </button>
      </form>
    </main>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
      />
    </div>
  );
}
