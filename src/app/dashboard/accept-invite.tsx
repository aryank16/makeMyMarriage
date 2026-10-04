'use client';

import { useTransition } from 'react';
import { acceptInviteAction } from './actions';

export function AcceptInviteButton({ membershipId }: { membershipId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => void acceptInviteAction(membershipId))}
      className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
    >
      {pending ? 'Accepting…' : 'Accept'}
    </button>
  );
}
