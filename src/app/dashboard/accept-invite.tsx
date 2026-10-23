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
      className="shrink-0 h-[44px] px-6 rounded-[10px] bg-accent hover:bg-accent-hover text-surface text-[15px] font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Accepting…' : 'Accept'}
    </button>
  );
}
