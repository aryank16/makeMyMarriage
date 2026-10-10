'use client';

import { useRef } from 'react';

/**
 * How long before the same address may trigger another transactional email.
 *
 * Supabase's built-in mailer allows only a couple of messages per hour for
 * the whole project, and that budget is easy to burn by accident: pressing
 * the button twice, or going back to the form to try again. Inside this
 * window the form shows its confirmation screen again without asking for
 * another email, so a repeat costs nothing. A genuine resend after the
 * window still works.
 */
export const RESEND_COOLDOWN_MS = 90_000;

const STORAGE_KEY = 'mm:auth:lastSent';

/* sessionStorage, not a ref alone: the case worth catching is someone
 * returning to the form and submitting again, and that remounts the
 * component, which would wipe a ref. Per-tab is the right scope — it should
 * not outlive the browsing session. */
function readStore(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, number>;
  } catch {
    // Private mode, blocked storage, or corrupt JSON. The in-memory fallback
    // still covers a double press on one mounted form.
    return {};
  }
}

function writeStore(value: Record<string, number>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Not being able to remember is not a reason to block the sign-up.
  }
}

export function useEmailCooldown() {
  const memory = useRef(new Map<string, number>());

  return {
    recentlySent(email: string) {
      const now = Date.now();
      const stored = readStore()[email];
      const inMemory = memory.current.get(email);
      const last = Math.max(stored ?? 0, inMemory ?? 0);
      return last > 0 && now - last < RESEND_COOLDOWN_MS;
    },

    markSent(email: string) {
      const now = Date.now();
      memory.current.set(email, now);

      // Drop expired entries while we are here, so the key cannot grow
      // without bound across a long session.
      const next: Record<string, number> = {};
      for (const [key, at] of Object.entries(readStore())) {
        if (now - at < RESEND_COOLDOWN_MS) next[key] = at;
      }
      next[email] = now;
      writeStore(next);
    },
  };
}
