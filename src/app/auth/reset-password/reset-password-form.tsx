'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { resetPasswordAction, type ResetPasswordState } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary btn-block">
      {pending ? 'Saving…' : 'Save password'}
    </button>
  );
}

export default function ResetPasswordForm({ email }: { email: string }) {
  const [state, formAction] = useActionState<ResetPasswordState, FormData>(
    resetPasswordAction,
    null,
  );

  return (
    <div className="w-full max-w-[400px] mx-auto my-auto py-10">
      <div className="mb-8">
        <h1 className="font-serif text-[40px] leading-[1.1] tracking-[-0.02em] text-ink mb-2.5">
          Choose a new password
        </h1>
        <p className="text-[17px] leading-[1.6] text-ink-muted">
          {email
            ? `Signing in as ${email}.`
            : 'Pick something you will remember.'}
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-5">
        <div>
          <label
            htmlFor="password"
            className="block text-[14px] font-medium text-ink mb-2"
          >
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="••••••••••••"
            className="input-field"
          />
        </div>

        <div>
          <label
            htmlFor="confirm"
            className="block text-[14px] font-medium text-ink mb-2"
          >
            Confirm password
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="••••••••••••"
            className="input-field"
          />
        </div>

        {state?.error && (
          <p role="alert" className="text-[14px] leading-[1.5] text-accent">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>
    </div>
  );
}
