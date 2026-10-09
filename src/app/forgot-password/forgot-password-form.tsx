'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Deliberately /auth/recovery and not the shared callback: that route
      // marks the session as a recovery session, which the reset form needs.
      redirectTo: `${window.location.origin}/auth/recovery`,
    });

    if (error) {
      setError(error.message);
      setStatus('idle');
      return;
    }

    // Always report success. Saying "no such account" here would let anyone
    // test which addresses are registered.
    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <div className="w-full max-w-[400px] mx-auto my-auto py-10">
        <h1 className="font-serif text-[40px] leading-[1.1] tracking-[-0.02em] text-ink mb-2.5">
          Check your email
        </h1>
        <p className="text-[17px] leading-[1.6] text-ink-muted">
          If an account exists for {email}, we have sent a link to choose a new
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

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
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
            disabled={status === 'sending'}
            placeholder="you@example.com"
            className="input-field"
          />
        </div>

        {error && (
          <p role="alert" className="text-[14px] leading-[1.5] text-accent">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'sending'}
          className="btn-primary btn-block"
        >
          {status === 'sending' ? 'Sending…' : 'Send reset link'}
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
