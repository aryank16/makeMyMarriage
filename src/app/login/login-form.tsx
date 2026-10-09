'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.87c2.26-2.09 3.59-5.17 3.59-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.93-2.91l-3.87-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.96H1.29v3.12A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27a7.19 7.19 0 0 1 0-4.54V6.61H1.29a11.99 11.99 0 0 0 0 10.78l3.99-3.12Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.7 0 3.99 2.47 1.29 6.61l3.99 3.12C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

/* `googleEnabled` is resolved on the server, per request, and passed in — see
 * the note in page.tsx. signInWithOAuth navigates away immediately, so a
 * disabled provider is not something the error branch can rescue: Supabase
 * answers the redirect with a raw JSON page and the visitor is stranded
 * off-site. The button stays (it is part of the approved design) but is
 * stopped before it leaves. */
export default function LoginForm({
  next,
  googleEnabled,
}: {
  next: string;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<null | 'password' | 'google'>(null);
  const [error, setError] = useState('');

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setPending('password');
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Supabase returns the same "Invalid login credentials" for an unknown
      // email and a wrong password, which is what we want — do not help
      // anyone enumerate who has an account here.
      setError(error.message);
      setPending(null);
      return;
    }

    // refresh() re-runs the server components now that the session cookie is
    // set, so middleware and the destination page both see the signed-in user
    // instead of bouncing back here.
    router.push(next);
    router.refresh();

    // safeNext() already keeps `next` off the auth routes, so this component
    // should be on its way out. Clearing pending anyway means that if we do
    // end up back here the form is usable rather than frozen mid-submit.
    setPending(null);
  }

  async function signInWithGoogle() {
    if (!googleEnabled) {
      setError('Google sign-in is not available yet. Use your email and password.');
      return;
    }

    setPending('google');
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    // On success the browser has already been handed off to Google, so only
    // the failure path can still be running here.
    if (error) {
      setError(error.message);
      setPending(null);
    }
  }

  return (
    <div className="w-full max-w-[400px] mx-auto my-auto py-10">
      <div className="mb-8">
        <h1 className="font-serif text-[40px] leading-[1.1] tracking-[-0.02em] text-ink mb-2.5">
          Welcome back
        </h1>
        <p className="text-[17px] leading-[1.6] text-ink-muted">
          Sign in to your wedding.
        </p>
      </div>

      <form onSubmit={signInWithPassword} className="flex flex-col gap-5">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={pending !== null}
          className="btn-secondary"
        >
          <GoogleMark />
          {pending === 'google' ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="flex items-center gap-4">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[13px] text-ink-muted">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-[14px] font-medium text-ink mb-2"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending !== null}
            placeholder="you@example.com"
            className="input-field"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="text-[14px] font-medium text-ink"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[14px] text-accent hover:text-accent-hover font-normal transition-colors"
            >
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending !== null}
            placeholder="••••••••••••"
            className="input-field"
          />
        </div>

        {error && (
          <p role="alert" className="text-[14px] leading-[1.5] text-accent">
            {error}
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={pending !== null}
            className="btn-primary btn-block"
          >
            {pending === 'password' ? 'Signing in…' : 'Sign in'}
          </button>
        </div>

        <div className="text-center text-[15px] text-ink-muted pt-1">
          Don&apos;t have an account?
          <Link
            href="/signup"
            className="text-accent hover:text-accent-hover font-medium transition-colors ml-1"
          >
            Create one
          </Link>
        </div>
      </form>
    </div>
  );
}
