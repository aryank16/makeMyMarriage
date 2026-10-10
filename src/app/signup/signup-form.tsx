'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_HINT,
  signUpSchema,
  fieldErrors,
} from '@/lib/auth/credentials';
import { describeAuthError, describeThrown } from '@/lib/auth/supabase-errors';
import { useEmailCooldown } from '@/lib/auth/use-email-cooldown';
import GoogleMark from '@/components/auth/google-mark';
import TextField from '@/components/auth/text-field';
import PasswordField from '@/components/auth/password-field';

type Errors = {
  name?: string;
  email?: string;
  password?: string;
  form?: string;
};

/* Where a newly confirmed account lands. New users have no wedding yet, so
 * onboarding rather than the dashboard. This is also the first request that
 * calls getCurrentUser(), which is what creates their row in our own User
 * table — Supabase owns the credentials, Prisma owns everything else. */
const AFTER_CONFIRM = '/onboarding';

export default function SignupForm({
  googleEnabled,
}: {
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<null | 'email' | 'google'>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const cooldown = useEmailCooldown();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = signUpSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    /* Already asked for a link for this address a moment ago? Show the same
     * confirmation screen instead of spending another email. The person sees
     * exactly what they would have seen; only the request is skipped. */
    if (cooldown.recentlySent(parsed.data.email)) {
      setSentTo(parsed.data.email);
      return;
    }

    setPending('email');

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          // Read back by getCurrentUser() when it creates the User row, so the
          // account has a real name instead of the email prefix.
          data: { name: parsed.data.name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(AFTER_CONFIRM)}`,
        },
      });

      if (error) {
        /* "Already registered" is routed to the field, because here it is
         * actionable and Supabase has already decided to disclose it. The
         * rest stay against the form. */
        const copy = describeAuthError(error);
        setErrors(
          error.code === 'email_exists' ||
            error.code === 'email_address_invalid'
            ? { email: copy }
            : { form: copy },
        );
        setPending(null);
        return;
      }

      /* Supabase does not treat an existing address as an error. It returns a
       * success-shaped response carrying an obfuscated user with no
       * identities, and sends nothing — identical in shape to a real sign-up,
       * so that this form cannot be used to discover who has an account.
       *
       * We deliberately give that property up. Showing "check your email"
       * leaves someone who already has an account waiting for a message that
       * is never coming, and a sign-in link sits on this same page anyway.
       * The cost is that sign-up now confirms whether an address is
       * registered.
       *
       * An existing but *unconfirmed* address still comes back with its
       * identity, because Supabase genuinely does resend the confirmation for
       * it — so that case correctly falls through to the sent screen. */
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        setErrors({
          email:
            'An account already exists with this email. Sign in instead, or reset your password.',
        });
        setPending(null);
        return;
      }

      /* With "Confirm email" switched off in Supabase, sign-up returns a live
       * session and the person is already authenticated. Showing them the
       * check-your-email screen would strand them on a dead end, signed in,
       * waiting for a message that was never sent. */
      if (data.session) {
        router.push(AFTER_CONFIRM);
        router.refresh();
        return;
      }

      // Only start the cooldown when an email was genuinely sent.
      cooldown.markSent(parsed.data.email);
      setSentTo(parsed.data.email);
      setPending(null);
    } catch (thrown) {
      setErrors({ form: describeThrown(thrown) });
      setPending(null);
    }
  }

  async function signUpWithGoogle() {
    if (!googleEnabled) {
      setErrors({
        form: 'Google sign-up is not available yet. Use your email instead.',
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
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(AFTER_CONFIRM)}`,
        },
      });

      if (error) {
        setErrors({ form: describeAuthError(error) });
        setPending(null);
      }
    } catch (thrown) {
      setErrors({ form: describeThrown(thrown) });
      setPending(null);
    }
  }

  if (sentTo) {
    return (
      <div className="w-full max-w-[400px] mx-auto my-auto py-10">
        <h1 className="font-serif text-[40px] leading-[1.1] tracking-[-0.02em] text-ink mb-2.5">
          Check your email
        </h1>
        {/* Safe to state plainly now: an address that already has an account
          * never reaches this screen, so a link really was sent. */}
        <p className="text-[17px] leading-[1.6] text-ink-muted">
          We sent a confirmation link to {sentTo}. Open it and we&rsquo;ll pick
          up where you left off.
        </p>
        <div className="mt-8 text-[15px] text-ink-muted">
          <Link
            href="/login"
            className="text-accent hover:text-accent-hover font-medium transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] mx-auto my-auto py-10">
      <div className="mb-8">
        <h1 className="font-serif text-[40px] leading-[1.1] tracking-[-0.02em] text-ink mb-2.5">
          Create your account
        </h1>
        <p className="text-[17px] leading-[1.6] text-ink-muted">
          You&rsquo;ll set up your wedding next.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <button
          type="button"
          onClick={signUpWithGoogle}
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
          id="name"
          label="Your name"
          value={name}
          onChange={setName}
          autoComplete="name"
          disabled={pending !== null}
          placeholder="Priya Sharma"
          error={errors.name}
        />

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
          autoComplete="new-password"
          disabled={pending !== null}
          minLength={MIN_PASSWORD_LENGTH}
          hint={PASSWORD_HINT}
          error={errors.password}
        />

        {errors.form && (
          <p role="alert" className="text-[14px] leading-[1.5] text-accent">
            {errors.form}
          </p>
        )}

        <button
          type="submit"
          disabled={pending !== null}
          className="btn-primary btn-block"
        >
          {pending === 'email' ? 'Creating account…' : 'Create account'}
        </button>

        <div className="text-center text-[15px] text-ink-muted pt-1">
          Already have an account?
          <Link
            href="/login"
            className="text-accent hover:text-accent-hover font-medium transition-colors ml-1"
          >
            Sign in
          </Link>
        </div>

        <p className="text-center text-[13px] leading-[1.6] text-ink-muted">
          By creating an account you agree to our{' '}
          <Link
            href="/terms"
            className="text-accent hover:text-accent-hover transition-colors"
          >
            Terms
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            className="text-accent hover:text-accent-hover transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </div>
  );
}
