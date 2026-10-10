'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { signInSchema, fieldErrors } from '@/lib/auth/credentials';
import { describeAuthError, describeThrown } from '@/lib/auth/supabase-errors';
import GoogleMark from '@/components/auth/google-mark';
import TextField from '@/components/auth/text-field';
import PasswordField from '@/components/auth/password-field';

type Errors = { email?: string; password?: string; form?: string };

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
  const [errors, setErrors] = useState<Errors>({});

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Validate before spending a round trip, and before the rate limiter
    // counts an attempt that was never going to work.
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setPending('password');

    try {
      const supabase = createClient();
      // The parsed values are trimmed and lower-cased, so " Me@X.com " and
      // "me@x.com" are the same account.
      const { error } = await supabase.auth.signInWithPassword(parsed.data);

      if (error) {
        /* Deliberately shown against the form, not the email field: Supabase
         * returns the same failure for an unknown address and a wrong
         * password, and pinning it to one input would undo that. */
        setErrors({ form: describeAuthError(error) });
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
    } catch (thrown) {
      // A dropped connection throws rather than returning an error, and
      // without this the button would stay on "Signing in…" for good.
      setErrors({ form: describeThrown(thrown) });
      setPending(null);
    }
  }

  async function signInWithGoogle() {
    if (!googleEnabled) {
      setErrors({
        form: 'Google sign-in is not available yet. Use your email and password.',
      });
      return;
    }

    setPending('google');
    setErrors({});

    try {
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
        setErrors({ form: describeAuthError(error) });
        setPending(null);
      }
    } catch (thrown) {
      setErrors({ form: describeThrown(thrown) });
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

      <form onSubmit={signInWithPassword} noValidate className="flex flex-col gap-5">
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

        <TextField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          disabled={pending !== null}
          placeholder="you@example.com"
          error={errors.email}
        />

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          disabled={pending !== null}
          error={errors.password}
          labelAccessory={
            <Link
              href="/forgot-password"
              className="text-[14px] text-accent hover:text-accent-hover font-normal transition-colors"
            >
              Forgot?
            </Link>
          }
        />

        {errors.form && (
          <p role="alert" className="text-[14px] leading-[1.5] text-accent">
            {errors.form}
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
