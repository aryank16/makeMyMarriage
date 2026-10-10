'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { beginSignOut, endSignOut } from '@/lib/auth/signing-out';

const DEFAULT_CLASS =
  'text-[14px] text-ink-muted hover:text-ink underline underline-offset-4 disabled:opacity-60 transition-colors';

/**
 * Ends the session and leaves for /login.
 *
 * Done entirely in the browser client, which is the one that owns the
 * cookie. It calls Supabase's logout endpoint (revoking the session
 * server-side), drops its own in-memory copy — the cached singleton would
 * otherwise rewrite the cookie on its next refresh tick — and removes the
 * cookie itself.
 *
 * There is deliberately no server action in this path. Clearing the cookie
 * first means a follow-up request to the page you are leaving is no longer
 * authenticated, so the proxy answers it with /login?next=<that page>. That
 * redirect lands last and is what you are left looking at: the wedding id in
 * the address bar and "next" pointing back at a page the person just chose
 * to leave.
 */
export default function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    // Keeps AuthWatcher from reacting to the cookie we are about to remove
    // and racing the navigation below.
    beginSignOut();

    try {
      await createClient().auth.signOut({ scope: 'local' });
    } catch {
      // A dead connection must not trap someone in a signed-in UI. The
      // cookie is removed locally either way, so carry on to /login.
    }

    router.replace('/login');
    router.refresh();
    endSignOut();
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      disabled={pending}
      className={className ?? DEFAULT_CLASS}
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
