'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { resetRequestSchema, fieldErrors } from '@/lib/auth/credentials';
import { describeAuthError, describeThrown } from '@/lib/auth/supabase-errors';
import { useEmailCooldown } from '@/lib/auth/use-email-cooldown';
import TextField from '@/components/auth/text-field';

type Errors = { email?: string; form?: string };

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const cooldown = useEmailCooldown();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = resetRequestSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    /* Same guard as sign-up: a second press for the same address inside the
     * window re-shows the confirmation screen rather than spending another
     * email from the project's small hourly budget. */
    if (cooldown.recentlySent(parsed.data.email)) {
      setSentTo(parsed.data.email);
      return;
    }

    setPending(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(
        parsed.data.email,
        {
          // Deliberately /auth/recovery and not the shared callback: that route
          // marks the session as a recovery session, which the reset form needs.
          redirectTo: `${window.location.origin}/auth/recovery`,
        },
      );

      if (error) {
        /* Supabase does not reveal whether the address exists, so the only
         * errors reaching here are real failures — rate limits above all.
         * Those are worth showing; a silent "sent" would be a lie. */
        setErrors({ form: describeAuthError(error) });
        setPending(false);
        return;
      }

      // Otherwise always report success. Saying "no such account" would let
      // anyone test which addresses are registered.
      cooldown.markSent(parsed.data.email);
      setSentTo(parsed.data.email);
      setPending(false);
    } catch (thrown) {
      setErrors({ form: describeThrown(thrown) });
      setPending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="w-full max-w-[400px] mx-auto my-auto py-10">
        <h1 className="font-serif text-[40px] leading-[1.1] tracking-[-0.02em] text-ink mb-2.5">
          Check your email
        </h1>
        <p className="text-[17px] leading-[1.6] text-ink-muted">
          If an account exists for {sentTo}, we have sent a link to choose a new
          password. It expires in an hour.
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
          Reset your password
        </h1>
        <p className="text-[17px] leading-[1.6] text-ink-muted">
          We will email you a link to choose a new one.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <TextField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          disabled={pending}
          placeholder="you@example.com"
          error={errors.email}
        />

        {errors.form && (
          <p role="alert" className="text-[14px] leading-[1.5] text-accent">
            {errors.form}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="btn-primary btn-block"
        >
          {pending ? 'Sending…' : 'Send reset link'}
        </button>

        <div className="text-center text-[15px] text-ink-muted pt-1">
          <Link
            href="/login"
            className="text-accent hover:text-accent-hover font-medium transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
