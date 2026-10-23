import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { EVENT_PRESETS } from '@/lib/weddings/event-presets';
import AuthWatcher from '@/components/auth/auth-watcher';
import TextField from '@/components/auth/text-field';
import FunctionToggle from '@/components/weddings/function-toggle';
import { createWeddingAction } from './actions';

export const metadata: Metadata = {
  title: 'Set up your wedding · MakeMyMarriage',
};

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen flex flex-col bg-bone">
      <AuthWatcher />

      <header className="w-full border-b border-line py-4 px-6 sm:px-8">
        <div className="max-w-[1200px] mx-auto flex items-center">
          <Link href="/" className="inline-flex items-center gap-2.5 no-underline">
            <Image
              src="/logo.svg"
              alt="MakeMyMarriage"
              width={320}
              height={80}
              priority
              className="h-7 w-auto"
            />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-[640px] bg-surface border-standard card-radius p-6 sm:p-10">
          <div className="mb-8">
            <h1 className="font-serif text-[40px] leading-[1.1] tracking-tight text-ink">
              Set up your wedding
            </h1>
            <p className="mt-2 text-[15px] text-ink-muted">
              You can change all of this later.
            </p>
          </div>

          <form action={createWeddingAction} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="brideName"
                label="Bride&rsquo;s name"
                placeholder="Ananya"
                autoComplete="off"
              />
              <TextField
                id="groomName"
                label="Groom&rsquo;s name"
                placeholder="Rohit"
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                id="weddingDate"
                label="Wedding date"
                type="date"
                required={false}
                hint="Leave this blank if it is not fixed yet."
              />
              <TextField
                id="primaryCity"
                label="City"
                placeholder="Udaipur"
                autoComplete="off"
              />
            </div>

            <fieldset className="pt-2">
              <legend className="text-[14px] font-medium text-ink">
                Your functions
              </legend>
              <p className="mt-0.5 mb-3 text-[13px] text-ink-muted">
                Dates are filled in automatically from the wedding day. You can
                adjust them afterwards.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {EVENT_PRESETS.map((preset) => (
                  <FunctionToggle key={preset.key} preset={preset} />
                ))}
              </div>
            </fieldset>

            <button type="submit" className="btn-primary btn-block">
              Create wedding
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
