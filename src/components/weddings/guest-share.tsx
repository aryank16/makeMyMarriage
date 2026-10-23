'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The two ways an organizer actually gets a link to a guest.
 *
 * WhatsApp first, because that is how an Indian guest list is reached — the
 * wa.me link opens a chat with the message already written, so sixty guests
 * is sixty taps rather than sixty compositions. "Copy link" is the fallback
 * for everyone else, and for a guest whose number we do not have.
 *
 * A client component only because the clipboard is: everything it needs is
 * computed on the server and passed in.
 */
export default function GuestShare({
  link,
  message,
  whatsappUrl,
}: {
  link: string;
  message: string;
  whatsappUrl: string | null;
}) {
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The confirmation is on a timer, so it must not fire into an unmounted
  // row — the table re-renders on every invite.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy(what: 'link' | 'message', text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 2000);
    } catch {
      /* Clipboard access can be refused — an insecure origin, or a browser
       * that wants a user gesture it did not see. Selecting the text is then
       * the only honest fallback, so the link is offered as a prompt rather
       * than failing silently. */
      window.prompt('Copy this link', text);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] text-accent underline decoration-line underline-offset-2 hover:decoration-accent"
        >
          WhatsApp
        </a>
      )}
      <button
        type="button"
        onClick={() => copy('message', message)}
        className="text-[13px] text-ink-muted underline decoration-line underline-offset-2 hover:text-ink"
      >
        {copied === 'message' ? 'Copied' : 'Copy message'}
      </button>
      <button
        type="button"
        onClick={() => copy('link', link)}
        className="text-[13px] text-ink-muted underline decoration-line underline-offset-2 hover:text-ink"
      >
        {copied === 'link' ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}
