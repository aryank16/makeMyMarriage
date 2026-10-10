'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isSigningOut } from '@/lib/auth/signing-out';

/** Cheap enough to run on a timer: one string read, no parsing, no network. */
function hasAuthCookie() {
  return document.cookie.includes('-auth-token');
}

/* Covers a tab that is visible but not focused — two windows side by side,
 * where neither `focus` nor `visibilitychange` ever fires. */
const POLL_MS = 5000;

/**
 * Keeps an open tab honest about whether it is still signed in.
 *
 * Signing out in one tab deletes a cookie that every tab shares, but nothing
 * tells the others: their server components were rendered for a signed-in
 * user and keep showing that until something forces a re-render. The result
 * is a dashboard full of someone's data after they thought they had logged
 * out — which is the one moment they are most likely to walk away from the
 * screen.
 *
 * onAuthStateChange only reports what this tab's own client did, so the
 * cross-tab case is caught by watching the cookie instead. router.refresh()
 * re-runs the server components, and middleware redirects from there.
 */
export default function AuthWatcher() {
  const router = useRouter();
  const wasSignedIn = useRef<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    wasSignedIn.current = hasAuthCookie();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // A sign-out this tab started is already navigating to /login.
      // Refreshing the route being left would race it and win, leaving the
      // person on /login?next=<the page they just signed out of>.
      if (isSigningOut()) return;
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        wasSignedIn.current = hasAuthCookie();
        router.refresh();
      }
    });

    function recheck() {
      if (isSigningOut()) return;
      if (document.visibilityState === 'hidden') return;
      const signedIn = hasAuthCookie();
      if (signedIn === wasSignedIn.current) return;
      wasSignedIn.current = signedIn;
      router.refresh();
    }

    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    const timer = window.setInterval(recheck, POLL_MS);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
      window.clearInterval(timer);
    };
  }, [router]);

  return null;
}
