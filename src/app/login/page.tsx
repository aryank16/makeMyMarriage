'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const supabase = createClient();
    const next = new URLSearchParams(window.location.search).get('next') ?? '/dashboard';
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setStatus('error');
      setMessage(error.message);
    } else {
      setStatus('sent');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">MakeMyMarriage</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Sign in to plan your wedding.
      </p>

      {status === 'sent' ? (
        <div className="mt-8 rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
          <p className="font-medium">Check your email</p>
          <p className="mt-1 text-neutral-500">
            We sent a sign-in link to {email}. It expires in an hour.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
          </button>
          {status === 'error' && (
            <p className="text-sm text-red-600">{message}</p>
          )}
        </form>
      )}
    </main>
  );
}
